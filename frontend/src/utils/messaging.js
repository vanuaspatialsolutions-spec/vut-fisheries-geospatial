import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment, limit, writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

// Deterministic thread ID — same two users always get the same thread.
export function makeThreadId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export async function getOrCreateThread(uid1, name1, uid2, name2) {
  const tid = makeThreadId(uid1, uid2);
  const ref = doc(db, 'threads', tid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [uid1, uid2],
      participantNames: { [uid1]: name1, [uid2]: name2 },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageBy: null,
      unread: { [uid1]: 0, [uid2]: 0 },
      createdAt: serverTimestamp(),
    });
  }
  return tid;
}

export async function sendMessage(threadId, senderId, senderName, text, attachment = null) {
  const threadRef = doc(db, 'threads', threadId);
  const threadSnap = await getDoc(threadRef);
  if (!threadSnap.exists()) throw new Error('Thread not found');

  const threadData = threadSnap.data();
  const otherUid = threadData.participants.find(p => p !== senderId);

  await addDoc(collection(db, 'threads', threadId, 'messages'), {
    senderId,
    senderName,
    text: text || '',
    attachment: attachment || null,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });

  await updateDoc(threadRef, {
    lastMessage: attachment ? `\uD83D\uDCCE ${attachment.name}` : (text || ''),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    [`unread.${otherUid}`]: increment(1),
  });

  if (otherUid) {
    await addDoc(collection(db, 'notifications', otherUid, 'items'), {
      type: attachment ? 'file_share' : 'message',
      fromUid: senderId,
      fromName: senderName,
      threadId,
      text: attachment ? `Shared a file: ${attachment.name}` : (text.length > 80 ? text.slice(0, 80) + '…' : text),
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

export function subscribeToThreads(uid, callback) {
  // No orderBy — combining array-contains with orderBy on a different field
  // requires a composite index that may not exist. Sort client-side instead.
  const q = query(
    collection(db, 'threads'),
    where('participants', 'array-contains', uid),
  );
  return onSnapshot(q, snap => {
    const threads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

// Soft-delete: replace message content with a deleted marker.
// After deletion we also refresh the thread's lastMessage preview if needed.
export async function deleteMessage(threadId, messageId, senderId) {
  const msgRef = doc(db, 'threads', threadId, 'messages', messageId);
  await updateDoc(msgRef, {
    deleted: true,
    text: '',
    attachment: null,
  });

  // If this was the last message, update the thread preview.
  const threadRef = doc(db, 'threads', threadId);
  const threadSnap = await getDoc(threadRef);
  if (threadSnap.exists() && threadSnap.data().lastMessageBy === senderId) {
    // Find the new latest non-deleted message.
    const msgsSnap = await getDocs(
      query(collection(db, 'threads', threadId, 'messages'), orderBy('createdAt', 'desc'), limit(5))
    );
    const latest = msgsSnap.docs.find(d => !d.data().deleted);
    await updateDoc(threadRef, {
      lastMessage: latest ? (latest.data().attachment ? '📎 ' + latest.data().attachment.name : latest.data().text) : '',
    });
  }
}

export async function markThreadRead(threadId, uid) {
  await updateDoc(doc(db, 'threads', threadId), { [`unread.${uid}`]: 0 });
}

export function subscribeToNotifications(uid, callback) {
  // No orderBy — where('read') + orderBy('createdAt') needs a composite index.
  // Filter and sort client-side instead.
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
