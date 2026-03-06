import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getSurveyStats, getMarineStats, getMonitoringStats, getDatasetStats } from '../utils/firestore';
import {
  Users, Anchor, Activity, Database, Plus,
  MapPin, ArrowUpRight, RefreshCw, BarChart2,
} from 'lucide-react';
import { format } from 'date-fns';

/* ─────────────────────────────────────────────────────────────
   Palette
───────────────────────────────────────────────────────────── */
const CARDS = [
  {
    key: 'surveys', icon: Users, label: 'Community Surveys', subKey: null,
    accent: '#38bdf8',   // sky-400
    glow:   'rgba(56,189,248,0.20)',
    grad:   'linear-gradient(135deg, #0c2040 0%, #0f3260 100%)',
    border: '#38bdf8',
  },
  {
    key: 'marine', icon: Anchor, label: 'Marine Areas', subKey: 'totalAreaHa',
    accent: '#2dd4bf',   // teal-400
    glow:   'rgba(45,212,191,0.20)',
    grad:   'linear-gradient(135deg, #0c2040 0%, #0d3d3a 100%)',
    border: '#2dd4bf',
  },
  {
    key: 'monitoring', icon: Activity, label: 'Bio. Monitoring', subKey: 'avgCoral',
    accent: '#a78bfa',   // violet-400
    glow:   'rgba(167,139,250,0.20)',
    grad:   'linear-gradient(135deg, #0c2040 0%, #1e1547 100%)',
    border: '#a78bfa',
  },
  {
    key: 'datasets', icon: Database, label: 'Datasets', subKey: 'published',
    accent: '#d4a92a',   // gold
    glow:   'rgba(212,169,42,0.20)',
    grad:   'linear-gradient(135deg, #0c2040 0%, #2a1f00 100%)',
    border: '#d4a92a',
  },
];

const QUICK = [
  { label: 'New Survey',   to: '/surveys/new',     icon: Users,    accent: '#38bdf8', grad: 'linear-gradient(135deg,#0c2040,#0f3260)' },
  { label: 'Marine Area',  to: '/marine/new',      icon: Anchor,   accent: '#2dd4bf', grad: 'linear-gradient(135deg,#0c2040,#0d3d3a)' },
  { label: 'Bio. Record',  to: '/monitoring/new',  icon: Activity, accent: '#a78bfa', grad: 'linear-gradient(135deg,#0c2040,#1e1547)' },
  { label: 'Upload Data',  to: '/datasets/upload', icon: Database, accent: '#d4a92a', grad: 'linear-gradient(135deg,#0c2040,#2a1f00)' },
];

const CHART_COLORS = ['#38bdf8', '#2dd4bf', '#a78bfa', '#d4a92a', '#fb7185', '#34d399'];

/* ─────────────────────────────────────────────────────────────
   Animated count-up hook
───────────────────────────────────────────────────────────── */
function useCountUp(target, duration = 1000) {
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
      else setVal(Math.round(current));
    }, ms);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

/* ─────────────────────────────────────────────────────────────
   3-D tilt helper
───────────────────────────────────────────────────────────── */
function use3DTilt() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientY - r.top)  / r.height - 0.5) * -14;
    const y = ((e.clientX - r.left) / r.width  - 0.5) *  14;
    setTilt({ x, y });
  }, []);
  const onLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);
  const style = {
    transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(4px)`,
    transition: 'transform 0.18s ease',
  };
  return { onMove, onLeave, style };
}

/* ─────────────────────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────────────────────── */
function StatCard({ cfg, value, sub, loading, index }) {
  const { icon: Icon, label, accent, glow, grad, border } = cfg;
  const counted = useCountUp(loading ? 0 : (value ?? 0));
  const { onMove, onLeave, style } = use3DTilt();

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        ...style,
        background: grad,
        boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)`,
        animationDelay: `${index * 80}ms`,
      }}
      className="relative rounded-2xl p-5 text-white overflow-hidden stat-card-entrance cursor-default select-none"
    >
      {/* Coloured top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

      {/* Background glow blob */}
      <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full blur-2xl pointer-events-none"
        style={{ background: glow }} />

      {/* Icon */}
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `rgba(255,255,255,0.08)`, border: `1px solid ${accent}30` }}>
          <Icon size={19} style={{ color: accent }} />
        </div>
        <ArrowUpRight size={14} className="opacity-20 mt-1" />
      </div>

      {/* Label */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1 relative z-10"
        style={{ color: accent }}>
        {label}
      </p>

      {/* Number */}
      <div className="relative z-10">
        {loading ? (
          <div className="h-10 w-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.10)' }} />
        ) : (
          <p className="text-4xl font-bold leading-none tracking-tight text-white">
            {counted}
          </p>
        )}
        {sub && (
          <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {loading
              ? <span className="inline-block h-3 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.12)' }} />
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
function ChartCard({ title, icon: Icon, children, loading, empty, emptyMsg }) {
  return (
    <div className="card">
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
        <p key={i} style={{ color: p.fill || p.stroke }}>
          {p.name || 'Count'}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Quick Action Card
───────────────────────────────────────────────────────────── */
function QuickAction({ label, to, icon: Icon, accent, grad }) {
  const { onMove, onLeave, style } = use3DTilt();
  return (
    <Link
      to={to}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ ...style, background: grad, boxShadow: '0 6px 24px rgba(0,0,0,0.30)' }}
      className="group relative rounded-xl p-4 flex items-center justify-between overflow-hidden text-white"
    >
      {/* accent glow */}
      <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-30"
        style={{ background: accent }} />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
          <Icon size={17} style={{ color: accent }} />
        </div>
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <ArrowUpRight size={15} className="relative z-10 opacity-0 group-hover:opacity-60 transition-opacity duration-200 flex-shrink-0" />
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   Dashboard Page
───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [surveysByProvince, setSurveysByProvince] = useState([]);
  const [datasetsByType, setDatasetsByType] = useState([]);
  const [monitoringByType, setMonitoringByType] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [sv, mr, mo, ds] = await Promise.all([
        getSurveyStats(), getMarineStats(), getMonitoringStats(), getDatasetStats(),
      ]);
      setStats({
        surveys: sv.total, marine: mr.total, monitoring: mo.total, datasets: ds.total,
        totalAreaHa: mr.totalAreaHa, avgCoral: mo.avgCoralCover, published: ds.published,
      });
      setSurveysByProvince((sv.byProvince || []).map(i => ({
        province: (i.province || 'Unknown').substring(0, 6), count: parseInt(i.count),
      })));
      setDatasetsByType((ds.byType || []).map(i => ({
        name: (i.dataType || 'other').replace(/_/g, ' '), value: parseInt(i.count),
      })));
      setMonitoringByType((mo.byType || []).map(i => ({
        name: (i.monitoringType || 'other').replace(/_/g, ' '), count: parseInt(i.count),
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const cardSubs = [
    stats.surveys != null ? 'total records' : undefined,
    stats.totalAreaHa ? `${parseFloat(stats.totalAreaHa).toFixed(0)} ha protected` : 'protected zones',
    stats.avgCoral   ? `avg ${parseFloat(stats.avgCoral).toFixed(1)}% coral cover` : 'surveys logged',
    stats.published  ? `${stats.published} published` : 'uploaded files',
  ];
  const cardVals = [stats.surveys, stats.marine, stats.monitoring, stats.datasets];

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
          <Link to="/surveys/new" className="btn-primary text-sm py-2">
            <Plus size={13} />
            New Entry
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((cfg, i) => (
          <StatCard key={cfg.key} cfg={cfg} value={cardVals[i]} sub={cardSubs[i]} loading={loading} index={i} />
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Surveys by Province" icon={MapPin} loading={loading}
          empty={!surveysByProvince.length} emptyMsg="No survey data yet — add the first survey">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={surveysByProvince} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,32,64,0.04)' }} />
              <Bar dataKey="count" fill="#1a4470" radius={[6, 6, 0, 0]} name="Surveys" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Datasets by Type" icon={Database} loading={loading}
          empty={!datasetsByType.length} emptyMsg="No datasets uploaded yet">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={datasetsByType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={85} innerRadius={42} paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {datasetsByType.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {(loading || monitoringByType.length > 0) && (
        <ChartCard title="Biological Monitoring by Type" icon={Activity} loading={loading} empty={!monitoringByType.length}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monitoringByType} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={150} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,32,64,0.04)' }} />
              <Bar dataKey="count" fill="#2dd4bf" radius={[0, 6, 6, 0]} name="Records" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

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
