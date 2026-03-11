import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSurveys, deleteSurvey } from '../utils/firestore';
import { toast } from 'sonner';
import { Plus, Search, Users, CheckCircle, XCircle, Edit, Trash2, Filter } from 'lucide-react';
import { VANUATU_PROVINCES, SURVEY_TYPES } from '../utils/constants';
import Pagination from '../components/Pagination';
import { GlowingEffect } from '../components/ui/glowing-effect';

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      <td className="px-4 py-3.5"><div className="skeleton-text w-full" style={{ width: '70%' }} /></td>
      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="skeleton-text" style={{ width: '65%' }} /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="skeleton-text" style={{ width: '55%' }} /></td>
      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="skeleton-text" style={{ width: '60%' }} /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="skeleton-text" style={{ width: '40%' }} /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="skeleton-text" style={{ width: '30%' }} /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="skeleton-text" style={{ width: '30%' }} /></td>
      <td className="px-4 py-3.5"><div className="skeleton-text" style={{ width: '50%' }} /></td>
    </tr>
  );
}


export default function CommunitySurveysPage() {
  const { isStaff } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ province: '', surveyType: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const res = await getSurveys(filters);
      setSurveys(res.surveys);
      setPagination(res.pagination);
    } catch { toast.error('Failed to load surveys.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSurveys(); }, [filters]);

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete survey for "${s.community}"? This cannot be undone.`)) return;
    try {
      await deleteSurvey(s.id);
      toast.success('Survey deleted.');
      fetchSurveys();
    } catch { toast.error('Failed to delete survey.'); }
  };

  const hasFilters = filters.province || filters.surveyType || filters.search;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Community Surveys</h2>
          <p className="text-gray-400 text-sm">{pagination.total ?? 0} total records</p>
        </div>
        <Link to="/surveys/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          New Survey
        </Link>
      </div>

      <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
        <Filter size={14} className="text-gray-400 flex-shrink-0" />
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-8 py-2 text-sm" placeholder="Search community, LMMA..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
        </div>
        <select className="form-input py-2 text-sm w-auto" value={filters.province}
          onChange={e => setFilters(f => ({ ...f, province: e.target.value, page: 1 }))}>
          <option value="">All Provinces</option>
          {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="form-input py-2 text-sm w-auto" value={filters.surveyType}
          onChange={e => setFilters(f => ({ ...f, surveyType: e.target.value, page: 1 }))}>
          <option value="">All Types</option>
          {SURVEY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => setFilters({ province: '', surveyType: '', search: '', page: 1 })}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors underline flex-shrink-0">
            Clear
          </button>
        )}
      </div>

      <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
        {surveys.length === 0 && !loading ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">No surveys found</p>
            <p className="text-gray-400 text-sm mb-5">
              {hasFilters ? 'Try adjusting your filters' : 'Start by adding the first survey'}
            </p>
            {!hasFilters && (
              <Link to="/surveys/new" className="btn-primary text-sm inline-flex items-center gap-2">
                <Plus size={14} /> New Survey
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Community</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Province / Island</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Type</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Fishers</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Committee</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Taboo</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : surveys.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800">{s.community}</p>
                      {s.lmmaName && <p className="text-xs text-gray-400 mt-0.5">{s.lmmaName}</p>}
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <p className="text-gray-700">{s.province}</p>
                      <p className="text-xs text-gray-400">{s.island}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap hidden md:table-cell">{s.surveyDate}</td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="badge bg-ocean-50 text-ocean-700 capitalize">
                        {s.surveyType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-700 hidden lg:table-cell">{s.totalFishers ?? '—'}</td>
                    <td className="px-4 py-3.5 text-center hidden md:table-cell">
                      {s.hasCBFMCommittee
                        ? <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                        : <XCircle size={16} className="text-gray-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3.5 text-center hidden md:table-cell">
                      {s.hasTabooArea
                        ? <CheckCircle size={16} className="text-ocean-500 mx-auto" />
                        : <XCircle size={16} className="text-gray-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/surveys/${s.id}/edit`)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-ocean-700 transition-colors" title="Edit">
                          <Edit size={14} />
                        </button>
                        {isStaff && (
                          <button onClick={() => handleDelete(s)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
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
