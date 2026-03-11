import { useState } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleMeeting } from '../../utils/messaging';

export default function MeetingSchedulerModal({ threadId, currentUser, onClose }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) { toast.error('Fill in all required fields'); return; }
    const scheduledAt = new Date(`${date}T${time}`);
    if (scheduledAt <= new Date()) { toast.error('Please choose a future date and time'); return; }

    setSaving(true);
    try {
      const myName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      await scheduleMeeting(threadId, currentUser.uid, myName, {
        title: title.trim(),
        scheduledAt,
        description: description.trim(),
      });
      toast.success('Meeting scheduled!');
      onClose();
    } catch (err) {
      toast.error('Could not schedule meeting: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <CalendarDays size={13} className="text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Schedule Meeting</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Fisheries Weekly Review"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-input"
                value={date}
                min={todayStr}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Time *</label>
              <input
                type="time"
                className="form-input"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Agenda or notes…"
              rows={3}
              style={{ resize: 'none' }}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Scheduling…' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
