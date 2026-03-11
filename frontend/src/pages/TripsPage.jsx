import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToTrips, deleteTrip } from '../utils/trips';
import toast from 'react-hot-toast';
import {
  Plus, MapPin, Calendar, Clock, Users, Receipt,
  Edit2, Trash2, Plane, ChevronRight,
} from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : d.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatVUV(n) {
  return `VUV ${(n || 0).toLocaleString()}`;
}

function TripStatusBadge({ trip }) {
  const now = new Date();
  const start = trip.dateOfTravel instanceof Date ? trip.dateOfTravel : new Date(trip.dateOfTravel);
  const end = new Date(start);
  end.setDate(end.getDate() + (trip.duration || 1));

  if (now >= start && now <= end) {
    return (
      <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        In Progress
      </span>
    );
  }
  if (now > end) {
    return <span className="badge bg-gray-100 text-gray-500 ring-1 ring-gray-200">Completed</span>;
  }
  return (
    <span className="badge bg-blue-50 text-blue-700 ring-1 ring-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
      Upcoming
    </span>
  );
}

export default function TripsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToTrips(user.uid, (data) => {
      setTrips(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const handleDelete = async (tripId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this trip plan and remove it from the schedule calendar?')) return;
    setDeleting(tripId);
    try {
      await deleteTrip(tripId);
      toast.success('Trip deleted and removed from calendar');
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse space-y-3">
            <div className="skeleton-title w-48" />
            <div className="skeleton-text w-72" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trip Plans</h1>
          <p className="page-subtitle">All team field trips — saved trips appear on the shared Schedule calendar</p>
        </div>
        <button onClick={() => navigate('/trips/new')} className="btn-primary">
          <Plus size={15} /> New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="card flex flex-col items-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Plane size={28} className="text-primary opacity-60" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">No trips planned yet</p>
            <p className="text-sm text-gray-400 mt-1">Plan a field trip and it will appear on the shared Schedule calendar for everyone.</p>
          </div>
          <button onClick={() => navigate('/trips/new')} className="btn-primary">
            <Plus size={14} /> Plan the first trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trips.map((trip) => {
            const isOwner = trip.userId === user?.uid;
            return (
              <div
                key={trip.id}
                className={`card-hover group relative flex flex-col gap-3 ${isOwner ? 'cursor-pointer' : ''}`}
                onClick={() => isOwner && navigate(`/trips/${trip.id}/edit`)}
              >
                {/* Status + actions */}
                <div className="flex items-start justify-between gap-2">
                  <TripStatusBadge trip={trip} />
                  {isOwner && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/trips/${trip.id}/edit`); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit trip"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(trip.id, e)}
                        disabled={deleting === trip.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete trip"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{trip.title}</h3>
                  {trip.destination && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {trip.destination}
                    </p>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} className="text-gray-400" />
                    {formatDate(trip.dateOfTravel)}
                  </span>
                  {trip.duration && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-gray-400" />
                      {trip.duration} day{trip.duration !== 1 ? 's' : ''}
                    </span>
                  )}
                  {trip.teamMembers?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={11} className="text-gray-400" />
                      {trip.teamMembers.length} member{trip.teamMembers.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Team preview */}
                {trip.teamMembers?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {trip.teamMembers.slice(0, 3).map((m, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {m.name}
                      </span>
                    ))}
                    {trip.teamMembers.length > 3 && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                        +{trip.teamMembers.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Budget */}
                {trip.totalBudget > 0 && (
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Receipt size={11} /> Total Budget
                    </span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {formatVUV(trip.totalBudget)}
                    </span>
                  </div>
                )}

                {isOwner && (
                  <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-primary transition-colors" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
