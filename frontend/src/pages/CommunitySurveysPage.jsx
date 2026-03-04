import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Users, CheckCircle, XCircle, Edit } from 'lucide-react';
import { VANUATU_PROVINCES, SURVEY_TYPES } from '../utils/constants';

export default function CommunitySurveysPage() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ province: '', surveyType: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 15, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      const res = await api.get(`/surveys?${params}`);
      setSurveys(res.data.surveys);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load surveys.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSurveys(); }, [filters]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Surveys</h2>
          <p className="text-gray-500 text-sm">{pagination.total || 0} total records</p>
        </div>
        <Link to="/surveys/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Survey
        </Link>
      </div>

      {/* Filters */}
      <div className="card py-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="form-input pl-8 py-2 text-sm" placeholder="Search community, LMMA..."
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-ocean-600">Loading...</div>
      ) : surveys.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>No surveys found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Community</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Province</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Fishers</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Committee</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Taboo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s, i) => (
                <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{s.community}</p>
                    {s.lmmaName && <p className="text-xs text-gray-400">{s.lmmaName}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.province}<br /><span className="text-xs">{s.island}</span></td>
                  <td className="px-4 py-3 text-gray-500">{s.surveyDate}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-ocean-50 text-ocean-700">{s.surveyType?.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{s.totalFishers ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {s.hasCBFMCommittee ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : <XCircle size={16} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.hasTabooArea ? <CheckCircle size={16} className="text-blue-500 mx-auto" /> : <XCircle size={16} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/surveys/${s.id}/edit`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-ocean-700">
                      <Edit size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filters.page === p ? 'bg-ocean-700 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
