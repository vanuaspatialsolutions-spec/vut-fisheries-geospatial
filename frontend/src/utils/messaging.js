import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment, limit, writeBatch,
  getDocs, arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

// ── Thread ID helpers ─────────────────────────────────────────────────────────

// Deterministic ID for 1-to-1 DMs only.
export function makeThreadId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

// ── Create / get threads ──────────────────────────────────────────────────────

export async function getOrCreateThread(uid1, name1, uid2, name2) {
  const tid = makeThreadId(uid1, uid2);
  const ref = doc(db, 'threads', tid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      isGroup: false,
      participants: [uid1, uid2],
      participantNames: { [uid1]: name1, [uid2]: name2 },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageBy: null,
      unread: { [uid1]: 0, [uid2]: 0 },
      deletedFor: [],
      createdAt: serverTimestamp(),
    });
  } else {
    // If it was previously deleted by the current user, restore it.
    const data = snap.data();
    if ((data.deletedFor || []).includes(uid1)) {
      await updateDoc(ref, { deletedFor: data.deletedFor.filter(u => u !== uid1) });
    }
  }
  return tid;
}

export async function createGroupThread(creatorUid, creatorName, members, groupName) {
  // members: [{ uid, name }, ...]  — does NOT include the creator
  const allUids = [creatorUid, ...members.map(m => m.uid)];
  const participantNames = { [creatorUid]: creatorName };
  members.forEach(m => { participantNames[m.uid] = m.name; });
  const unread = {};
  allUids.forEach(u => { unread[u] = 0; });

  const threadRef = await addDoc(collection(db, 'threads'), {
    isGroup: true,
    name: groupName,
    participants: allUids,
    participantNames,
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    lastMessageBy: null,
    unread,
    deletedFor: [],
    createdAt: serverTimestamp(),
  });
  return threadRef.id;
}

// ── Send message ──────────────────────────────────────────────────────────────

export async function sendMessage(
  threadId, senderId, senderName, text,
  attachment = null, senderPosition = null, senderPhotoURL = null,
) {
  const threadRef = doc(db, 'threads', threadId);
  const threadSnap = await getDoc(threadRef);
  if (!threadSnap.exists()) throw new Error('Thread not found');

  const threadData = threadSnap.data();
  const others = threadData.participants.filter(p => p !== senderId);

  await addDoc(collection(db, 'threads', threadId, 'messages'), {
    senderId,
    senderName,
    senderPosition: senderPosition || null,
    senderPhotoURL: senderPhotoURL || null,
    text: text || '',
    attachment: attachment || null,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });

  // Build unread increments for all other participants.
  const unreadUpdates = {};
  others.forEach(uid => { unreadUpdates[`unread.${uid}`] = increment(1); });

  await updateDoc(threadRef, {
    lastMessage: attachment ? `📎 ${attachment.name}` : (text || ''),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    // Restore thread for anyone who had deleted it — new message revives it.
    deletedFor: [],
    ...unreadUpdates,
  });

  // Send in-app notification to all other participants.
  const notifText = attachment
    ? `Shared a file: ${attachment.name}`
    : (text.length > 80 ? text.slice(0, 80) + '…' : text);
  const notifType = attachment ? 'file_share' : 'message';
  const fromLabel = threadData.isGroup ? `${senderName} in ${threadData.name}` : senderName;

  for (const otherUid of others) {
    await addDoc(collection(db, 'notifications', otherUid, 'items'), {
      type: notifType,
      fromUid: senderId,
      fromName: fromLabel,
      threadId,
      text: notifText,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

// ── Upload attachment to Storage ──────────────────────────────────────────────

export function uploadAttachment(threadId, file, onProgress) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `messages/${threadId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      snap => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const downloadURL = await getDownloadURL(task.snapshot.ref);
        resolve({
          name: file.name,
          contentType: file.type,
          size: file.size,
          storagePath: path,
          downloadURL,
        });
      },
    );
  });
}

// ── Delete (soft) ─────────────────────────────────────────────────────────────

export async function deleteMessage(threadId, messageId, senderId) {
  const msgRef = doc(db, 'threads', threadId, 'messages', messageId);
  await updateDoc(msgRef, { deleted: true, text: '', attachment: null });

  // Refresh thread preview if this was the last message.
  const threadRef = doc(db, 'threads', threadId);
  const threadSnap = await getDoc(threadRef);
  if (threadSnap.exists() && threadSnap.data().lastMessageBy === senderId) {
    const msgsSnap = await getDocs(
      query(collection(db, 'threads', threadId, 'messages'), orderBy('createdAt', 'desc'), limit(5))
    );
    const latest = msgsSnap.docs.find(d => !d.data().deleted);
    await updateDoc(threadRef, {
      lastMessage: latest
        ? (latest.data().attachment ? `📎 ${latest.data().attachment.name}` : latest.data().text)
        : '',
    });
  }
}

// Soft-delete a whole thread for the current user (adds uid to deletedFor).
export async function deleteThread(threadId, uid) {
  await updateDoc(doc(db, 'threads', threadId), {
    deletedFor: arrayUnion(uid),
  });
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export function subscribeToThreads(uid, callback) {
  const q = query(
    collection(db, 'threads'),
    where('participants', 'array-contains', uid),
  );
  return onSnapshot(q, snap => {
    const threads = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => !(t.deletedFor || []).includes(uid));
    threads.sort((a, b) => {
      const at = a.lastMessageAt?.toMillis?.() ?? 0;
      const bt = b.lastMessageAt?.toMillis?.() ?? 0;
      return bt - at;
    });
    callback(threads);
  }, err => console.error('subscribeToThreads:', err.code, err.message));
}

export function subscribeToMessages(threadId, callback) {
  const q = query(
    collection(db, 'threads', threadId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('subscribeToMessages:', err.code, err.message),
  );
}

// ── Thread read / notifications ───────────────────────────────────────────────

export async function markThreadRead(threadId, uid) {
  await updateDoc(doc(db, 'threads', threadId), { [`unread.${uid}`]: 0 });
}

export function subscribeToNotifications(uid, callback) {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    where('read', '==', false),
    limit(50),
  );
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => {
      const at = a.createdAt?.toMillis?.() ?? 0;
      const bt = b.createdAt?.toMillis?.() ?? 0;
      return bt - at;
    });
    callback(items.slice(0, 30));
  }, err => console.error('subscribeToNotifications:', err.code, err.message));
}

export async function markNotificationRead(uid, notifId) {
  await updateDoc(doc(db, 'notifications', uid, 'items', notifId), { read: true });
}

export async function markAllNotificationsRead(uid, notifIds) {
  if (!notifIds.length) return;
  const batch = writeBatch(db);
  notifIds.forEach(id => {
    batch.update(doc(db, 'notifications', uid, 'items', id), { read: true });
  });
  await batch.commit();
}

// ── Meetings ──────────────────────────────────────────────────────────────────

export async function scheduleMeeting(threadId, senderId, senderName, { title, scheduledAt, description }) {
  const threadRef = doc(db, 'threads', threadId);
  const threadSnap = await getDoc(threadRef);
  if (!threadSnap.exists()) throw new Error('Thread not found');
  const participants = threadSnap.data().participants;

  // Create meeting document
  const meetingRef = await addDoc(collection(db, 'meetings'), {
    threadId,
    title,
    scheduledAt,
    description: description || '',
    createdBy: senderId,
    createdByName: senderName,
    participants,
    status: 'scheduled',
    createdAt: serverTimestamp(),
  });

  // Send a system message containing the meeting card data
  await addDoc(collection(db, 'threads', threadId, 'messages'), {
    senderId,
    senderName,
    type: 'meeting',
    meetingId: meetingRef.id,
    text: `📅 Meeting scheduled: ${title}`,
    meetingData: {
      title,
      scheduledAt,
      description: description || '',
      meetingId: meetingRef.id,
      createdByName: senderName,
    },
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });

  // Update thread preview
  const others = participants.filter(u => u !== senderId);
  const unreadUpdates = {};
  others.forEach(uid => { unreadUpdates[`unread.${uid}`] = increment(1); });

  await updateDoc(threadRef, {
    lastMessage: `📅 ${title}`,
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    deletedFor: [],
    ...unreadUpdates,
  });

  return meetingRef.id;
}
