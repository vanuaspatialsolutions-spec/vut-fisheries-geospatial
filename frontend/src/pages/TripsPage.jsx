import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createTrip, updateTrip, deleteTrip, subscribeToTrips, BUDGET_CATEGORIES } from '../utils/trips';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import {
  Plus, MapPin, Calendar, Clock, Users, Receipt,
  Edit2, Trash2, Plane, Save, UserPlus, FileText,
  X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { GlowingEffect } from '../components/ui/glowing-effect';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDatetimeValue(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDate(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : d.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatVUV(n) {
  return `VUV ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function calcRowTotal(item) {
  const qty = parseFloat(item.quantity) || 0;
  const cost = parseFloat(item.unitCost) || 0;
  const dur = parseFloat(item.duration) || 1;
  return qty * cost * dur;
}

const emptyMember = () => ({ name: '', position: '', organisation: '' });
const emptyBudgetRow = () => ({
  category: BUDGET_CATEGORIES[0],
  customCategory: '',
  activity: '',
  quantity: '',
  unitCost: '',
  duration: '',
  total: 0,
});

// ── Status Badge ──────────────────────────────────────────────────────────────

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

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3 border-b border-gray-100 pb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon size={15} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
    </div>
  );
}

// ── Trip Record Card ──────────────────────────────────────────────────────────

function TripCard({ trip, onEdit, onDelete, deleting }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card group">
      {/* Top row: status + actions */}
      <div className="flex items-start justify-between gap-2">
        <TripStatusBadge trip={trip} />
        <div className="flex items-center gap-1 flex-shrink-0">
          {trip.isOwner && (
            <>
              <button
                onClick={() => onEdit(trip)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Edit trip"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => onDelete(trip.id)}
                disabled={deleting === trip.id}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Delete trip"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={expanded ? 'Collapse' : 'View details'}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Title + destination */}
      <div className="mt-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{trip.title}</h3>
        {trip.destination && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {trip.destination}
          </p>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 mt-2">
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

      {/* Team pills */}
      {trip.teamMembers?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
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

      {/* Budget footer */}
      {trip.totalBudget > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 mt-2">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Receipt size={11} /> Total Budget
          </span>
          <span className="text-sm font-bold text-primary tabular-nums">
            {formatVUV(trip.totalBudget)}
          </span>
        </div>
      )}

      {/* Expanded detail view */}
      {expanded && (
        <div className="border-t border-gray-100 pt-3 mt-2 space-y-3">
          {trip.purpose && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Purpose</p>
              <p className="text-xs text-gray-700 mt-1 leading-relaxed">{trip.purpose}</p>
            </div>
          )}
          {trip.teamMembers?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Team</p>
              <div className="space-y-1">
                {trip.teamMembers.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="font-medium">{m.name}</span>
                    {m.position && <span className="text-gray-400">— {m.position}</span>}
                    {m.organisation && <span className="text-gray-400">({m.organisation})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {trip.budgetItems?.filter((r) => r.activity).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Budget Breakdown</p>
              <div className="space-y-1">
                {trip.budgetItems.filter((r) => r.activity).map((r, i) => {
                  const cat = r.category === 'Other' && r.customCategory ? r.customCategory : r.category;
                  return (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-500">{cat} — {r.activity}</span>
                      <span className="font-medium text-gray-800 tabular-nums flex-shrink-0">
                        {r.total ? r.total.toLocaleString() : '—'}
                      </span>
                    </div>
                  );
                })}
                {trip.totalBudget > 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs border-t border-gray-100 pt-1 mt-1">
                    <span className="font-semibold text-gray-700">Grand Total</span>
                    <span className="font-bold text-primary tabular-nums">{formatVUV(trip.totalBudget)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const { user } = useAuth();

  // Records
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  // Form visibility
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [dateOfTravel, setDateOfTravel] = useState('');
  const [duration, setDuration] = useState('');
  const [purpose, setPurpose] = useState('');
  const [teamMembers, setTeamMembers] = useState([emptyMember()]);
  const [budgetItems, setBudgetItems] = useState([emptyBudgetRow()]);

  // Subscribe to trips
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToTrips(user.uid, (data) => {
      setTrips(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // ── Form helpers ────────────────────────────────────────────────────────────

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDestination('');
    setDateOfTravel('');
    setDuration('');
    setPurpose('');
    setTeamMembers([emptyMember()]);
    setBudgetItems([emptyBudgetRow()]);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
    setTimeout(() =>
      document.getElementById('trip-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function openEditForm(trip) {
    resetForm();
    setEditingId(trip.id);
    setShowForm(true);
    setLoadingTrip(true);
    try {
      const snap = await getDoc(doc(db, 'trips', trip.id));
      if (!snap.exists()) { toast.error('Trip not found'); return; }
      const d = snap.data();
      setTitle(d.title || '');
      setDestination(d.destination || '');
      setDuration(String(d.duration || ''));
      setPurpose(d.purpose || '');
      if (d.dateOfTravel) {
        const dt = d.dateOfTravel.toDate ? d.dateOfTravel.toDate() : new Date(d.dateOfTravel);
        setDateOfTravel(toLocalDatetimeValue(dt));
      }
      setTeamMembers(d.teamMembers?.length ? d.teamMembers : [emptyMember()]);
      setBudgetItems(d.budgetItems?.length ? d.budgetItems : [emptyBudgetRow()]);
    } catch {
      toast.error('Failed to load trip');
    } finally {
      setLoadingTrip(false);
    }
    setTimeout(() =>
      document.getElementById('trip-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  // Team helpers
  const updateMember = (idx, field, value) =>
    setTeamMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  const addMember = () => setTeamMembers((prev) => [...prev, emptyMember()]);
  const removeMember = (idx) =>
    setTeamMembers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  // Budget helpers
  const updateBudgetRow = (idx, field, value) =>
    setBudgetItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const updated = { ...row, [field]: value };
        updated.total = calcRowTotal(updated);
        return updated;
      }),
    );
  const addBudgetRow = () => setBudgetItems((prev) => [...prev, emptyBudgetRow()]);
  const removeBudgetRow = (idx) =>
    setBudgetItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const grandTotal = budgetItems.reduce((sum, row) => sum + (row.total || 0), 0);
  const categoryTotals = budgetItems.reduce((acc, row) => {
    const cat = row.category === 'Other' && row.customCategory ? row.customCategory : row.category;
    acc[cat] = (acc[cat] || 0) + (row.total || 0);
    return acc;
  }, {});

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Enter a trip title'); return; }
    if (!dateOfTravel) { toast.error('Select a date of travel'); return; }
    if (!duration || parseInt(duration) < 1) { toast.error('Enter a valid duration'); return; }

    const tripData = {
      title: title.trim(),
      destination: destination.trim(),
      dateOfTravel: new Date(dateOfTravel),
      duration: parseInt(duration),
      purpose: purpose.trim(),
      teamMembers: teamMembers.filter((m) => m.name.trim()),
      budgetItems: budgetItems.filter((r) => r.activity.trim()),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateTrip(editingId, user.uid, tripData);
        toast.success('Trip updated — calendar synced');
      } else {
        await createTrip(user.uid, tripData);
        toast.success('Trip planned — added to your schedule');
      }
      closeForm();
    } catch (err) {
      toast.error(err.message || 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (tripId) => {
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

  // ── Render ──────────────────────────────────────────────────────────────────

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

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Trip Plans</h1>
          <p className="page-subtitle">All team field trips — saved trips appear on the shared Schedule calendar</p>
        </div>
        {!showForm && (
          <button onClick={openNewForm} className="btn-primary">
            <Plus size={15} /> New Trip
          </button>
        )}
      </div>

      {/* Inline plan / edit form */}
      {showForm && (
        <div id="trip-form-section" className="max-w-7xl">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

            {/* Main form */}
            <form id="trip-form" onSubmit={handleSubmit} className="xl:col-span-2 space-y-5">

              {/* Form header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingId ? 'Edit Field Trip' : 'Plan a Field Trip'}
                  </h2>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Saving automatically adds an event to the Schedule calendar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {loadingTrip ? (
                <div className="card flex items-center justify-center py-12 text-gray-400 text-sm">
                  Loading trip…
                  <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
                </div>
              ) : (
                <>
                  {/* Trip Details */}
                  <Section icon={MapPin} title="Trip Details" subtitle="Basic information about the field trip">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="form-label">Trip Title *</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Malekula LMMA Field Survey Q2"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">Destination / Location</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Malekula Island"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Date of Travel *</label>
                        <input
                          type="datetime-local"
                          className="form-input"
                          value={dateOfTravel}
                          onChange={(e) => setDateOfTravel(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">Duration (days) *</label>
                        <input
                          type="number" min="1"
                          className="form-input"
                          placeholder="e.g. 5"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="form-label">Purpose / Objectives</label>
                        <textarea
                          className="form-input min-h-[72px] resize-none"
                          placeholder="Describe the purpose and objectives of this trip…"
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </Section>

                  {/* Travel Team */}
                  <Section
                    icon={Users}
                    title="Travel Team"
                    subtitle="Staff travelling on this trip — name, position, and department/unit"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                            <th className="text-left pb-2 pr-3 w-[38%]">Full Name</th>
                            <th className="text-left pb-2 pr-3 w-[30%]">Position / Title</th>
                            <th className="text-left pb-2 pr-3">Organisation / Unit</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {teamMembers.map((member, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 pr-3">
                                <input
                                  className="form-input py-1.5 text-sm"
                                  placeholder="Full name"
                                  value={member.name}
                                  onChange={(e) => updateMember(idx, 'name', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 pr-3">
                                <input
                                  className="form-input py-1.5 text-sm"
                                  placeholder="Position"
                                  value={member.position}
                                  onChange={(e) => updateMember(idx, 'position', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 pr-3">
                                <input
                                  className="form-input py-1.5 text-sm"
                                  placeholder="Organisation / Unit"
                                  value={member.organisation}
                                  onChange={(e) => updateMember(idx, 'organisation', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5">
                                <button
                                  type="button"
                                  onClick={() => removeMember(idx)}
                                  disabled={teamMembers.length === 1}
                                  className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={addMember}
                      className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      <UserPlus size={13} /> Add team member
                    </button>
                  </Section>

                  {/* Budget Breakdown */}
                  <Section
                    icon={Receipt}
                    title="Budget Breakdown"
                    subtitle="Itemise costs by category — total auto-calculates (Qty × Unit Cost × Duration)"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                            <th className="text-left pb-2 pr-2 w-[18%]">Category</th>
                            <th className="text-left pb-2 pr-2 w-[28%]">Activity / Description</th>
                            <th className="text-right pb-2 pr-2 w-[10%]">Qty / Ppl</th>
                            <th className="text-right pb-2 pr-2 w-[14%]">Unit Cost (VUV)</th>
                            <th className="text-right pb-2 pr-2 w-[10%]">Duration</th>
                            <th className="text-right pb-2 pr-2 w-[16%]">Total (VUV)</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {budgetItems.map((row, idx) => (
                            <tr key={idx} className="group">
                              <td className="py-1.5 pr-2">
                                <select
                                  className="form-input py-1.5 text-xs pr-6"
                                  value={row.category}
                                  onChange={(e) => updateBudgetRow(idx, 'category', e.target.value)}
                                >
                                  {BUDGET_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-1.5 pr-2">
                                {row.category === 'Other' ? (
                                  <div className="flex flex-col gap-1">
                                    <input
                                      className="form-input py-1 text-xs"
                                      placeholder="Category name"
                                      value={row.customCategory}
                                      onChange={(e) => updateBudgetRow(idx, 'customCategory', e.target.value)}
                                    />
                                    <input
                                      className="form-input py-1 text-xs"
                                      placeholder="Activity description"
                                      value={row.activity}
                                      onChange={(e) => updateBudgetRow(idx, 'activity', e.target.value)}
                                    />
                                  </div>
                                ) : (
                                  <input
                                    className="form-input py-1.5 text-xs"
                                    placeholder="Activity description"
                                    value={row.activity}
                                    onChange={(e) => updateBudgetRow(idx, 'activity', e.target.value)}
                                  />
                                )}
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  type="number" min="0"
                                  className="form-input py-1.5 text-xs text-right"
                                  placeholder="0"
                                  value={row.quantity}
                                  onChange={(e) => updateBudgetRow(idx, 'quantity', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  type="number" min="0"
                                  className="form-input py-1.5 text-xs text-right"
                                  placeholder="0"
                                  value={row.unitCost}
                                  onChange={(e) => updateBudgetRow(idx, 'unitCost', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <input
                                  type="number" min="1"
                                  className="form-input py-1.5 text-xs text-right"
                                  placeholder="1"
                                  value={row.duration}
                                  onChange={(e) => updateBudgetRow(idx, 'duration', e.target.value)}
                                />
                              </td>
                              <td className="py-1.5 pr-2 text-right">
                                <span className="text-xs font-semibold text-gray-800 tabular-nums">
                                  {row.total ? row.total.toLocaleString() : '—'}
                                </span>
                              </td>
                              <td className="py-1.5">
                                <button
                                  type="button"
                                  onClick={() => removeBudgetRow(idx)}
                                  disabled={budgetItems.length === 1}
                                  className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200">
                            <td colSpan={5} className="pt-2 text-xs font-semibold text-gray-600 text-right pr-2">
                              Grand Total
                            </td>
                            <td className="pt-2 text-right pr-2">
                              <span className="text-sm font-bold text-primary tabular-nums">
                                {grandTotal ? grandTotal.toLocaleString() : '0'}
                              </span>
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={addBudgetRow}
                      className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      <Plus size={13} /> Add budget line
                    </button>
                  </Section>
                </>
              )}
            </form>

            {/* Right sidebar summary */}
            <div className="space-y-4 sticky top-6">
              <div className="card space-y-3">
                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  Trip Summary
                </h3>
                <div className="space-y-2 text-xs">
                  {title && (
                    <div>
                      <p className="text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Trip</p>
                      <p className="text-gray-800 font-medium mt-0.5">{title}</p>
                    </div>
                  )}
                  {destination && (
                    <div>
                      <p className="text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Destination</p>
                      <p className="text-gray-700 mt-0.5 flex items-center gap-1">
                        <MapPin size={11} className="text-gray-400" /> {destination}
                      </p>
                    </div>
                  )}
                  {dateOfTravel && (
                    <div>
                      <p className="text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Date</p>
                      <p className="text-gray-700 mt-0.5 flex items-center gap-1">
                        <Calendar size={11} className="text-gray-400" />
                        {new Date(dateOfTravel).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {duration && (
                    <div>
                      <p className="text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Duration</p>
                      <p className="text-gray-700 mt-0.5 flex items-center gap-1">
                        <Clock size={11} className="text-gray-400" />
                        {duration} day{parseInt(duration) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  {teamMembers.some((m) => m.name) && (
                    <div>
                      <p className="text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Team</p>
                      <p className="text-gray-700 mt-0.5 flex items-center gap-1">
                        <Users size={11} className="text-gray-400" />
                        {teamMembers.filter((m) => m.name).length} member{teamMembers.filter((m) => m.name).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>

                {grandTotal > 0 && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Budget by Category</p>
                    <div className="space-y-1">
                      {Object.entries(categoryTotals)
                        .filter(([, v]) => v > 0)
                        .map(([cat, amt]) => (
                          <div key={cat} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-600 truncate">{cat}</span>
                            <span className="text-xs font-medium text-gray-800 tabular-nums flex-shrink-0">
                              {amt.toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="text-xs font-bold text-gray-700">Total</span>
                      <span className="text-sm font-bold text-primary tabular-nums">{formatVUV(grandTotal)}</span>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                    <Calendar size={13} className="text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Saving this trip will automatically add it to the <strong>Schedule calendar</strong> as a field trip event.
                    </p>
                  </div>
                  <button
                    type="submit"
                    form="trip-form"
                    disabled={saving || loadingTrip}
                    className="btn-primary w-full justify-center"
                  >
                    <Save size={14} />
                    {saving ? 'Saving…' : editingId ? 'Update Trip' : 'Plan Trip'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="btn-secondary w-full justify-center"
                  >
                    Cancel
                  </button>
                </div>
                <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Saved trip records */}
      {trips.length === 0 && !showForm ? (
        <div className="card flex flex-col items-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Plane size={28} className="text-primary opacity-60" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">No trips planned yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Plan a field trip and it will appear on the shared Schedule calendar.
            </p>
          </div>
          <button onClick={openNewForm} className="btn-primary">
            <Plus size={14} /> Plan the first trip
          </button>
          <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
        </div>
      ) : trips.length > 0 ? (
        <div>
          {showForm && (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Saved Records
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={{ ...trip, isOwner: trip.userId === user?.uid }}
                onEdit={openEditForm}
                onDelete={handleDelete}
                deleting={deleting}
              />
            ))}
          </div>
        </div>
      ) : null}

    </div>
  );
}
