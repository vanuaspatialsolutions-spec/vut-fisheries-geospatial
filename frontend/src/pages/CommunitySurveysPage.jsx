import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// DEMO - remove mock import and restore api when backend is ready
// import api from '../utils/api';
import { mockSurveys } from '../utils/mockData';
import toast from 'react-hot-toast';
import { Plus, Search, Users, CheckCircle, XCircle, Edit, Filter } from 'lucide-react';
import { VANUATU_PROVINCES, SURVEY_TYPES } from '../utils/constants';

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[1,2,3,4,5,6,7,8].map(i => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton-text w-full" style={{ width: `${60 + i * 5}%` }} />
        </td>
      ))}
    </tr>
  );
}

function Pagination({ pagination, filters, setFilters }) {
  if (pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
      <span>Page {filters.page} of {pagination.pages} &mdash; {pagination.total} records</span>
      <div className="flex gap-1">
        <button
          disabled={filters.page <= 1}
          onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filters.page === p ? 'bg-ocean-700 text-white' : 'border bg-white text-gray-600 hover:bg-gray-50'}`}>
            {p}
          </button>
        ))}
        <button
          disabled={filters.page >= pagination.pages}
          onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function CommunitySurveysPage() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ province: '', surveyType: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);

  const fetchSurveys = async () => {
    setLoading(true);
    // DEMO - replace with real API call when backend is ready
    setTimeout(() => {
      let data = mockSurveys.surveys;
      if (filters.province) data = data.filter(s => s.province === filters.province);
      if (filters.surveyType) data = data.filter(s => s.surveyType === filters.surveyType);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        data = data.filter(s => s.community.toLowerCase().includes(q) || s.lmmaName?.toLowerCase().includes(q));
      }
      setSurveys(data);
      setPagination({ pages: mockSurveys.pagination.pages, total: data.length });
      setLoading(false);
    }, 300);
    // END DEMO
  };

  useEffect(() => { fetchSurveys(); }, [filters]);

  const hasFilters = filters.province || filters.surveyType || filters.search;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Surveys</h2>
          <p className="text-gray-400 text-sm">{pagination.total ?? 0} total records</p>
        </div>
        <Link to="/surveys/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          New Survey
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-gray-400 flex-shrink-0" />
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-8 py-2 text-sm"
            placeholder="Search community, LMMA..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          />
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
          <button
            onClick={() => setFilters({ province: '', surveyType: '', search: '', page: 1 })}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors underline flex-shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Province / Island</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fishers</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Committee</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Taboo</th>
                <th className="w-10 px-4 py-3" />
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
                    <td className="px-4 py-3.5">
                      <p className="text-gray-700">{s.province}</p>
                      <p className="text-xs text-gray-400">{s.island}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{s.surveyDate}</td>
                    <td className="px-4 py-3.5">
                      <span className="badge bg-ocean-50 text-ocean-700 capitalize">
                        {s.surveyType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-700">{s.totalFishers ?? '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      {s.hasCBFMCommittee
                        ? <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                        : <XCircle size={16} className="text-gray-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {s.hasTabooArea
                        ? <CheckCircle size={16} className="text-ocean-500 mx-auto" />
                        : <XCircle size={16} className="text-gray-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => navigate(`/surveys/${s.id}/edit`)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-ocean-700 transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
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
