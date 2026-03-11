import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTrip, updateTrip, BUDGET_CATEGORIES } from '../utils/trips';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import {
import { GlowingEffect } from '../components/ui/glowing-effect';
  ArrowLeft, Save, Plus, Trash2, UserPlus, Receipt,
  Users, Calendar, MapPin, Clock, FileText, ChevronDown,
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function toLocalDatetimeValue(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatVUV(n) {
  const num = parseFloat(n) || 0;
  return `VUV ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
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
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewTripPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  // Basic trip fields
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [dateOfTravel, setDateOfTravel] = useState('');
  const [duration, setDuration] = useState('');
  const [purpose, setPurpose] = useState('');

  // Dynamic arrays
  const [teamMembers, setTeamMembers] = useState([emptyMember()]);
  const [budgetItems, setBudgetItems] = useState([emptyBudgetRow()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // Load existing trip for edit
  useEffect(() => {
    if (!isEdit) return;
    getDoc(doc(db, 'trips', id))
      .then((snap) => {
        if (!snap.exists()) { toast.error('Trip not found'); navigate('/trips'); return; }
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
      })
      .catch(() => toast.error('Failed to load trip'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  // ── Team member helpers ─────────────────────────────────────────────────────
  const updateMember = (idx, field, value) => {
    setTeamMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };
  const addMember = () => setTeamMembers((prev) => [...prev, emptyMember()]);
  const removeMember = (idx) =>
    setTeamMembers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  // ── Budget row helpers ──────────────────────────────────────────────────────
  const updateBudgetRow = (idx, field, value) => {
    setBudgetItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const updated = { ...row, [field]: value };
        updated.total = calcRowTotal(updated);
        return updated;
      }),
    );
  };
  const addBudgetRow = () => setBudgetItems((prev) => [...prev, emptyBudgetRow()]);
  const removeBudgetRow = (idx) =>
    setBudgetItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const grandTotal = budgetItems.reduce((sum, row) => sum + (row.total || 0), 0);

  // Group totals by category for summary
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

    const validMembers = teamMembers.filter((m) => m.name.trim());
    const validBudget = budgetItems.filter((r) => r.activity.trim());

    const tripData = {
      title: title.trim(),
      destination: destination.trim(),
      dateOfTravel: new Date(dateOfTravel),
      duration: parseInt(duration),
      purpose: purpose.trim(),
      teamMembers: validMembers,
      budgetItems: validBudget,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateTrip(id, user.uid, tripData);
        toast.success('Trip updated — calendar synced');
      } else {
        await createTrip(user.uid, tripData);
        toast.success('Trip planned — added to your schedule');
      }
      navigate('/trips');
    } catch (err) {
      toast.error(err.message || 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading trip…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* ── Main form ── */}
        <form id="trip-form" onSubmit={handleSubmit} className="xl:col-span-2 space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={18} className="text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit' : 'Plan a'} Field Trip</h2>
              <p className="text-gray-400 text-xs mt-0.5">Completes automatically adds an event to your Schedule calendar</p>
            </div>
          </div>

          {/* ── Trip Details ── */}
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
                  type="number"
                  min="1"
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

          {/* ── Team Members ── */}
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

          {/* ── Budget Breakdown ── */}
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
                      <td className="py-1.5 pr-2" colSpan={row.category === 'Other' ? 1 : 1}>
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
                          type="number"
                          min="0"
                          className="form-input py-1.5 text-xs text-right"
                          placeholder="0"
                          value={row.quantity}
                          onChange={(e) => updateBudgetRow(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          min="0"
                          className="form-input py-1.5 text-xs text-right"
                          placeholder="0"
                          value={row.unitCost}
                          onChange={(e) => updateBudgetRow(idx, 'unitCost', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          min="1"
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
        </form>

        {/* ── Right sidebar summary ── */}
        <div className="space-y-4 sticky top-6">
          {/* Trip summary card */}
          <div className="card space-y-3">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
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
                    <Clock size={11} className="text-gray-400" /> {duration} day{parseInt(duration) !== 1 ? 's' : ''}
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

            {/* Budget category breakdown */}
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
                  <span className="text-sm font-bold text-primary tabular-nums">
                    {formatVUV(grandTotal)}
                  </span>
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
                disabled={saving}
                className="btn-primary w-full justify-center"
              >
                <Save size={14} />
                {saving ? 'Saving…' : isEdit ? 'Update Trip' : 'Plan Trip'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/trips')}
                className="btn-secondary w-full justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
