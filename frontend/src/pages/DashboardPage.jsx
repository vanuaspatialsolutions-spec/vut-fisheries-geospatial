import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  getSurveyStats, getMarineStats, getMonitoringStats, getDatasetStats,
  getSurveysForMap, getMarineGeoJSON, getMonitoringForMap,
  getPublishedGeoJSONDatasets, getDatasetGeoJSON,
  getMonthlyActivityStats,
} from '../utils/firestore';
import CBFMMap from '../components/Map/CBFMMap';
import { VANUATU_PROVINCES, PROVINCE_BOUNDARY_HA } from '../utils/constants';
import {
  ClipboardList, Waves, Microscope, Layers, Plus, MapPin,
  ArrowUpRight, RefreshCw, BarChart2, ShieldCheck,
  Filter, AlertTriangle, TrendingUp,
  Globe, TreePine, UsersRound, Ship,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { GlowingEffect } from '../components/ui/glowing-effect';

const VANUATU_MARINE_HA = 5_000_000;
const CHART_COLORS = ['#0369a1','#0891b2','#0d9488','#0284c7','#6366f1','#8b5cf6','#10b981'];
const PROVINCE_COLORS = { Malampa:'#7c3aed',Penama:'#0891b2',Sanma:'#0d9488',Shefa:'#d97706',Tafea:'#ef4444',Torba:'#6366f1' };
const LAYER_CFG = [
  { key:'surveys',    label:'Surveys',    icon:ClipboardList, on:'bg-violet-600 text-white border-violet-600',  dot:'bg-violet-400' },
  { key:'marine',     label:'Marine',     icon:Waves,         on:'bg-blue-600 text-white border-blue-600',      dot:'bg-blue-400'   },
  { key:'monitoring', label:'Monitoring', icon:Microscope,    on:'bg-teal-600 text-white border-teal-600',      dot:'bg-teal-400'   },
  { key:'datasets',   label:'Datasets',   icon:Layers,        on:'bg-cyan-600 text-white border-cyan-600',      dot:'bg-cyan-400'   },
];
const LEGEND_ITEMS = [
  { color:'bg-gray-700',   label:'Community Survey',                round:true  },
  { color:'bg-blue-400',   label:'Marine areas under spatial plan', round:false },
  { color:'bg-blue-600',   label:'Protected Marine areas',          round:false },
  { color:'bg-slate-500',  label:'Areas under habitat restoration', round:false },
  { color:'bg-gray-500',   label:'Bio. Monitoring',                 round:true  },
];
const AREA_TYPE_LABEL = { lmma:'LMMA',taboo_area:'Taboo Area',patrol_zone:'Patrol Zone',buffer_zone:'Buffer Zone',spawning_aggregation:'Spawning Site',other:'Other' };
const STATUS_COLORS = { Active:'#16a34a',Inactive:'#dc2626','Under Review':'#d97706',Proposed:'#2563eb',Published:'#0891b2' };
const QUICK = [
  { label:'New Survey',   to:'/surveys/new',     icon:ClipboardList },
  { label:'Marine Area',  to:'/marine/new',       icon:Waves         },
  { label:'Bio. Record',  to:'/monitoring/new',   icon:Microscope    },
  { label:'Upload Data',  to:'/datasets/upload',  icon:Layers        },
];
const CATEGORY_LABELS = {
  marine_spatial_plan: 'Marine areas under spatial plan',
  protected_marine:    'Protected Marine areas',
  habitat_restoration: 'Areas under habitat restoration',
};
const CATEGORY_COLORS = {
  marine_spatial_plan: '#38bdf8',
  protected_marine:    '#a78bfa',
  habitat_restoration: '#34d399',
};

function useCountUp(target, duration=1000, decimals=0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let cur = 0;
    const steps = 50;
    const t = setInterval(() => {
      cur += target / steps;
      if (cur >= target) { setVal(target); clearInterval(t); }
      else setVal(parseFloat(cur.toFixed(decimals)));
    }, duration / steps);
    return () => clearInterval(t);
  }, [target, duration, decimals]);
  return val;
}

function HeroCard({ label, value, unit, sub, loading, index, decimals=0, icon: Icon, color='#6b7280' }) {
  const counted = useCountUp(loading ? 0 : (typeof value === 'number' ? value : 0), 800, decimals);
  return (
    <div
      style={{ animationDelay: `${index * 60}ms` }}
      className="relative bg-white rounded-xl border border-gray-100 shadow-sm p-4 stat-card-entrance select-none hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 leading-snug pr-2 flex-1">{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}1a` }}>
            <Icon size={13} style={{ color }} strokeWidth={2} />
          </div>
        )}
      </div>
      {loading
        ? <div className="h-7 w-20 rounded-lg bg-gray-100 animate-pulse mb-1" />
        : <p className="text-[1.6rem] font-bold leading-none tracking-tight text-gray-900">
            {decimals > 0
              ? counted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
              : Math.round(counted).toLocaleString()}
            {unit && <span className="text-sm font-medium ml-1" style={{ color }}>{unit}</span>}
          </p>}
      {sub && (
        <p className="text-[11px] mt-2 text-gray-400 leading-tight">
          {loading ? <span className="inline-block h-3 w-24 rounded bg-gray-100 animate-pulse" /> : sub}
        </p>
      )}
      {!loading && <div className="mt-3 h-0.5 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: color }} />}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children, loading, empty, emptyMsg, className='', color='#0891b2' }) {
  return (
    <div className={`relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}33)` }} />
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18` }}>
            <Icon size={12} style={{ color }} strokeWidth={2.25} />
          </div>
          <h3 className="font-semibold text-gray-700 text-sm tracking-tight">{title}</h3>
        </div>
        {loading
          ? <div className="h-52 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-gray-100 rounded-full animate-spin" style={{ borderTopColor: color }} />
            </div>
          : empty
            ? <div className="h-52 flex flex-col items-center justify-center gap-2">
                <BarChart2 size={28} className="text-gray-200" />
                <p className="text-xs text-gray-400">{emptyMsg || 'No data yet'}</p>
              </div>
            : children}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold mb-1 text-gray-700">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.stroke || '#374151' }}>
          {p.name || 'Value'}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function ProvinceSummary({ data, loading }) {
  if (loading) return (
    <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse" />)}</div>
  );
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <MapPin size={28} className="text-gray-200" />
      <p className="text-sm text-gray-400">No provincial data yet — add marine areas to populate this table</p>
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-100">
            <th className="py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide text-left pr-4">Province</th>
          <th className="py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center px-3">Areas</th>
          <th className="py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center px-3 hidden sm:table-cell">Coverage (ha)</th>
          <th className="py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center px-3 hidden md:table-cell">Communities</th>
          <th className="py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center px-3 hidden sm:table-cell">Active</th>
          <th className="py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide text-left pl-3 hidden lg:table-cell">Coverage Bar</th>
        </tr></thead>
        <tbody>
          {[...data].sort((a, b) => b.totalHa - a.totalHa).map(row => {
            const boundaryHa = PROVINCE_BOUNDARY_HA[row.province] || 1;
            const pct = Math.min(100, (row.totalHa / boundaryHa) * 100);
            const pctDisplay = pct.toFixed(3);
            const color = PROVINCE_COLORS[row.province] || '#6b7280';
            return (
              <tr key={row.province} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} /><span className="font-medium text-gray-800">{row.province}</span></div></td>
                <td className="py-3 px-3 text-center font-semibold text-gray-700">{row.count}</td>
                <td className="py-3 px-3 text-center font-semibold text-gray-700 hidden sm:table-cell">{row.totalHa ? parseFloat(row.totalHa).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}</td>
                <td className="py-3 px-3 text-center text-gray-600 hidden md:table-cell">{row.communityCount}</td>
                <td className="py-3 px-3 text-center hidden sm:table-cell"><span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${row.activeCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>{row.activeCount}</span></td>
                <td className="py-3 pl-3 hidden lg:table-cell"><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[120px]"><div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} /></div><span className="text-xs text-gray-400 w-12 text-right">{pctDisplay}%</span></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuickAction({ label, to, icon: Icon }) {
  return (
    <Link to={to}
      className="relative group bg-white border border-gray-200 hover:border-gray-300 rounded-md p-3.5 flex items-center gap-3 transition-colors duration-150">
      <GlowingEffect spread={30} glow proximity={48} inactiveZone={0.01} borderWidth={2} disabled={false} />
      <Icon size={14} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" strokeWidth={1.75} />
      <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 tracking-tight transition-colors">{label}</p>
      <ArrowUpRight size={12} className="text-gray-300 group-hover:text-gray-500 ml-auto flex-shrink-0 transition-colors" />
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [marine, setMarine] = useState({});
  const [surveys, setSurveys] = useState({});
  const [monitoring, setMonitor] = useState({});
  const [datasets, setDatasets] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [mapSurveys, setMapSurveys] = useState([]);
  const [marineAreas, setMarineAreas] = useState(null);
  const [mapMonitor, setMapMonitor] = useState([]);
  const [datasetLayers, setDatasetLayers] = useState([]);
  const [datasetsFailed, setDatasetsFailed] = useState(0);
  const [mapLoading, setMapLoading] = useState(true);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [monthlyActivity, setMonthlyActivity] = useState([]);
  const [layers, setLayers] = useState({ surveys: true, marine: true, monitoring: true, datasets: true });
  const [filters, setFilters] = useState({ province: '', areaType: '' });

  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchAll = async (quiet = false) => {
    if (!quiet) { setStatsLoading(true); setMapLoading(true); }
    setDatasetLayers([]); setDatasetsFailed(0);
    let datasetMeta = [];
    try {
      const [mr, sv, mo, ds, surveyMap, marineMap, monMap, dsMeta, monthly] = await Promise.all([
        getMarineStats(), getSurveyStats(), getMonitoringStats(), getDatasetStats(),
        getSurveysForMap(), getMarineGeoJSON(filters), getMonitoringForMap(), getPublishedGeoJSONDatasets(),
        getMonthlyActivityStats(),
      ]);
      setMarine(mr); setSurveys(sv); setMonitor(mo); setDatasets(ds);
      setMapSurveys(surveyMap); setMarineAreas(marineMap); setMapMonitor(monMap);
      setMonthlyActivity(monthly);
      datasetMeta = dsMeta;
    } catch (err) {
      console.error(err);
      toast.error(`Load error: ${err.message || 'unknown'}`, { duration: 5000 });
    } finally {
      setStatsLoading(false); setMapLoading(false);
    }
    if (!datasetMeta.length) return;
    setDatasetsLoading(true);
    try {
      const results = await Promise.allSettled(datasetMeta.map(d => getDatasetGeoJSON(d).then(g => g ? { meta: d, geojson: g } : null)));
      const loaded = results.filter(r => r.status === 'fulfilled' && r.value !== null).map(r => r.value);
      setDatasetLayers(loaded); setDatasetsFailed(results.length - loaded.length);
    } catch {} finally { setDatasetsLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filters, location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

  const dsByType = Object.fromEntries((datasets.byType || []).map(d => [d.dataType, d]));
  const dsSpatialCount   = dsByType.marine_spatial_plan?.featureCount || 0;
  const dsSpatialHa      = dsByType.marine_spatial_plan?.publishedAreaHa || 0;
  const dsProtectedCount = dsByType.protected_marine?.featureCount || 0;
  const dsProtectedHa    = dsByType.protected_marine?.publishedAreaHa || 0;
  const dsRestorationHa  = dsByType.habitat_restoration?.publishedAreaHa || 0;

  const totalSpatialCount   = (marine.total ?? 0) + dsSpatialCount;
  const totalSpatialHa      = (marine.totalAreaHa || 0) + dsSpatialHa;
  const totalProtectedCount = (marine.protectedCount ?? 0) + dsProtectedCount;
  const totalProtectedHa    = (marine.protectedAreaHa || 0) + dsProtectedHa;
  const totalRestorationHa  = (marine.restorationAreaHa || 0) + dsRestorationHa;
  const mpaPct = totalProtectedHa ? parseFloat(((totalProtectedHa / VANUATU_MARINE_HA) * 100).toFixed(3)) : 0;
  // marine.restorationAreaHa is already included in marine.totalAreaHa (and thus totalSpatialHa),
  // so only add dsRestorationHa (from habitat_restoration datasets) to avoid double-counting.
  const totalMarineHa = totalSpatialHa + dsRestorationHa;

  const heroCards = [
    { label:'Marine Areas — Spatial Plan', value:totalSpatialCount,                              sub:'total managed marine zones',                            icon:Waves,       color:'#2563eb' },
    { label:'Total Spatial Coverage',      value:parseFloat(totalMarineHa.toFixed(1)), unit:'ha', sub:'spatial plan + habitat restoration',   decimals:1,      icon:Layers,      color:'#0d9488' },
    { label:'Marine Areas Protected',      value:totalProtectedCount,                            sub:`${Math.round(totalProtectedHa).toLocaleString()} ha protected`, icon:ShieldCheck, color:'#10b981' },
    { label:'% MPA of Vanuatu Waters',     value:mpaPct, unit:'%',                               sub:'of ~50,000 km² territorial sea',        decimals:3,      icon:Globe,       color:'#7c3aed' },
    { label:'Communities in Conservation', value:new Set([...(marine.communities || []), ...(surveys.communities || [])]).size, sub:'unique communities engaged', icon:UsersRound,  color:'#f97316' },
    { label:'Habitat Restoration Areas',   value:parseFloat(totalRestorationHa.toFixed(1)), unit:'ha', sub:'mangrove & seagrass habitats',    decimals:1,      icon:TreePine,    color:'#16a34a' },
  ];

  const marineByType = [
    ...(marine.byType || []).map(d => ({ name: AREA_TYPE_LABEL[d.areaType] || d.areaType, value: d.count, ha: parseFloat((d.totalHa || 0).toFixed(1)) })),
    ...(datasets.byType || []).filter(d => CATEGORY_LABELS[d.dataType] && (d.featureCount || 0) > 0).map(d => ({ name: CATEGORY_LABELS[d.dataType], value: d.featureCount, ha: d.publishedAreaHa || 0 })),
  ].filter(d => d.value > 0);

  // Merge marine areas + published dataset areas by province.
  // All 6 Vanuatu provinces are always present (zeroed if no data yet).
  // Used for both the Coverage chart and the Province Summary table.
  const mergedProvinceData = (() => {
    const acc = {};
    for (const p of VANUATU_PROVINCES) {
      acc[p] = { province: p, count: 0, totalHa: 0, communityCount: 0, activeCount: 0 };
    }
    for (const d of (marine.byProvince || [])) {
      if (!acc[d.province]) acc[d.province] = { province: d.province, count: 0, totalHa: 0, communityCount: 0, activeCount: 0 };
      acc[d.province].count = d.count;
      acc[d.province].totalHa = d.totalHa || 0;
      acc[d.province].communityCount = d.communityCount || 0;
      acc[d.province].activeCount = d.activeCount || 0;
    }
    for (const d of (datasets.byProvince || [])) {
      if (!acc[d.province]) acc[d.province] = { province: d.province, count: 0, totalHa: 0, communityCount: 0, activeCount: 0 };
      acc[d.province].totalHa = parseFloat(((acc[d.province].totalHa || 0) + (d.totalAreaHa || 0)).toFixed(1));
      acc[d.province].count = (acc[d.province].count || 0) + (d.featureCount || 0);
    }
    return Object.values(acc);
  })();

  const marineByProvince = mergedProvinceData
    .filter(d => d.totalHa > 0)
    .map(d => ({
      province: d.province,
      pct: parseFloat(((d.totalHa / (PROVINCE_BOUNDARY_HA[d.province] || 1)) * 100).toFixed(3)),
    }))
    .sort((a, b) => b.pct - a.pct);
  // Include both marine_areas records AND dataset features; show 'Unknown' (no province assigned) as its own bar.
  const marineCountByProvince = mergedProvinceData
    .filter(d => d.count > 0)
    .map(d => ({ province: d.province, count: d.count }))
    .sort((a, b) => b.count - a.count);
  const publishedDsFeatureCount = (datasets.byType || [])
    .filter(d => CATEGORY_LABELS[d.dataType])
    .reduce((sum, d) => sum + (d.featureCount || 0), 0);
  const marineByStatus = [
    ...(marine.byStatus || []).map(d => ({ name: d.status.charAt(0).toUpperCase() + d.status.slice(1).replace(/_/g, ' '), value: d.count })),
    ...(publishedDsFeatureCount > 0 ? [{ name: 'Published', value: publishedDsFeatureCount }] : []),
  ];
  const surveysByProv    = (surveys.byProvince || []).map(d => ({ province: (d.province || 'Unknown').substring(0, 7), count: parseInt(d.count) }));
  const monByType        = (monitoring.byType || []).map(d => ({ name: (d.monitoringType || 'other').replace(/_/g, ' '), count: parseInt(d.count) }));

  const datasetByCategory = (datasets.byType || [])
    .filter(d => CATEGORY_LABELS[d.dataType])
    .map(d => ({
      name: CATEGORY_LABELS[d.dataType] || d.dataType,
      key: d.dataType,
      count: d.count,
      ha: d.publishedAreaHa || 0,
      totalHa: d.totalAreaHa || 0,
    }))
    .sort((a, b) => b.ha - a.ha);

  return (
    <div className="space-y-6 fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            {greeting()}, {user?.firstName || 'there'}
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchAll(true)} disabled={statsLoading || mapLoading} className="btn-secondary text-xs py-1.5 px-3">
            <RefreshCw size={12} className={(statsLoading || mapLoading) ? 'animate-spin' : ''} />
            {mapLoading ? 'Loading…' : datasetsLoading ? 'Loading datasets…' : 'Refresh'}
          </button>
          <Link to="/marine/new" className="btn-primary text-xs py-1.5 px-3"><Plus size={12} />New Entry</Link>
        </div>
      </div>

      {/* 6 Hero Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {heroCards.map((cfg, i) => <HeroCard key={cfg.label} {...cfg} loading={statsLoading} index={i} />)}
      </div>

      {/* Interactive Map */}
      <div className="card !p-0 overflow-hidden">
        <GlowingEffect spread={60} glow proximity={80} inactiveZone={0.01} borderWidth={2} disabled={false} />
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-3">
            <Layers size={13} className="text-gray-400" strokeWidth={1.75} />
            <h3 className="font-medium text-gray-700 text-sm tracking-tight">Spatial Overview</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {LAYER_CFG.map(({ key, label, icon: Icon, on, dot }) => (
              <button key={key} onClick={() => toggleLayer(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${layers[key] ? on : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${layers[key] ? 'bg-white' : dot}`} />
                {label}
                {key === 'datasets' && datasetsLoading && <RefreshCw size={10} className="animate-spin ml-0.5" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
            <Filter size={13} className="text-gray-400" />
            <select className="bg-transparent focus:outline-none border-0 text-sm text-gray-600" value={filters.province} onChange={e => setFilters(f => ({ ...f, province: e.target.value }))}>
              <option value="">All Provinces</option>
              {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
            </select>
            <div className="w-px h-4 bg-gray-200" />
            <select className="bg-transparent focus:outline-none border-0 text-sm text-gray-600" value={filters.areaType} onChange={e => setFilters(f => ({ ...f, areaType: e.target.value }))}>
              <option value="">All Types</option>
              <option value="lmma">LMMA</option>
              <option value="taboo_area">Taboo Area</option>
              <option value="patrol_zone">Patrol Zone</option>
              <option value="buffer_zone">Buffer Zone</option>
              <option value="spawning_aggregation">Spawning</option>
            </select>
          </div>
        </div>
        <div className="h-[260px] sm:h-[360px] lg:h-[460px] relative">
          {mapLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading map…</span>
              </div>
            </div>
          )}
          <CBFMMap
            surveys={layers.surveys ? mapSurveys : []}
            marineAreas={layers.marine ? marineAreas : null}
            monitoringPoints={layers.monitoring ? mapMonitor : []}
            datasetLayers={layers.datasets ? datasetLayers : []}
          />
        </div>
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center gap-4 flex-wrap text-xs text-gray-500">
          <span className="font-semibold text-gray-600 uppercase tracking-wide text-[10px]">Legend</span>
          {LEGEND_ITEMS.map(({ color, label, round }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 inline-block flex-shrink-0 ${round ? 'rounded-full' : 'rounded-sm'} ${color}`} />
              {label}
            </span>
          ))}
          {!datasetsLoading && datasetLayers.length > 0 && (
            <span className="ml-auto text-purple-600 font-medium">
              {datasetLayers.length} dataset layer{datasetLayers.length !== 1 ? 's' : ''} loaded
              {datasetsFailed > 0 && <span className="text-amber-500 ml-1">({datasetsFailed} need fixing)</span>}
            </span>
          )}
          {!mapLoading && !datasetsLoading && datasetsFailed > 0 && datasetLayers.length === 0 && (
            <Link to="/datasets" className="ml-auto flex items-center gap-1.5 text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-lg hover:bg-amber-100">
              <AlertTriangle size={11} />{datasetsFailed} dataset{datasetsFailed !== 1 ? 's' : ''} need fixing
            </Link>
          )}
          {datasetsLoading && <span className="ml-auto flex items-center gap-1.5 text-blue-500"><RefreshCw size={11} className="animate-spin" />Loading datasets…</span>}
        </div>
      </div>

      {/* Province Table */}
      <div className="card">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={13} className="text-gray-400 flex-shrink-0" strokeWidth={1.75} />
          <h3 className="font-medium text-gray-700 text-sm tracking-tight">Marine Conservation by Province</h3>
        </div>
        <ProvinceSummary data={mergedProvinceData} loading={statsLoading} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title="Marine Areas by Type" icon={Waves} loading={statsLoading} empty={!marineByType.length} emptyMsg="No marine areas recorded yet" color="#2563eb">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={marineByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                {marineByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} /><Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Coverage by Province (%)" icon={Waves} loading={statsLoading} empty={!marineByProvince.length} emptyMsg="No province data yet" color="#0d9488">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={marineByProvince} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13,148,136,0.06)' }} />
              <Bar dataKey="pct" name="Coverage %" radius={[4, 4, 0, 0]}>{marineByProvince.map((d, i) => <Cell key={i} fill={PROVINCE_COLORS[d.province] || CHART_COLORS[i]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Management Status" icon={ShieldCheck} loading={statsLoading} empty={!marineByStatus.length} emptyMsg="No status data yet" color="#10b981">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={marineByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                {marineByStatus.map(d => <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#6b7280'} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} /><Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title="Marine Areas by Province" icon={Waves} loading={statsLoading} empty={!marineCountByProvince.length} emptyMsg="No marine areas recorded yet" color="#2563eb">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={marineCountByProvince} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
              <Bar dataKey="count" name="Marine Areas" radius={[4, 4, 0, 0]}>{marineCountByProvince.map((d, i) => <Cell key={i} fill={PROVINCE_COLORS[d.province] || CHART_COLORS[i]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Community Surveys by Province" icon={ClipboardList} loading={statsLoading} empty={!surveysByProv.length} emptyMsg="No survey data yet" color="#7c3aed">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={surveysByProv} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
              <Bar dataKey="count" name="Surveys" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {monByType.length > 0 || statsLoading ? (
          <ChartCard title="Biological Monitoring by Type" icon={Microscope} loading={statsLoading} empty={!monByType.length} emptyMsg="No monitoring records yet" color="#0d9488">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monByType} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={140} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
                <Bar dataKey="count" name="Records" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <div className="card">
            <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
            <div className="flex items-center gap-2 mb-4">
              <Layers size={13} className="text-gray-400 flex-shrink-0" strokeWidth={1.75} />
              <h3 className="font-medium text-gray-700 text-sm tracking-tight">Platform Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Surveys',      value:surveys.total ?? 0,      sub:'community records'                     },
                { label:'Bio. Records', value:monitoring.total ?? 0,   sub:'monitoring entries'                    },
                { label:'Datasets',     value:datasets.total ?? 0,     sub:`${datasets.published ?? 0} published`  },
                { label:'Active Areas', value:marine.activeCount ?? 0, sub:'currently managed'                     },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded p-3 bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1.5">{label}</p>
                  {statsLoading
                    ? <div className="h-6 w-10 rounded bg-gray-200 animate-pulse" />
                    : <p className="text-xl font-bold text-gray-800">{value}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activity Trend — last 12 months */}
      <ChartCard
        title="Activity Trend — Last 12 Months"
        icon={TrendingUp}
        accent="#6366f1"
        loading={statsLoading}
        empty={monthlyActivity.every(m => m.surveys === 0 && m.monitoring === 0)}
        emptyMsg="No activity data yet"
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyActivity} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>}
            />
            <Line
              type="monotone"
              dataKey="surveys"
              name="Surveys"
              stroke="#334155"
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: '#334155', strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="monitoring"
              name="Bio. Monitoring"
              stroke="#2563eb"
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: '#2563eb', strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Dataset Coverage by Category */}
      <div className="card">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
        <div className="flex items-center gap-2 mb-4">
          <Layers size={13} className="text-gray-400 flex-shrink-0" strokeWidth={1.75} />
          <h3 className="font-medium text-gray-700 text-sm tracking-tight">Dataset Coverage by Category</h3>
        </div>
        {statsLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />)}</div>
        ) : datasetByCategory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Layers size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No published spatial datasets yet. Upload and publish data to see coverage.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {datasetByCategory.map(cat => {
              const maxHa = Math.max(...datasetByCategory.map(c => c.ha), 1);
              const pct = cat.ha > 0 ? (cat.ha / maxHa) * 100 : 0;
              const color = CATEGORY_COLORS[cat.key] || '#38bdf8';
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{cat.count} dataset{cat.count !== 1 ? 's' : ''}</span>
                      {cat.ha > 0
                        ? <span className="font-semibold" style={{ color }}>{cat.ha.toLocaleString(undefined, { maximumFractionDigits: 1 })} ha published</span>
                        : <span className="italic text-gray-400">no area data yet</span>}
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100">
                    <div className="h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color, opacity: cat.ha > 0 ? 1 : 0.25 }} />
                  </div>
                  {cat.totalHa > cat.ha && (
                    <p className="text-xs text-gray-400 mt-0.5">{(cat.totalHa - cat.ha).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha in draft / unpublished datasets</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] mb-2">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK.map(q => <QuickAction key={q.to} {...q} />)}
        </div>
      </div>

    </div>
  );
}
