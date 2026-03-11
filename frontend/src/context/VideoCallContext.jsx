import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import {
  ICE_CONFIG, getCallId, initiateCall, storeOffer, storeAnswer,
  addIceCandidate, terminateCall,
  subscribeToCall, subscribeToIceCandidates, subscribeToIncomingCalls,
} from '../utils/webrtc';
import VideoCallModal from '../components/VideoCall/VideoCallModal';
import IncomingCallBanner from '../components/VideoCall/IncomingCallBanner';
import MediaPermissionModal from '../components/VideoCall/MediaPermissionModal';

const VideoCallContext = createContext(null);

export function VideoCallProvider({ children }) {
  const { user } = useAuth();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [callStatus, setCallStatus] = useState('idle'); // idle|calling|ringing|active
  const [activeCallData, setActiveCallData] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [permDenied, setPermDenied] = useState(null); // null | { retryFn, callerName? }

  // ── Refs (mutable, not causing re-renders) ────────────────────────────────
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const pendingCandidatesRef = useRef([]);
  const callUnsubRef = useRef(null);
  const candidateUnsubsRef = useRef([]);
  const isScreenSharingRef = useRef(false);
  const callStatusRef = useRef('idle');
  const activeCallIdRef = useRef(null);
  const ringTimeoutRef = useRef(null);

  // Keep ref in sync with state so callbacks see current value.
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

  const uid = user?.uid;

  // ── Global incoming-call listener ─────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToIncomingCalls(uid, (call) => {
      if (call && callStatusRef.current === 'idle') {
        setIncomingCall(call);
      } else if (!call) {
        setIncomingCall(null);
      }
    });
    return unsub;
  }, [uid]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (recorderRef.current) {
      try { recorderRef.current.stop(); } catch (_) {}
      recorderRef.current = null;
    }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    if (callUnsubRef.current) { callUnsubRef.current(); callUnsubRef.current = null; }
    candidateUnsubsRef.current.forEach(u => u());
    candidateUnsubsRef.current = [];
    pendingCandidatesRef.current = [];
    isScreenSharingRef.current = false;
    activeCallIdRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setIsRecording(false);
    setCallStatus('idle');
    setActiveCallData(null);
    setIncomingCall(null);
  }, []);

  // ── Build RTCPeerConnection + wire ICE / tracks ───────────────────────────
  const setupPC = useCallback((callId, isCaller) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t =>
        pc.addTrack(t, localStreamRef.current),
      );
    }

    // Collect remote tracks into a MediaStream
    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = e => e.streams[0].getTracks().forEach(t => remote.addTrack(t));

    // Send our ICE candidates to Firestore
    pc.onicecandidate = async e => {
      if (e.candidate) {
        await addIceCandidate(callId, isCaller ? 'caller' : 'callee', e.candidate)
          .catch(() => {});
      }
    };

    // Handle disconnects — only 'failed' is unrecoverable; 'disconnected' is transient during ICE
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        terminateCall(activeCallIdRef.current).catch(() => {});
        cleanup();
      }
    };

    // Listen for the other side's ICE candidates
    const otherRole = isCaller ? 'callee' : 'caller';
    const unsub = subscribeToIceCandidates(callId, otherRole, async candidate => {
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(candidate).catch(() => {});
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });
    candidateUnsubsRef.current.push(unsub);

    return pc;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start a call (caller side) ────────────────────────────────────────────
  const startCall = useCallback(async (threadId, calleeId, calleeName, isVideo = true) => {
    if (!uid || callStatusRef.current !== 'idle') return;
    const callId = getCallId(threadId);
    const callerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

    activeCallIdRef.current = callId;
    setCallStatus('calling');
    setActiveCallData({ callId, threadId, calleeId, calleeName, isVideo, isCaller: true });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      await initiateCall(callId, uid, callerName, calleeId, calleeName, isVideo);

      const pc = setupPC(callId, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await storeOffer(callId, offer);

      // Watch for callee's answer
      callUnsubRef.current = subscribeToCall(callId, async callData => {
        if (!callData || callData.status === 'ended') { cleanup(); return; }
        if (
          callData.answer &&
          pcRef.current?.signalingState === 'have-local-offer'
        ) {
          if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(callData.answer),
          );
          for (const c of pendingCandidatesRef.current) {
            await pcRef.current.addIceCandidate(c).catch(() => {});
          }
          pendingCandidatesRef.current = [];
          setCallStatus('active');
        }
      });

      // Auto-cancel if callee doesn't answer within 30 seconds
      ringTimeoutRef.current = setTimeout(async () => {
        if (callStatusRef.current === 'calling') {
          toast('No answer', { description: `${calleeName} didn't pick up` });
          await terminateCall(callId).catch(() => {});
          cleanup();
        }
      }, 30_000);
    } catch (err) {
      console.error('startCall error:', err);
      if (err.name === 'NotAllowedError') {
        // getUserMedia failed before initiateCall — no Firestore doc to clean up
        cleanup();
        setPermDenied({ retryFn: () => startCall(threadId, calleeId, calleeName, isVideo) });
      } else {
        const msg = err.name === 'NotFoundError'
          ? 'No camera or microphone found on this device'
          : `Call failed: ${err.message}`;
        toast.error(msg);
        await terminateCall(callId).catch(() => {});
        cleanup();
      }
    }
  }, [uid, user, setupPC, cleanup]);

  // ── Answer an incoming call (callee side) ─────────────────────────────────
  const answerCall = useCallback(async (call) => {
    if (!uid || !call) return;
    const { id: callId, callerId, callerName, type, calleeId } = call;
    // Confirm this call is for us
    if (calleeId !== uid) return;
    const isVideo = type === 'video';

    // Hide the banner immediately so the user doesn't double-tap
    setIncomingCall(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Only show the modal after media is confirmed — prevents flash-then-close
      activeCallIdRef.current = callId;
      setCallStatus('active');
      setActiveCallData({ callId, calleeId: callerId, calleeName: callerName, isVideo, isCaller: false });

      const pc = setupPC(callId, false);
      let answered = false;

      callUnsubRef.current = subscribeToCall(callId, async callData => {
        if (!callData || callData.status === 'ended') { cleanup(); return; }
        if (callData.offer && !answered && pcRef.current?.signalingState === 'stable') {
          answered = true;
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(callData.offer),
          );
          for (const c of pendingCandidatesRef.current) {
            await pcRef.current.addIceCandidate(c).catch(() => {});
          }
          pendingCandidatesRef.current = [];

          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          await storeAnswer(callId, answer);
        }
      });
    } catch (err) {
      console.error('answerCall error:', err);
      if (err.name === 'NotAllowedError') {
        await terminateCall(callId).catch(() => {});
        cleanup();
        setPermDenied({ retryFn: null, callerName });
      } else {
        const msg = err.name === 'NotFoundError'
          ? 'No camera or microphone found on this device'
          : `Could not answer call: ${err.message}`;
        toast.error(msg);
        await terminateCall(callId).catch(() => {});
        cleanup();
      }
    }
  }, [uid, setupPC, cleanup]);

  // ── Reject / hang up ──────────────────────────────────────────────────────
  const rejectCall = useCallback(async (call) => {
    if (call?.id) await terminateCall(call.id).catch(() => {});
    setIncomingCall(null);
  }, []);

  const hangUp = useCallback(async () => {
    const callId = activeCallData?.callId;
    if (callId) await terminateCall(callId).catch(() => {});
    cleanup();
  }, [activeCallData, cleanup]);

  // ── In-call controls ──────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const audio = localStreamRef.current?.getAudioTracks()[0];
    if (!audio) return;
    audio.enabled = !audio.enabled;
    setIsMuted(!audio.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const video = localStreamRef.current?.getVideoTracks()[0];
    if (!video) return;
    video.enabled = !video.enabled;
    setIsCameraOff(!video.enabled);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current) return;

    if (isScreenSharingRef.current) {
      // Restore camera track
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(camTrack);
      }
      isScreenSharingRef.current = false;
      setIsScreenSharing(false);
    } else {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        toast.error('Screen sharing is not supported in this browser');
        return;
      }
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (!sender) {
        toast.error('No video track to replace for screen sharing');
        return;
      }
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true, audio: false,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        await sender.replaceTrack(screenTrack);

        // Auto-stop when user clicks browser's "Stop sharing"
        screenTrack.onended = () => {
          if (isScreenSharingRef.current) toggleScreenShare();
        };

        isScreenSharingRef.current = true;
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen share:', err);
        if (err.name === 'NotAllowedError') {
          toast('Screen sharing cancelled');
        } else {
          toast.error(`Screen sharing failed: ${err.message}`);
        }
        // Clean up any partial stream
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
        }
      }
    }
  }, []);

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!remoteStream || isRecording) return;
    try {
      const tracks = [];
      const remoteVideo = remoteStream.getVideoTracks()[0];
      if (remoteVideo) tracks.push(remoteVideo);

      // Mix both sides' audio
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      if (localStreamRef.current) {
        audioCtx.createMediaStreamSource(localStreamRef.current).connect(dest);
      }
      audioCtx.createMediaStreamSource(remoteStream).connect(dest);
      const mixedAudio = dest.stream.getAudioTracks()[0];
      if (mixedAudio) tracks.push(mixedAudio);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType });
      recordChunksRef.current = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cbfm-call-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        audioCtx.close();
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
    }
  }, [remoteStream, isRecording]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
      setIsRecording(false);
    }
  }, []);

  const dismissPermDenied = useCallback(() => setPermDenied(null), []);

  const value = {
    callStatus, activeCallData, localStream, remoteStream,
    isMuted, isCameraOff, isScreenSharing, isRecording,
    startCall, answerCall, rejectCall, hangUp,
    toggleMic, toggleCamera, toggleScreenShare,
    startRecording, stopRecording,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
      {incomingCall && createPortal(
        <IncomingCallBanner call={incomingCall} onAnswer={answerCall} onReject={rejectCall} />,
        document.body,
      )}
      {permDenied && createPortal(
        <MediaPermissionModal
          onDismiss={dismissPermDenied}
          onRetry={permDenied.retryFn
            ? () => { setPermDenied(null); permDenied.retryFn(); }
            : null}
          callerName={permDenied.callerName}
        />,
        document.body,
      )}
      {(callStatus === 'calling' || callStatus === 'active') && createPortal(
        <VideoCallModal />,
        document.body,
      )}
    </VideoCallContext.Provider>
  );
}

export const useVideoCall = () => useContext(VideoCallContext);
