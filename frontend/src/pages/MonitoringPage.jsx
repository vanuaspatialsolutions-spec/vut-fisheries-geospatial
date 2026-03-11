import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMonitoringRecords, deleteMonitoring } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, Waves, Edit, Trash2 } from 'lucide-react';
import { VANUATU_PROVINCES, MONITORING_TYPES } from '../utils/constants';
import Pagination from '../components/Pagination';

const TYPE_BADGE = {
  reef_fish_survey: 'bg-sky-100 text-sky-700',
  invertebrate_survey: 'bg-emerald-100 text-emerald-700',
  coral_cover: 'bg-orange-100 text-orange-700',
  seagrass_survey: 'bg-violet-100 text-violet-700',
  mangrove_survey: 'bg-teal-100 text-teal-700',
  catch_composition: 'bg-amber-100 text-amber-700',
};

function HealthScore({ score }) {
  if (!score) return <span className="text-gray-300 font-medium">—</span>;
  const cls = score >= 4 ? 'text-emerald-600 bg-emerald-50' : score >= 3 ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50';
  return (
    <span className={`inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold ${cls}`}>
      {score}/5
    </span>
  );
}

function CoralBar({ pct }) {
  if (pct == null) return <span className="text-gray-300">—</span>;
  const color = pct >= 50 ? 'bg-emerald-500' : pct >= 25 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-600">{pct}%</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      <td className="px-4 py-3.5"><div className="skeleton-text" style={{ width: '70%' }} /></td>
      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="skeleton-text" style={{ width: '60%' }} /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="skeleton-text" style={{ width: '55%' }} /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="skeleton-text" style={{ width: '50%' }} /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="skeleton-text" style={{ width: '45%' }} /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="skeleton-text" style={{ width: '40%' }} /></td>
      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="skeleton-text" style={{ width: '35%' }} /></td>
    </tr>
  );
}


export default function MonitoringPage() {
  const { isStaff } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ province: '', monitoringType: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await getMonitoringRecords(filters);
      setRecords(res.records);
      setPagination(res.pagination);
    } catch { toast.error('Failed to load records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, [filters]);

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete "${r.siteName}"? This cannot be undone.`)) return;
    try {
      await deleteMonitoring(r.id);
      toast.success('Record deleted.');
      fetchRecords();
    } catch { toast.error('Failed to delete record.'); }
  };

  const hasFilters = filters.province || filters.monitoringType || filters.search;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Biological Monitoring</h2>
          <p className="text-gray-400 text-sm">{pagination.total ?? 0} total records</p>
        </div>
        <Link to="/monitoring/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> New Record
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-gray-400" />
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-8 py-2 text-sm" placeholder="Search site, survey name..."
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
        </div>
        <select className="form-input py-2 text-sm w-auto" value={filters.province}
          onChange={e => setFilters(f => ({ ...f, province: e.target.value, page: 1 }))}>
          <option value="">All Provinces</option>
          {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="form-input py-2 text-sm w-auto" value={filters.monitoringType}
          onChange={e => setFilters(f => ({ ...f, monitoringType: e.target.value, page: 1 }))}>
          <option value="">All Types</option>
          {MONITORING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => setFilters({ province: '', monitoringType: '', search: '', page: 1 })}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors underline">Clear</button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!loading && records.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Waves size={24} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">No monitoring records found</p>
            <p className="text-gray-400 text-sm mb-5">
              {hasFilters ? 'Try adjusting your filters' : 'Log the first reef or biological survey'}
            </p>
            {!hasFilters && (
              <Link to="/monitoring/new" className="btn-primary text-sm inline-flex items-center gap-2">
                <Plus size={14} /> New Record
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Site / Survey</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Coral Cover</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Fish (kg)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Health</th>
                {isStaff && <th className="w-16 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800">{r.siteName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.surveyName}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className={`badge ${TYPE_BADGE[r.monitoringType] || 'bg-gray-100 text-gray-600'} capitalize`}>
                        {r.monitoringType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-gray-700">{r.province}</p>
                      <p className="text-xs text-gray-400">{r.community}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap hidden md:table-cell">{r.surveyDate}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell"><CoralBar pct={r.liveCoralCoverPct} /></td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-700 hidden lg:table-cell">
                      {r.totalFishBiomassKg != null ? r.totalFishBiomassKg : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell"><HealthScore score={r.reefHealthScore} /></td>
                    {isStaff && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/monitoring/${r.id}/edit`)}
                            className="p-1.5 text-gray-300 hover:text-ocean-700 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => handleDelete(r)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination pagination={pagination} filters={filters} setFilters={setFilters} />
    </div>
  );
}
