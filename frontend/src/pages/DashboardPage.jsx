import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getSurveyStats, getMarineStats, getMonitoringStats, getDatasetStats } from '../utils/firestore';
import {
  Users, Anchor, Activity, Database, Plus, MapPin,
  ArrowUpRight, RefreshCw, BarChart2, Shield,
  Globe, Waves, TreePine, Fish,
} from 'lucide-react';
import { format } from 'date-fns';

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
// Vanuatu near-shore territorial sea: ~50,000 km² = 5,000,000 ha
const VANUATU_MARINE_HA = 5_000_000;

const CHART_COLORS = ['#38bdf8', '#2dd4bf', '#a78bfa', '#d4a92a', '#fb7185', '#34d399', '#f97316'];
const PROVINCE_COLORS = {
  Malampa: '#38bdf8', Penama: '#2dd4bf', Sanma: '#a78bfa',
  Shefa: '#d4a92a', Tafea: '#fb7185', Torba: '#34d399',
};

/* ─────────────────────────────────────────────────────────────
   Animated count-up
───────────────────────────────────────────────────────────── */
function useCountUp(target, duration = 1000, decimals = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target == null || target === 0) { setVal(0); return; }
    let current = 0;
    const steps = 50;
    const inc = target / steps;
    const ms = duration / steps;
    const t = setInterval(() => {
      current += inc;
      if (current >= target) { setVal(target); clearInterval(t); }
      else setVal(parseFloat(current.toFixed(decimals)));
    }, ms);
    return () => clearInterval(t);
  }, [target, duration, decimals]);
  return val;
}

/* ─────────────────────────────────────────────────────────────
   3-D tilt
───────────────────────────────────────────────────────────── */
function use3DTilt() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((e.clientY - r.top)  / r.height - 0.5) * -12,
      y: ((e.clientX - r.left) / r.width  - 0.5) *  12,
    });
  }, []);
  const onLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);
  const style = {
    transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(4px)`,
    transition: 'transform 0.18s ease',
  };
  return { onMove, onLeave, style };
}

/* ─────────────────────────────────────────────────────────────
   Hero Metric Card
───────────────────────────────────────────────────────────── */
function HeroCard({ icon: Icon, label, value, unit, sub, accent, glow, grad, loading, index, decimals = 0 }) {
  const counted = useCountUp(loading ? 0 : (typeof value === 'number' ? value : 0), 1000, decimals);
  const { onMove, onLeave, style } = use3DTilt();
  const display = decimals > 0 ? counted.toFixed(decimals) : counted;

  return (
    <div onMouseMove={onMove} onMouseLeave={onLeave}
      style={{
        ...style, background: grad,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
        animationDelay: `${index * 70}ms`,
      }}
      className="relative rounded-2xl p-5 text-white overflow-hidden stat-card-entrance cursor-default select-none">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
      <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full blur-2xl pointer-events-none"
        style={{ background: glow }} />

      <div className="relative z-10 flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${accent}30` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        <ArrowUpRight size={13} className="opacity-20 mt-1" />
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5 relative z-10"
        style={{ color: accent }}>{label}</p>

      <div className="relative z-10">
        {loading ? (
          <div className="h-9 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.10)' }} />
        ) : (
          <p className="text-3xl font-bold leading-none tracking-tight text-white">
            {display}{unit ? <span className="text-lg font-semibold ml-1 opacity-70">{unit}</span> : null}
          </p>
        )}
        {sub && (
          <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.50)' }}>
            {loading
              ? <span className="inline-block h-3 w-28 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.12)' }} />
              : sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Chart Card
───────────────────────────────────────────────────────────── */
function ChartCard({ title, icon: Icon, children, loading, empty, emptyMsg, className = '' }) {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(12,32,64,0.06)', border: '1px solid rgba(12,32,64,0.08)' }}>
          <Icon size={15} className="text-navy-700" />
        </div>
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-navy-100 border-t-navy-600 rounded-full animate-spin" />
        </div>
      ) : empty ? (
        <div className="h-52 flex flex-col items-center justify-center gap-2">
          <BarChart2 size={30} className="text-gray-200" />
          <p className="text-sm text-gray-400">{emptyMsg || 'No data yet'}</p>
        </div>
      ) : children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tooltip
───────────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-900 text-white rounded-xl border border-white/10 px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold mb-1 text-white/80">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.stroke || '#fff' }}>
          {p.name || 'Value'}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Province Summary Table
───────────────────────────────────────────────────────────── */
function ProvinceSummary({ data, loading }) {
  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(12,32,64,0.04)' }} />
      ))}
    </div>
  );

  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <MapPin size={28} className="text-gray-200" />
      <p className="text-sm text-gray-400">No provincial data yet — add marine areas to populate this table</p>
    </div>
  );

  const maxHa = Math.max(...data.map(d => d.totalHa), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['Province', 'Marine Areas', 'Coverage (ha)', 'Communities', 'Active', 'Coverage Bar'].map(h => (
              <th key={h} className={`py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide ${h === 'Province' ? 'text-left pr-4' : h === 'Coverage Bar' ? 'text-left pl-3' : 'text-center px-3'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...data].sort((a, b) => b.totalHa - a.totalHa).map((row, i) => {
            const pct = Math.round((row.totalHa / maxHa) * 100);
            const color = PROVINCE_COLORS[row.province] || '#6b7280';
            return (
              <tr key={row.province} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="font-medium text-gray-800">{row.province}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-semibold text-gray-700">{row.count}</td>
                <td className="py-3 px-3 text-center font-semibold text-gray-700">
                  {row.totalHa ? parseFloat(row.totalHa).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                </td>
                <td className="py-3 px-3 text-center text-gray-600">{row.communityCount}</td>
                <td className="py-3 px-3 text-center">
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${row.activeCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                    {row.activeCount}
                  </span>
                </td>
                <td className="py-3 pl-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Quick Action Card
───────────────────────────────────────────────────────────── */
function QuickAction({ label, to, icon: Icon, accent, grad }) {
  const { onMove, onLeave, style } = use3DTilt();
  return (
    <Link to={to} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ ...style, background: grad, boxShadow: '0 6px 24px rgba(0,0,0,0.30)' }}
      className="group relative rounded-xl p-4 flex items-center justify-between overflow-hidden text-white">
      <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-30"
        style={{ background: accent }} />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
          <Icon size={17} style={{ color: accent }} />
        </div>
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <ArrowUpRight size={15} className="relative z-10 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
    </Link>
  );
}

const QUICK = [
  { label: 'New Survey',   to: '/surveys/new',     icon: Users,    accent: '#38bdf8', grad: 'linear-gradient(135deg,#0c2040,#0f3260)' },
  { label: 'Marine Area',  to: '/marine/new',      icon: Anchor,   accent: '#2dd4bf', grad: 'linear-gradient(135deg,#0c2040,#0d3d3a)' },
  { label: 'Bio. Record',  to: '/monitoring/new',  icon: Activity, accent: '#a78bfa', grad: 'linear-gradient(135deg,#0c2040,#1e1547)' },
  { label: 'Upload Data',  to: '/datasets/upload', icon: Database, accent: '#d4a92a', grad: 'linear-gradient(135deg,#0c2040,#2a1f00)' },
];

const AREA_TYPE_LABEL = {
  lmma: 'LMMA', taboo_area: 'Taboo Area', patrol_zone: 'Patrol Zone',
  buffer_zone: 'Buffer Zone', spawning_aggregation: 'Spawning Site', other: 'Other',
};
const STATUS_COLORS = { Active: '#34d399', Inactive: '#fb7185', 'Under Review': '#d4a92a', Proposed: '#38bdf8' };

/* ─────────────────────────────────────────────────────────────
   Dashboard Page
───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [marine, setMarine] = useState({});
  const [surveys, setSurveys] = useState({});
  const [monitoring, setMonitoring] = useState({});
  const [datasets, setDatasets] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [mr, sv, mo, ds] = await Promise.all([
        getMarineStats(), getSurveyStats(), getMonitoringStats(), getDatasetStats(),
      ]);
      setMarine(mr);
      setSurveys(sv);
      setMonitoring(mo);
      setDatasets(ds);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  };

  const mpaPct = marine.protectedAreaHa
    ? parseFloat(((marine.protectedAreaHa / VANUATU_MARINE_HA) * 100).toFixed(3))
    : 0;

  const heroCards = [
    {
      icon: Anchor,   label: 'Marine Areas — Spatial Plan',
      value: marine.total ?? 0,
      sub: 'total managed marine zones',
      accent: '#38bdf8', glow: 'rgba(56,189,248,0.20)',
      grad: 'linear-gradient(135deg,#0c2040,#0f3260)',
    },
    {
      icon: Waves,    label: 'Total Spatial Coverage',
      value: marine.totalAreaHa ? parseFloat(marine.totalAreaHa.toFixed(1)) : 0,
      unit: 'ha',
      sub: 'hectares under spatial plan',
      accent: '#2dd4bf', glow: 'rgba(45,212,191,0.20)',
      grad: 'linear-gradient(135deg,#0c2040,#0d3d3a)',
      decimals: 1,
    },
    {
      icon: Shield,   label: 'Marine Areas Protected',
      value: marine.protectedCount ?? 0,
      sub: `${marine.protectedAreaHa ? Math.round(marine.protectedAreaHa).toLocaleString() : 0} ha protected`,
      accent: '#a78bfa', glow: 'rgba(167,139,250,0.20)',
      grad: 'linear-gradient(135deg,#0c2040,#1e1547)',
    },
    {
      icon: Globe,    label: '% MPA of Vanuatu Waters',
      value: mpaPct,
      unit: '%',
      sub: 'of ~50,000 km² territorial sea',
      accent: '#d4a92a', glow: 'rgba(212,169,42,0.20)',
      grad: 'linear-gradient(135deg,#0c2040,#2a1f00)',
      decimals: 3,
    },
    {
      icon: Users,    label: 'Communities in Conservation',
      value: Math.max(marine.communityCount ?? 0, surveys.communityCount ?? 0),
      sub: 'unique communities engaged',
      accent: '#fb7185', glow: 'rgba(251,113,133,0.20)',
      grad: 'linear-gradient(135deg,#0c2040,#3a0c1a)',
    },
    {
      icon: TreePine, label: 'Habitat Restoration Areas',
      value: marine.restorationAreaHa ? parseFloat(marine.restorationAreaHa.toFixed(1)) : 0,
      unit: 'ha',
      sub: 'mangrove & seagrass habitats',
      accent: '#34d399', glow: 'rgba(52,211,153,0.20)',
      grad: 'linear-gradient(135deg,#0c2040,#063b2a)',
      decimals: 1,
    },
  ];

  const marineByType = (marine.byType || []).map(d => ({
    name: AREA_TYPE_LABEL[d.areaType] || d.areaType,
    value: d.count, ha: parseFloat((d.totalHa || 0).toFixed(1)),
  }));
  const marineByProvince = (marine.byProvince || []).map(d => ({
    province: d.province.substring(0, 7),
    ha: parseFloat((d.totalHa || 0).toFixed(1)),
  }));
  const marineByStatus = (marine.byStatus || []).map(d => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1).replace(/_/g, ' '),
    value: d.count,
  }));
  const surveysByProvince = (surveys.byProvince || []).map(d => ({
    province: (d.province || 'Unknown').substring(0, 7),
    count: parseInt(d.count),
  }));
  const monitoringByType = (monitoring.byType || []).map(d => ({
    name: (d.monitoringType || 'other').replace(/_/g, ' '),
    count: parseInt(d.count),
  }));

  return (
    <div className="space-y-6 fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {greeting()}, {user?.firstName || 'there'} 👋
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} &mdash; Real-time CBFM overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchAll(true)} disabled={refreshing} className="btn-secondary text-sm py-2">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/marine/new" className="btn-primary text-sm py-2">
            <Plus size={13} />
            New Entry
          </Link>
        </div>
      </div>

      {/* ── 6 Marine Conservation Hero Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {heroCards.map((cfg, i) => (
          <HeroCard key={cfg.label} {...cfg} loading={loading} index={i} />
        ))}
      </div>

      {/* ── Province Summary Table ── */}
      <div className="card">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(12,32,64,0.06)', border: '1px solid rgba(12,32,64,0.08)' }}>
            <MapPin size={15} className="text-navy-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Marine Conservation by Province</h3>
            <p className="text-xs text-gray-400 mt-0.5">Coverage, communities and active areas per province</p>
          </div>
        </div>
        <ProvinceSummary data={marine.byProvince || []} loading={loading} />
      </div>

      {/* ── Charts Row 1: Marine breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <ChartCard title="Marine Areas by Type" icon={Anchor} loading={loading}
          empty={!marineByType.length} emptyMsg="No marine areas recorded yet">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={marineByType} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                {marineByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8}
                formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Coverage by Province (ha)" icon={Waves} loading={loading}
          empty={!marineByProvince.length} emptyMsg="No province data yet">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={marineByProvince} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,32,64,0.04)' }} />
              <Bar dataKey="ha" name="Hectares" radius={[5, 5, 0, 0]}>
                {marineByProvince.map((d, i) => (
                  <Cell key={i} fill={PROVINCE_COLORS[d.province] || CHART_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Management Status" icon={Shield} loading={loading}
          empty={!marineByStatus.length} emptyMsg="No status data yet">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={marineByStatus} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                {marineByStatus.map(d => (
                  <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8}
                formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Row 2: Surveys & Monitoring ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <ChartCard title="Community Surveys by Province" icon={Users} loading={loading}
          empty={!surveysByProvince.length} emptyMsg="No survey data yet — add the first survey">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={surveysByProvince} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,32,64,0.04)' }} />
              <Bar dataKey="count" name="Surveys" fill="#1a4470" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {monitoringByType.length > 0 || loading ? (
          <ChartCard title="Biological Monitoring by Type" icon={Activity} loading={loading}
            empty={!monitoringByType.length} emptyMsg="No monitoring records yet">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monitoringByType} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={140} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,32,64,0.04)' }} />
                <Bar dataKey="count" name="Records" fill="#2dd4bf" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          /* Secondary platform stats when no monitoring data */
          <div className="card">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(12,32,64,0.06)', border: '1px solid rgba(12,32,64,0.08)' }}>
                <Database size={15} className="text-navy-700" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Platform Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Surveys', value: surveys.total ?? 0, sub: 'community records', icon: Users, color: '#38bdf8' },
                { label: 'Bio. Records', value: monitoring.total ?? 0, sub: 'monitoring entries', icon: Activity, color: '#a78bfa' },
                { label: 'Datasets', value: datasets.total ?? 0, sub: `${datasets.published ?? 0} published`, icon: Database, color: '#d4a92a' },
                { label: 'Active Areas', value: marine.activeCount ?? 0, sub: 'currently managed', icon: Fish, color: '#34d399' },
              ].map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="rounded-xl p-4"
                  style={{ background: 'rgba(12,32,64,0.03)', border: '1px solid rgba(12,32,64,0.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} style={{ color }} />
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
                  </div>
                  {loading
                    ? <div className="h-7 w-12 rounded animate-pulse" style={{ background: 'rgba(12,32,64,0.08)' }} />
                    : <p className="text-2xl font-bold text-gray-800">{value}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.14em] mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK.map(q => <QuickAction key={q.to} {...q} />)}
        </div>
      </div>

    </div>
  );
}
