import { useRef, useEffect } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Circle, StopCircle,
} from 'lucide-react';
import { useVideoCall } from '../../context/VideoCallContext';

export default function VideoCallModal() {
  const {
    callStatus, activeCallData, localStream, remoteStream,
    isMuted, isCameraOff, isScreenSharing, isRecording,
    hangUp, toggleMic, toggleCamera, toggleScreenShare,
    startRecording, stopRecording,
  } = useVideoCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream ?? null;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream ?? null;
  }, [remoteStream]);

  const isVideo = activeCallData?.isVideo;
  const calleeName = activeCallData?.calleeName || 'Unknown';
  const isCalling = callStatus === 'calling';
  const isConnecting = callStatus === 'connecting';

  // ── Connecting overlay (shown while getUserMedia resolves after Answer) ──
  if (isConnecting) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-gray-950"
        style={{ zIndex: 2000000000 }}
      >
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-white text-lg font-semibold">{calleeName}</p>
          <p className="text-gray-400 text-sm">Connecting…</p>
          {isVideo && (
            <p className="text-gray-600 text-xs mt-1">Allow camera &amp; microphone if prompted</p>
          )}
        </div>
        <button
          onClick={hangUp}
          className="mt-6 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
          title="Cancel"
        >
          <PhoneOff size={22} className="text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-950"
      style={{ zIndex: 2000000000 }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-900/90 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${isCalling ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
          <span className="text-white text-sm font-medium">
            {isCalling ? `Calling ${calleeName}…` : calleeName}
          </span>
          {!isCalling && (
            <span className="text-gray-500 text-xs">Connected</span>
          )}
        </div>
        {isRecording && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
            <Circle size={8} className="fill-red-400 animate-pulse" />
            REC
          </div>
        )}
      </div>

      {/* ── Video area ── */}
      <div className="flex-1 relative bg-gray-950 overflow-hidden">

        {/* Remote video (main stage) */}
        {isVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              {calleeName[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-white text-lg font-medium">{calleeName}</p>
            <p className="text-gray-400 text-sm">{isCalling ? 'Calling…' : 'Audio call'}</p>
          </div>
        )}

        {/* Calling overlay */}
        {isCalling && isVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/85 gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-white text-4xl font-bold">
              {calleeName[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-white text-xl font-semibold">{calleeName}</p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Local video PiP */}
        {isVideo && (
          <div className="absolute bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border-2 border-gray-600 bg-gray-900 shadow-xl">
            {/* Camera-off placeholder — hidden while screen sharing */}
            {isCameraOff && !isScreenSharing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800">
                <VideoOff size={22} className="text-gray-500" />
              </div>
            )}
            {/*
              Always keep this element mounted so srcObject assignment in the
              useEffect works reliably across screen-share toggles.
              - Camera mode: object-cover + mirror (scaleX(-1))
              - Screen mode: object-contain + no mirror (text would appear reversed)
            */}
            <video
              ref={localVideoRef}
              autoPlay playsInline muted
              className={`w-full h-full ${isScreenSharing ? 'object-contain bg-gray-950' : 'object-cover'}`}
              style={isScreenSharing ? undefined : { transform: 'scaleX(-1)' }}
            />
            <span className="absolute bottom-1.5 left-2 text-[10px] text-white/70 font-medium z-10">
              {isScreenSharing ? 'Screen' : 'You'}
            </span>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center justify-center gap-5 py-5 bg-gray-900/90 flex-shrink-0">
        <CtrlBtn
          icon={isMuted ? MicOff : Mic}
          label={isMuted ? 'Unmute' : 'Mute'}
          active={!isMuted}
          onClick={toggleMic}
        />

        {isVideo && (
          <CtrlBtn
            icon={isCameraOff ? VideoOff : Video}
            label={isCameraOff ? 'Start Cam' : 'Stop Cam'}
            active={!isCameraOff}
            onClick={toggleCamera}
          />
        )}

        {isVideo && (
          <CtrlBtn
            icon={isScreenSharing ? MonitorOff : Monitor}
            label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
            active={!isScreenSharing}
            highlight={isScreenSharing}
            onClick={toggleScreenShare}
          />
        )}

        <CtrlBtn
          icon={isRecording ? StopCircle : Circle}
          label={isRecording ? 'Stop Rec' : 'Record'}
          active={!isRecording}
          highlight={isRecording}
          highlightColor="bg-red-500"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={callStatus !== 'active'}
        />

        {/* End call */}
        <button
          onClick={hangUp}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
          title="End call"
        >
          <PhoneOff size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
}

function CtrlBtn({
  icon: Icon, label, active, onClick, highlight, highlightColor = 'bg-blue-500',
  disabled = false,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex flex-col items-center gap-1.5 disabled:opacity-40"
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          highlight ? highlightColor
            : active ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-gray-600 hover:bg-gray-500'
        }`}
      >
        <Icon size={18} className="text-white" />
      </div>
      <span className="text-gray-400 text-[10px] leading-none">{label}</span>
    </button>
  );
}
