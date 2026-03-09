import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment, limit, writeBatch,
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
  const q = query(
    collection(db, 'threads'),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
  );
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export function subscribeToMessages(threadId, callback) {
  const q = query(
    collection(db, 'threads', threadId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function markThreadRead(threadId, uid) {
  await updateDoc(doc(db, 'threads', threadId), { [`unread.${uid}`]: 0 });
}

export function subscribeToNotifications(uid, callback) {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(30),
  );
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
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
