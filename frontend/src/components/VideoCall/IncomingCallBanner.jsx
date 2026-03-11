import { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';

// ── Ringtone via Web Audio (no file required) ─────────────────────────────────
function useRingtone() {
  useEffect(() => {
    let ctx = null;
    let intervalId = null;

    const scheduleBeeps = (context, start) => {
      // Two-tone pulse: 480 Hz → 440 Hz, repeated every 2.5 s
      [0, 0.55].forEach((offset, i) => {
        const t = start + offset;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(context.destination);
        osc.frequency.value = i === 0 ? 480 : 440;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.04);
        gain.gain.setValueAtTime(0.15, t + 0.28);
        gain.gain.linearRampToValueAtTime(0, t + 0.33);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    };

    try {
      ctx = new AudioContext();
      const ring = () => {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        scheduleBeeps(ctx, ctx.currentTime + 0.05);
      };
      ring();
      intervalId = setInterval(ring, 2500);
    } catch (_) {}

    return () => {
      clearInterval(intervalId);
      ctx?.close().catch(() => {});
    };
  }, []);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function IncomingCallBanner({ call, onAnswer, onReject }) {
  const isVideo = call.type === 'video';
  const initial = call.callerName?.[0]?.toUpperCase() || '?';

  useRingtone();

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-950"
      style={{ zIndex: 2000000000 }}
    >
      {/* ── Top info ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">

        {/* Pulsing rings + avatar */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse rings */}
          <span className="absolute w-44 h-44 rounded-full bg-emerald-500/10 animate-ping" />
          <span className="absolute w-36 h-36 rounded-full bg-emerald-500/15 animate-ping [animation-delay:0.3s]" />

          {/* Avatar */}
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-2xl ring-4 ring-emerald-500/30">
            <span className="text-white text-5xl font-bold">{initial}</span>
          </div>
        </div>

        {/* Caller info */}
        <div className="text-center space-y-1.5">
          <p className="text-white text-3xl font-semibold tracking-tight">{call.callerName}</p>
          <p className="text-gray-400 text-base">
            Incoming {isVideo ? 'video' : 'audio'} call
          </p>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="pb-16 px-16 flex items-end justify-between">

        {/* Decline */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => onReject(call)}
            className="w-18 h-18 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all shadow-lg flex items-center justify-center"
            style={{ width: 72, height: 72 }}
          >
            <PhoneOff size={30} className="text-white" />
          </button>
          <span className="text-gray-400 text-sm font-medium">Decline</span>
        </div>

        {/* Answer */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => onAnswer(call)}
            className="rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg flex items-center justify-center animate-pulse"
            style={{ width: 72, height: 72 }}
          >
            {isVideo
              ? <Video size={30} className="text-white" />
              : <Phone size={30} className="text-white" />
            }
          </button>
          <span className="text-gray-300 text-sm font-medium">Answer</span>
        </div>

      </div>
    </div>
  );
}
