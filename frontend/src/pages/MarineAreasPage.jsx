import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Anchor } from 'lucide-react';
import { VANUATU_PROVINCES, AREA_TYPES } from '../utils/constants';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-700',
  under_review: 'bg-yellow-100 text-yellow-800',
  proposed: 'bg-blue-100 text-blue-800',
};

const AREA_TYPE_COLORS = {
  lmma: 'bg-ocean-100 text-ocean-800',
  taboo_area: 'bg-red-100 text-red-700',
  patrol_zone: 'bg-yellow-100 text-yellow-800',
  buffer_zone: 'bg-purple-100 text-purple-800',
  spawning_aggregation: 'bg-green-100 text-green-800',
  other: 'bg-gray-100 text-gray-600',
};

export default function MarineAreasPage() {
  const [areas, setAreas] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ province: '', areaType: '', managementStatus: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 15, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      const [areaRes, statsRes] = await Promise.all([
        api.get(`/marine?${params}`),
        api.get('/marine/stats'),
      ]);
      setAreas(areaRes.data.areas);
      setPagination(areaRes.data.pagination);
      setStats(statsRes.data);
    } catch { toast.error('Failed to load marine areas.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAreas(); }, [filters]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marine Areas</h2>
          <p className="text-gray-500 text-sm">
            {stats.total || 0} areas · {stats.totalAreaHa ? `${parseFloat(stats.totalAreaHa).toFixed(0)} ha` : '0 ha'} total protected area
          </p>
        </div>
        <Link to="/marine/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Marine Area
        </Link>
      </div>

      {/* Stats by type */}
      {stats.byType?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.byType.map(t => (
            <span key={t.areaType} className={`badge ${AREA_TYPE_COLORS[t.areaType] || 'bg-gray-100 text-gray-600'}`}>
              {t.areaType?.replace(/_/g, ' ')}: {t.count}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card py-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="form-input pl-8 py-2 text-sm" placeholder="Search area name, community..."
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
        </div>
        <select className="form-input py-2 text-sm w-auto" value={filters.province}
          onChange={e => setFilters(f => ({ ...f, province: e.target.value, page: 1 }))}>
          <option value="">All Provinces</option>
          {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="form-input py-2 text-sm w-auto" value={filters.areaType}
          onChange={e => setFilters(f => ({ ...f, areaType: e.target.value, page: 1 }))}>
          <option value="">All Types</option>
          {AREA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="form-input py-2 text-sm w-auto" value={filters.managementStatus}
          onChange={e => setFilters(f => ({ ...f, managementStatus: e.target.value, page: 1 }))}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="proposed">Proposed</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-ocean-600">Loading...</div>
      ) : areas.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Anchor size={40} className="mx-auto mb-3 opacity-30" />
          <p>No marine areas found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(area => (
            <div key={area.id} className="card hover:shadow-md transition-shadow border-l-4"
              style={{ borderLeftColor: { lmma: '#0369a1', taboo_area: '#dc2626', patrol_zone: '#ca8a04', buffer_zone: '#7c3aed', spawning_aggregation: '#059669' }[area.areaType] || '#6b7280' }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{area.areaName}</h3>
                <span className={`badge ${STATUS_COLORS[area.managementStatus] || 'bg-gray-100'}`}>
                  {area.managementStatus}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                <p>{area.province} · {area.island}</p>
                <p>Community: {area.community}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`badge ${AREA_TYPE_COLORS[area.areaType] || 'bg-gray-100 text-gray-600'}`}>
                    {area.areaType?.replace(/_/g, ' ')}
                  </span>
                  {area.areaSizeHa && (
                    <span className="badge bg-gray-100 text-gray-600">{area.areaSizeHa} ha</span>
                  )}
                </div>
                {area.isCurrentlyOpen !== undefined && (
                  <p className={`text-xs mt-1 font-medium ${area.isCurrentlyOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {area.isCurrentlyOpen ? '⚑ Open to fishing' : '⊘ Closed (taboo)'}
                  </p>
                )}
              </div>
            </div>
          ))}
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
