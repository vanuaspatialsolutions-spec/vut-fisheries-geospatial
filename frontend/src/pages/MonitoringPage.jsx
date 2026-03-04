import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Activity } from 'lucide-react';
import { VANUATU_PROVINCES, MONITORING_TYPES } from '../utils/constants';

const TYPE_COLORS = {
  reef_fish_survey: 'bg-blue-100 text-blue-800',
  invertebrate_survey: 'bg-green-100 text-green-800',
  coral_cover: 'bg-orange-100 text-orange-800',
  seagrass_survey: 'bg-purple-100 text-purple-800',
  mangrove_survey: 'bg-teal-100 text-teal-800',
  catch_composition: 'bg-yellow-100 text-yellow-800',
};

function HealthScore({ score }) {
  if (!score) return <span className="text-gray-400">—</span>;
  const colors = score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-600';
  return <span className={`font-bold ${colors}`}>{score}/5</span>;
}

export default function MonitoringPage() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ province: '', monitoringType: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 15, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      const res = await api.get(`/monitoring?${params}`);
      setRecords(res.data.records);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, [filters]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Biological Monitoring</h2>
          <p className="text-gray-500 text-sm">{pagination.total || 0} total records</p>
        </div>
        <Link to="/monitoring/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Record
        </Link>
      </div>

      {/* Filters */}
      <div className="card py-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="form-input pl-8 py-2 text-sm" placeholder="Search site, community..."
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
      </div>

      {/* Records */}
      {loading ? (
        <div className="text-center py-12 text-ocean-600">Loading...</div>
      ) : records.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p>No monitoring records found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Site / Survey</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Coral %</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Fish (kg)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Health</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{r.siteName}</p>
                    <p className="text-xs text-gray-400">{r.surveyName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${TYPE_COLORS[r.monitoringType] || 'bg-gray-100 text-gray-600'}`}>
                      {r.monitoringType?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.province}<br /><span className="text-xs">{r.community}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.surveyDate}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {r.liveCoralCoverPct != null ? `${r.liveCoralCoverPct}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {r.totalFishBiomassKg != null ? `${r.totalFishBiomassKg} kg` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <HealthScore score={r.reefHealthScore} />
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
