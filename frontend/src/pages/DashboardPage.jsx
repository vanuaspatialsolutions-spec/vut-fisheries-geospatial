import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import api from '../utils/api';
import {
  ShieldCheck, Anchor, Users, Fish,
  Waves, Activity, CheckCircle, Database,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
  RefreshCw, MapPin, ChevronRight, Clock,
} from 'lucide-react';
import { format, isValid } from 'date-fns';

function SectionLabel({ label, desc }) {
  return (
    <div className="mb-3">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em]">{label}</h2>
      {desc && <p className="text-[11px] text-gray-300 mt-0.5">{desc}</p>}
    </div>
  );
}

function KPICard({ label, value, unit, sub, trend, trendDir, accent, icon: Icon, loading }) {
  const styles = {
    blue:  { border: 'border-l-ocean-600',   iconBg: 'bg-ocean-50',   iconText: 'text-ocean-700' },
    green: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-700' },
    amber: { border: 'border-l-amber-500',   iconBg: 'bg-amber-50',   iconText: 'text-amber-600' },
    red:   { border: 'border-l-red-500',     iconBg: 'bg-red-50',     iconText: 'text-red-600' },
  };
  const s = styles[accent] || styles.blue;
  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${s.border} rounded-lg p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none pr-2">{label}</p>
        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
          <Icon size={12} className={s.iconText} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-gray-100 animate-pulse rounded mb-2" />
      ) : (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{value ?? '—'}</span>
          {unit && <span className="text-sm text-gray-400 font-normal">{unit}</span>}
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400 leading-snug">{sub}</p>
        {trend && !loading && (
          <span className={`text-[11px] font-medium flex items-center gap-0.5 flex-shrink-0 ${
            trendDir === 'up' ? 'text-emerald-600' : trendDir === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {trendDir === 'up' ? <TrendingUp size={10} /> : trendDir === 'down' ? <TrendingDown size={10} /> : <Minus size={10} />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert }) {
  const s = {
    high:   { dot: 'bg-red-500',   tag: 'bg-red-50 text-red-700 border border-red-100' },
    medium: { dot: 'bg-amber-500', tag: 'bg-amber-50 text-amber-700 border border-amber-100' },
    low:    { dot: 'bg-sky-400',   tag: 'bg-sky-50 text-sky-700 border border-sky-100' },
  }[alert.severity] || { dot: 'bg-gray-400', tag: 'bg-gray-50 text-gray-600 border border-gray-200' };
  return (
    <div className="flex items-start gap-3 py-3 last:pb-0">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 w-[88px] text-center leading-5 ${s.tag}`}>
        {alert.category}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-snug">{alert.title}</p>
        {alert.detail && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{alert.detail}</p>}
      </div>
      <Link to={alert.link} className="flex-shrink-0 text-[11px] text-ocean-600 hover:text-ocean-800 font-semibold flex items-center gap-0.5 mt-0.5 whitespace-nowrap">
        View <ChevronRight size={11} />
      </Link>
    </div>
  );
}

const activityType = {
  survey:     { label: 'Survey',     cls: 'bg-ocean-50 text-ocean-700' },
  monitoring: { label: 'Monitoring', cls: 'bg-emerald-50 text-emerald-700' },
  dataset:    { label: 'Dataset',    cls: 'bg-violet-50 text-violet-700' },
};

function ActivityRow({ item }) {
  const t = activityType[item.type] || activityType.survey;
  const d = item.date ? new Date(item.date) : null;
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="py-2.5 pl-4 pr-3 whitespace-nowrap">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${t.cls}`}>{t.label}</span>
      </td>
      <td className="py-2.5 px-3 text-sm text-gray-800">{item.title}</td>
      <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">{item.province}</td>
      <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">{item.by}</td>
      <td className="py-2.5 pl-3 pr-4 text-xs text-gray-400 whitespace-nowrap text-right">
        <span className="flex items-center justify-end gap-1">
          <Clock size={10} />
          {d && isValid(d) ? format(d, 'd MMM yyyy') : '—'}
        </span>
      </td>
    </tr>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color }}>{p.name}: <strong>{p.value}{p.unit || ''}</strong></p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [provinceData, setProvinceData] = useState([]);

  const fetchAll = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/dashboard/stats');
      const d = res.data;
      setStats({
        protectedHa: d.marine.totalAreaHa,
        marineAreas: d.marine.total,
        activeLmmas: d.marine.activeLmmas,
        totalSurveys: d.surveys.total,
        fishers: d.surveys.totalFishers,
        provincesActive: d.surveys.byProvince.length,
        avgCoral: d.monitoring.avgCoralCover ? parseFloat(d.monitoring.avgCoralCover) : null,
        reefHealthAvg: d.monitoring.avgReefHealth ? parseFloat(d.monitoring.avgReefHealth) : null,
        monitoringTotal: d.monitoring.total,
        datasetsPublished: d.datasets.published,
        datasetsTotal: d.datasets.total,
      });
      setProvinceData(d.provinceMetrics || []);
      const generatedAlerts = [];
      if (d.monitoring.avgCoralCover && parseFloat(d.monitoring.avgCoralCover) < 30) {
        generatedAlerts.push({ id: 1, severity: 'high', category: 'Reef Health', title: `Critical avg coral cover: ${d.monitoring.avgCoralCover}%`, detail: 'Average coral cover is below the 30% intervention threshold.', link: '/monitoring' });
      }
      if (d.datasets.total > 0 && (d.datasets.total - d.datasets.published) > 0) {
        generatedAlerts.push({ id: 2, severity: 'medium', category: 'Data Review', title: `${d.datasets.total - d.datasets.published} dataset(s) pending review`, detail: 'Some datasets are awaiting approval before they are publicly available.', link: '/datasets' });
      }
      if (d.surveys.total === 0) {
        generatedAlerts.push({ id: 3, severity: 'low', category: 'Getting Started', title: 'No community surveys recorded yet', detail: 'Add your first community survey to track CBFM programme progress.', link: '/surveys' });
      }
      if (d.marine.total === 0) {
        generatedAlerts.push({ id: 4, severity: 'low', category: 'Getting Started', title: 'No marine areas registered yet', detail: 'Register LMMAs and other protected marine areas to track coverage.', link: '/marine' });
      }
      setAlerts(generatedAlerts);
      setActivity(d.recentActivity || []);
    } catch {
      setStats({});
      setAlerts([{ id: 0, severity: 'medium', category: 'Connection', title: 'Could not load dashboard data', detail: 'The server may be starting up (cold start). Please refresh in a moment.', link: '/dashboard' }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const criticalCount = alerts.filter(a => a.severity === 'high').length;
  const warningCount  = alerts.filter(a => a.severity === 'medium').length;
  const infoCount     = alerts.filter(a => a.severity === 'low').length;
  const coralAccent = !stats.avgCoral ? 'blue' : stats.avgCoral >= 50 ? 'green' : stats.avgCoral >= 30 ? 'amber' : 'red';
  const healthAccent = !stats.reefHealthAvg ? 'blue' : stats.reefHealthAvg >= 4 ? 'green' : stats.reefHealthAvg >= 3 ? 'amber' : 'red';

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">National CBFM Programme Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')} · Vanuatu Department of Fisheries</p>
        </div>
        <button onClick={() => fetchAll(true)} disabled={refreshing} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 flex-shrink-0">
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <section>
        <SectionLabel label="Programme Reach" desc="Coverage and enrollment across all provinces" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={ShieldCheck} label="Total Protected Area" value={stats.protectedHa ? stats.protectedHa.toLocaleString() : '0'} unit="ha" sub={`${stats.marineAreas ?? 0} registered marine areas`} accent="blue" loading={loading} />
          <KPICard icon={Anchor} label="Active LMMAs" value={stats.activeLmmas ?? 0} sub={`of ${stats.marineAreas ?? 0} total marine areas`} accent="blue" loading={loading} />
          <KPICard icon={Users} label="Community Surveys" value={stats.totalSurveys ?? 0} sub={`Across ${stats.provincesActive ?? 0} province(s)`} accent="blue" loading={loading} />
          <KPICard icon={Fish} label="Registered Fishers" value={stats.fishers ? stats.fishers.toLocaleString() : '0'} sub="Sum across all community surveys" accent="blue" loading={loading} />
        </div>
      </section>

      <section>
        <SectionLabel label="Programme Health" desc="Ecosystem status and compliance indicators" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={Waves} label="Avg Coral Cover" value={stats.avgCoral ? `${stats.avgCoral}%` : '—'} sub={stats.avgCoral ? 'Average across all monitored sites' : 'No monitoring data yet'} accent={coralAccent} loading={loading} />
          <KPICard icon={Activity} label="Mean Reef Health Score" value={stats.reefHealthAvg ? `${stats.reefHealthAvg}/5` : '—'} sub={stats.reefHealthAvg ? 'Average across all monitored sites' : 'No monitoring data yet'} accent={healthAccent} loading={loading} />
          <KPICard icon={CheckCircle} label="Monitoring Records" value={stats.monitoringTotal ?? 0} sub="Total biological monitoring entries" accent="blue" loading={loading} />
          <KPICard icon={Database} label="Datasets Published" value={stats.datasetsTotal ? `${stats.datasetsPublished ?? 0} / ${stats.datasetsTotal}` : '0'} sub={stats.datasetsTotal ? `${stats.datasetsPublished ?? 0} of ${stats.datasetsTotal} datasets` : 'No datasets uploaded yet'} accent="blue" loading={loading} />
        </div>
      </section>

      {(loading || alerts.length > 0) && (
        <section>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber-500" />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">System Status</span>
              </div>
              {!loading && (
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  {criticalCount > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{criticalCount} Critical</span>}
                  {warningCount > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{warningCount} Warning</span>}
                  {infoCount > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />{infoCount} Info</span>}
                </div>
              )}
            </div>
            <div className="px-5 divide-y divide-gray-50">
              {loading
                ? [1, 2].map(i => <div key={i} className="flex items-center gap-3 py-3"><div className="w-1.5 h-1.5 bg-gray-200 rounded-full animate-pulse" /><div className="h-4 w-full bg-gray-100 rounded animate-pulse" /></div>)
                : alerts.map(a => <AlertRow key={a.id} alert={a} />)}
            </div>
          </div>
        </section>
      )}

      {provinceData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Survey Coverage by Province</p>
            <p className="text-xs text-gray-300 mb-4">Number of community surveys on record</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={provinceData} layout="vertical" barSize={16} margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="province" tick={{ fontSize: 11, fill: '#6b7280' }} width={58} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="surveys" name="Surveys" fill="#0369a1" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {provinceData.some(p => p.avgCoralCover !== null) && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Reef Health — Coral Cover by Province</p>
              <p className="text-xs text-gray-300 mb-4">Live coral cover %</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={provinceData.filter(p => p.avgCoralCover !== null)} layout="vertical" barSize={16} margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="province" tick={{ fontSize: 11, fill: '#6b7280' }} width={58} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} formatter={v => [`${v}%`, 'Coral Cover']} />
                  <ReferenceLine x={30} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
                  <ReferenceLine x={50} stroke="#059669" strokeDasharray="4 2" strokeWidth={1} />
                  <Bar dataKey="avgCoralCover" name="Coral Cover" radius={[0, 3, 3, 0]}>
                    {provinceData.filter(p => p.avgCoralCover !== null).map((entry, i) => (
                      <Cell key={i} fill={entry.avgCoralCover >= 50 ? '#059669' : entry.avgCoralCover >= 30 ? '#d97706' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <section>
        <SectionLabel label="Recent Field Activity" desc="Latest surveys, monitoring records and data submissions" />
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {['Type', 'Activity', 'Province', 'Submitted by', 'Date'].map((h, i) => (
                  <th key={h} className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5 ${i === 0 ? 'pl-4 pr-3' : i === 4 ? 'pl-3 pr-4 text-right' : 'px-3'} text-left`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [1, 2, 3, 4].map(i => <tr key={i} className="border-b border-gray-50"><td colSpan={5} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                : activity.length > 0
                  ? activity.map((item, i) => <ActivityRow key={i} item={item} />)
                  : <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No activity yet — start by adding surveys or monitoring records.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
