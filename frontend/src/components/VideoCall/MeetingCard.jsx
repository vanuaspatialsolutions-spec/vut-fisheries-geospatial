import { CalendarDays, Clock, Video } from 'lucide-react';

function formatMeetingTime(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function MeetingCard({ meetingData, onJoin }) {
  const scheduledAt = meetingData?.scheduledAt?.toDate
    ? meetingData.scheduledAt.toDate()
    : new Date(meetingData?.scheduledAt);

  const isPast = scheduledAt < new Date();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 max-w-xs w-full">
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <CalendarDays size={14} className="text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-900 leading-tight">{meetingData?.title}</p>
          <p className="text-[10px] text-blue-500 font-medium mt-0.5">Scheduled Meeting</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-blue-700 mb-1">
        <Clock size={11} className="flex-shrink-0" />
        <span>{formatMeetingTime(meetingData?.scheduledAt)}</span>
      </div>

      {meetingData?.description && (
        <p className="text-[11px] text-blue-600 mt-1.5 leading-relaxed">{meetingData.description}</p>
      )}

      <p className="text-[10px] text-blue-400 mt-1.5">
        Scheduled by {meetingData?.createdByName}
      </p>

      {onJoin && !isPast && (
        <button
          onClick={onJoin}
          className="mt-3 w-full h-8 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <Video size={12} />
          Join Meeting
        </button>
      )}
      {isPast && (
        <p className="mt-2 text-center text-[10px] text-blue-400 italic">Meeting has passed</p>
      )}
    </div>
  );
}
