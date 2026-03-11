import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, getDoc,
} from 'firebase/firestore';
import {
  createScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
} from './scheduleEvents';

export const BUDGET_CATEGORIES = [
  'Accommodation',
  'Airfare',
  'Transport by Land',
  'Transport by Sea',
  'Communication',
  'Fuel',
  'Venue Hire',
  'Truck Hire',
  'Equipment Hire',
  'DSA',
  'Other',
];

function calcTotal(items) {
  return (items || []).reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.unitCost) || 0;
    const dur = parseFloat(item.duration) || 1;
    return sum + qty * cost * dur;
  }, 0);
}

function buildEventPayload(tripData) {
  const startTime =
    tripData.dateOfTravel instanceof Date
      ? tripData.dateOfTravel
      : new Date(tripData.dateOfTravel);
  const endTime = new Date(startTime);
  endTime.setDate(endTime.getDate() + Math.max(1, parseInt(tripData.duration) || 1));
  const totalBudget = calcTotal(tripData.budgetItems);

  const descParts = [];
  if (tripData.destination) descParts.push(`Destination: ${tripData.destination}`);
  if (tripData.teamMembers?.length)
    descParts.push(`Team (${tripData.teamMembers.length}): ${tripData.teamMembers.map((m) => m.name).filter(Boolean).join(', ')}`);
  if (totalBudget) descParts.push(`Total budget: VUV ${totalBudget.toLocaleString()}`);
  if (tripData.purpose) descParts.push(tripData.purpose);

  return {
    title: tripData.title || 'Field Trip',
    description: descParts.join('. '),
    startTime,
    endTime,
    color: 'blue',
    category: 'Trip',
    tags: ['Travel', 'Field'],
  };
}

export async function createTrip(userId, tripData, createdByName) {
  const event = buildEventPayload(tripData);
  const totalBudget = calcTotal(tripData.budgetItems);

  // Create the calendar event first — but don't let a calendar failure
  // block the trip from being saved.
  let eventId = null;
  try {
    eventId = await createScheduleEvent(userId, { ...event, createdByName: createdByName || '' });
  } catch (err) {
    console.warn('createTrip: could not create schedule event:', err.message);
  }

  const ref = await addDoc(collection(db, 'trips'), {
    ...tripData,
    userId,
    createdByName: createdByName || '',
    scheduleEventId: eventId,
    totalBudget,
    dateOfTravel: event.startTime,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTrip(tripId, userId, tripData) {
  const tripSnap = await getDoc(doc(db, 'trips', tripId));
  const existing = tripSnap.data() || {};
  const event = buildEventPayload(tripData);
  const totalBudget = calcTotal(tripData.budgetItems);

  if (existing.scheduleEventId) {
    await updateScheduleEvent(existing.scheduleEventId, event);
  } else {
    const eventId = await createScheduleEvent(userId, event);
    tripData.scheduleEventId = eventId;
  }

  await updateDoc(doc(db, 'trips', tripId), {
    ...tripData,
    totalBudget,
    dateOfTravel: event.startTime,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTrip(tripId) {
  const tripSnap = await getDoc(doc(db, 'trips', tripId));
  const existing = tripSnap.data() || {};
  if (existing.scheduleEventId) {
    await deleteScheduleEvent(existing.scheduleEventId).catch(() => {});
  }
  await deleteDoc(doc(db, 'trips', tripId));
}

export function subscribeToTrips(_userId, callback) {
  // All authenticated users can see all trips (org-wide sharing).
  const q = query(
    collection(db, 'trips'),
    orderBy('dateOfTravel', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            dateOfTravel: data.dateOfTravel?.toDate
              ? data.dateOfTravel.toDate()
              : data.dateOfTravel
              ? new Date(data.dateOfTravel)
              : null,
          };
        }),
      );
    },
    (err) => {
      console.error('Trips subscription error:', err);
      callback([]);
    },
  );
}
