import { Phone, PhoneOff, Video } from 'lucide-react';

export default function IncomingCallBanner({ call, onAnswer, onReject }) {
  const isVideo = call.type === 'video';

  return (
    <div
      className="fixed top-4 right-4 rounded-2xl overflow-hidden shadow-2xl"
      style={{ zIndex: 2000000000, width: 300, background: 'rgba(17,24,39,0.97)' }}
    >
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 ring-2 ring-emerald-500/30">
            {isVideo
              ? <Video size={17} className="text-emerald-400" />
              : <Phone size={17} className="text-emerald-400" />
            }
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{call.callerName}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Incoming {isVideo ? 'video' : 'audio'} call
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onReject(call)}
            className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors text-red-400 bg-red-500/15 hover:bg-red-500/25"
          >
            <PhoneOff size={14} />
            Decline
          </button>
          <button
            onClick={() => onAnswer(call)}
            className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors text-white bg-emerald-500 hover:bg-emerald-600"
          >
            {isVideo ? <Video size={14} /> : <Phone size={14} />}
            Answer
          </button>
        </div>
      </div>
    </div>
  );
}
