import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMarineAreas, getMarineStats, deleteMarineArea } from '../utils/firestore';
import { toast } from 'sonner';
import { Plus, Search, Anchor, MapPin, Filter, Shield, Waves, Edit, Trash2 } from 'lucide-react';
import { VANUATU_PROVINCES, AREA_TYPES } from '../utils/constants';
import Pagination from '../components/Pagination';
import { GlowingEffect } from '../components/ui/glowing-effect';

const STATUS_BADGE = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-red-100 text-red-700',
  under_review: 'bg-amber-100 text-amber-700',
  proposed: 'bg-sky-100 text-sky-700',
};

const AREA_TYPE_BADGE = {
  lmma: 'bg-ocean-100 text-ocean-700',
  taboo_area: 'bg-red-100 text-red-700',
  patrol_zone: 'bg-amber-100 text-amber-700',
  buffer_zone: 'bg-violet-100 text-violet-700',
  spawning_aggregation: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-600',
};

const BORDER_COLOR = {
  lmma: '#0369a1',
  taboo_area: '#dc2626',
  patrol_zone: '#ca8a04',
  buffer_zone: '#7c3aed',
  spawning_aggregation: '#059669',
  other: '#6b7280',
};

function AreaCard({ area, canEdit, onDelete }) {
  const navigate = useNavigate();
  return (
    <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 p-5 hover:shadow-md transition-shadow"
      style={{ borderLeftColor: BORDER_COLOR[area.areaType] || '#6b7280' }}>
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{area.areaName}</h3>
          <div className="flex items-center gap-1 mt-1 text-gray-400 text-xs">
            <MapPin size={11} />{area.province} &middot; {area.island}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`badge ${STATUS_BADGE[area.managementStatus] || 'bg-gray-100 text-gray-600'} capitalize`}>
            {area.managementStatus?.replace(/_/g, ' ')}
          </span>
          {canEdit && (
            <>
              <button onClick={() => navigate(`/marine/${area.id}/edit`)}
                className="p-1.5 text-gray-300 hover:text-ocean-700 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                <Edit size={13} />
              </button>
              <button onClick={() => onDelete(area)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-3">Community: {area.community}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className={`badge ${AREA_TYPE_BADGE[area.areaType] || 'bg-gray-100 text-gray-600'} capitalize`}>
          {area.areaType?.replace(/_/g, ' ')}
        </span>
        {area.areaSizeHa && (
          <span className="badge bg-gray-100 text-gray-500">{parseFloat(area.areaSizeHa).toFixed(1)} ha</span>
        )}
        {area.protectionLevel && (
          <span className="badge bg-gray-50 text-gray-500 capitalize">{area.protectionLevel?.replace(/_/g, ' ')}</span>
        )}
      </div>
      {area.isCurrentlyOpen !== null && area.isCurrentlyOpen !== undefined && (
        <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium ${area.isCurrentlyOpen ? 'text-emerald-600' : 'text-red-500'}`}>
          {area.isCurrentlyOpen ? <><Waves size={12} /> Open to fishing</> : <><Shield size={12} /> Closed &mdash; Taboo</>}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
      <div className="flex gap-2"><div className="h-5 bg-gray-100 rounded-full w-20" /><div className="h-5 bg-gray-100 rounded-full w-14" /></div>
    </div>
  );
}


export default function MarineAreasPage() {
  const { isStaff } = useAuth();
  const [areas, setAreas] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ province: '', areaType: '', managementStatus: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const [areaRes, statsRes] = await Promise.all([getMarineAreas(filters), getMarineStats()]);
      setAreas(areaRes.areas);
      setPagination(areaRes.pagination);
      setStats(statsRes);
    } catch { toast.error('Failed to load marine areas.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAreas(); }, [filters]);

  const handleDelete = async (area) => {
    if (!window.confirm(`Delete "${area.areaName}"? This cannot be undone.`)) return;
    try {
      await deleteMarineArea(area.id);
      toast.success('Marine area deleted.');
      fetchAreas();
    } catch { toast.error('Failed to delete marine area.'); }
  };

  const hasFilters = filters.province || filters.areaType || filters.managementStatus || filters.search;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marine Areas</h2>
          <p className="text-gray-400 text-sm">
            {stats.total || 0} areas &mdash; {stats.totalAreaHa ? `${parseFloat(stats.totalAreaHa).toFixed(0)} ha` : '0 ha'} protected
          </p>
        </div>
        <Link to="/marine/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> New Marine Area
        </Link>
      </div>

      {stats.byType?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.byType.map(t => (
            <button key={t.areaType}
              onClick={() => setFilters(f => ({ ...f, areaType: f.areaType === t.areaType ? '' : t.areaType, page: 1 }))}
              className={`badge cursor-pointer transition-all ${filters.areaType === t.areaType
                ? (AREA_TYPE_BADGE[t.areaType] || 'bg-gray-200 text-gray-700') + ' ring-2 ring-offset-1 ring-current'
                : AREA_TYPE_BADGE[t.areaType] || 'bg-gray-100 text-gray-600'
              } capitalize hover:opacity-90`}>
              {t.areaType?.replace(/_/g, ' ')}: <strong className="ml-1">{t.count}</strong>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-gray-400" />
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
          <option value="under_review">Under Review</option>
        </select>
        {hasFilters && (
          <button onClick={() => setFilters({ province: '', areaType: '', managementStatus: '', search: '', page: 1 })}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors underline">Clear</button>
        )}
      </div>

      {!loading && areas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Anchor size={24} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium mb-1">No marine areas found</p>
          <p className="text-gray-400 text-sm mb-5">
            {hasFilters ? 'Try adjusting your filters' : 'Register the first marine protected area'}
          </p>
          {!hasFilters && (
            <Link to="/marine/new" className="btn-primary text-sm inline-flex items-center gap-2">
              <Plus size={14} /> New Marine Area
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : areas.map(area => <AreaCard key={area.id} area={area} canEdit={isStaff} onDelete={handleDelete} />)
          }
        </div>
      )}

      <Pagination pagination={pagination} filters={filters} setFilters={setFilters} />
    </div>
  );
}
