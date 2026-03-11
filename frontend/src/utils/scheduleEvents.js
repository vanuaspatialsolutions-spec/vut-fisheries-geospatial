import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';

function toDate(val) {
  if (!val) return new Date();
  if (val.toDate) return val.toDate();
  return new Date(val);
}

export async function createScheduleEvent(userId, eventData) {
  const ref = await addDoc(collection(db, 'scheduleEvents'), {
    ...eventData,
    userId,
    startTime: eventData.startTime,
    endTime: eventData.endTime,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateScheduleEvent(eventId, eventData) {
  await updateDoc(doc(db, 'scheduleEvents', eventId), {
    ...eventData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteScheduleEvent(eventId) {
  await deleteDoc(doc(db, 'scheduleEvents', eventId));
}

// Subscribe to all org-wide schedule events (read by everyone, filtered client-side for edits).
export function subscribeToScheduleEvents(callback) {
  const q = query(collection(db, 'scheduleEvents'), orderBy('startTime', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            startTime: toDate(data.startTime),
            endTime: toDate(data.endTime),
          };
        }),
      );
    },
    (err) => {
      console.error('scheduleEvents subscription error:', err);
      callback([]);
    },
  );
}
