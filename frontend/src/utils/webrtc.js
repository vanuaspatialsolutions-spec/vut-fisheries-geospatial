import {
  collection, doc, setDoc, updateDoc, addDoc,
  onSnapshot, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── ICE configuration ─────────────────────────────────────────────────────────
// STUN works for most networks. For production behind strict firewalls,
// add TURN server credentials here.
export const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN relay — required when peers are behind symmetric NAT (mobile/cellular)
    { urls: 'turn:openrelay.metered.ca:80',          username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',         username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

// One active call per thread (deterministic doc ID).
export function getCallId(threadId) {
  return `call_${threadId}`;
}

// ── Call signaling ────────────────────────────────────────────────────────────

export async function initiateCall(callId, callerId, callerName, calleeId, calleeName, isVideo) {
  await setDoc(doc(db, 'calls', callId), {
    callerId,
    callerName,
    calleeId,
    calleeName,
    type: isVideo ? 'video' : 'audio',
    status: 'ringing',
    offer: null,
    answer: null,
    createdAt: serverTimestamp(),
  });
}

export async function storeOffer(callId, offer) {
  await updateDoc(doc(db, 'calls', callId), {
    offer: { type: offer.type, sdp: offer.sdp },
  });
}

export async function storeAnswer(callId, answer) {
  await updateDoc(doc(db, 'calls', callId), {
    answer: { type: answer.type, sdp: answer.sdp },
    status: 'active',
  });
}

export async function addIceCandidate(callId, role, candidate) {
  // role: 'caller' | 'callee'
  await addDoc(collection(db, 'calls', callId, `${role}Candidates`), candidate.toJSON());
}

export async function terminateCall(callId) {
  await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export function subscribeToCall(callId, callback) {
  return onSnapshot(doc(db, 'calls', callId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function subscribeToIceCandidates(callId, role, callback) {
  return onSnapshot(
    collection(db, 'calls', callId, `${role}Candidates`),
    snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          callback(new RTCIceCandidate(change.doc.data()));
        }
      });
    },
  );
}

// Filters client-side to avoid requiring a composite Firestore index.
export function subscribeToIncomingCalls(uid, callback) {
  const q = query(collection(db, 'calls'), where('calleeId', '==', uid));
  return onSnapshot(q, snap => {
    const ringing = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.status === 'ringing');
    callback(ringing.length > 0 ? ringing[0] : null);
  }, err => console.error('subscribeToIncomingCalls:', err.message));
}
