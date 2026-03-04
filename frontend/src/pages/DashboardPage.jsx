import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Anchor, Activity, Database, Plus,
  TrendingUp, MapPin, ArrowRight, RefreshCw,
  Waves, TreePine, BarChart2,
} from 'lucide-react';
import { format } from 'date-fns';

const CHART_COLORS = ['#0369a1', '#059669', '#ea580c', '#7c3aed', '#dc2626', '#ca8a04'];

const quickActions = [
  { label: 'New Survey', to: '/surveys/new', color: 'from-ocean-600 to-ocean-700', icon: Users },
  { label: 'Marine Area', to: '/marine/new', color: 'from-emerald-500 to-emerald-700', icon: Anchor },
  { label: 'Bio. Record', to: '/monitoring/new', color: 'from-orange-500 to-orange-600', icon: Activity },
  { label: 'Upload Data', to: '/datasets/upload', color: 'from-violet-600 to-violet-700', icon: Database },
];

function StatCard({ icon: Icon, label, value, sub, gradient, loading }) {
  return (
    <div className={`rounded-2xl shadow-md ${gradient} p-5 text-white relative overflow-hidden`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
      <div className="absolute -right-2 bottom-0 w-16 h-16 bg-white/5 rounded-full" />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{label}</p>
            {loading ? (
              <div className="h-9 w-16 bg-white/20 rounded animate-pulse mt-1.5" />
            ) : (
              <p className="text-4xl font-bold mt-1 count-up">{value ?? '—'}</p>
            )}
            {sub && (
              <p className="text-white/60 text-xs mt-1.5">
                {loading ? <span className="inline-block h-3 w-24 bg-white/20 rounded animate-pulse" /> : sub}
              </p>
            )}
          </div>
          <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children, loading, empty, emptyMsg }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-ocean-50 rounded-lg flex items-center justify-center">
          <Icon size={15} className="text-ocean-600" />
        </div>
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
        </div>
      ) : empty ? (
        <div className="h-48 flex flex-col items-center justify-center text-gray-300 gap-2">
          <BarChart2 size={32} />
          <p className="text-sm text-gray-400">{emptyMsg || 'No data yet'}</p>
        </div>
      ) : children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.stroke }} className="text-xs">
          {p.name || 'Count'}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

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
      const [surveyStats, marineStats, monitoringStats, datasetStats] = await Promise.all([
        api.get('/surveys/stats'),
        api.get('/marine/stats'),
        api.get('/monitoring/stats'),
        api.get('/datasets/stats'),
      ]);

      setStats({
        surveys: surveyStats.data.total,
        marine: marineStats.data.total,
        monitoring: monitoringStats.data.total,
        datasets: datasetStats.data.total,
        totalAreaHa: marineStats.data.totalAreaHa,
        avgCoral: monitoringStats.data.avgCoralCover,
        published: datasetStats.data.published,
      });

      setSurveysByProvince(
        (surveyStats.data.byProvince || []).map(item => ({
          province: (item.province || 'Unknown').substring(0, 6),
          count: parseInt(item.count),
        }))
      );

      setDatasetsByType(
        (datasetStats.data.byType || []).map(item => ({
          name: (item.dataType || 'other').replace(/_/g, ' '),
          value: parseInt(item.count),
        }))
      );

      setMonitoringByType(
        (monitoringStats.data.byType || []).map(item => ({
          name: (item.monitoringType || 'other').replace(/_/g, ' '),
          count: parseInt(item.count),
        }))
      );
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {greeting()}, {user?.firstName || 'there'} 👋
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} &mdash; Real-time CBFM overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/surveys/new" className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus size={14} />
            New Entry
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Community Surveys"
          value={stats.surveys}
          sub="total records"
          gradient="bg-gradient-to-br from-ocean-600 to-ocean-800"
          loading={loading}
        />
        <StatCard
          icon={Anchor}
          label="Marine Areas"
          value={stats.marine}
          sub={stats.totalAreaHa ? `${parseFloat(stats.totalAreaHa).toFixed(0)} ha protected` : 'protected zones'}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          loading={loading}
        />
        <StatCard
          icon={Activity}
          label="Bio. Monitoring"
          value={stats.monitoring}
          sub={stats.avgCoral ? `avg ${parseFloat(stats.avgCoral).toFixed(1)}% coral cover` : 'surveys logged'}
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          loading={loading}
        />
        <StatCard
          icon={Database}
          label="Datasets"
          value={stats.datasets}
          sub={stats.published ? `${stats.published} published` : 'uploaded files'}
          gradient="bg-gradient-to-br from-violet-600 to-violet-800"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Surveys by Province"
          icon={MapPin}
          loading={loading}
          empty={!surveysByProvince.length}
          emptyMsg="No survey data yet — add the first survey"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={surveysByProvince} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#0369a1" radius={[6, 6, 0, 0]} name="Surveys" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Datasets by Type"
          icon={Database}
          loading={loading}
          empty={!datasetsByType.length}
          emptyMsg="No datasets uploaded yet"
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={datasetsByType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {datasetsByType.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Monitoring chart */}
      {(loading || monitoringByType.length > 0) && (
        <ChartCard
          title="Biological Monitoring by Type"
          icon={Activity}
          loading={loading}
          empty={!monitoringByType.length}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monitoringByType} layout="vertical" barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={150} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#059669" radius={[0, 6, 6, 0]} name="Records" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ label, to, color, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`bg-gradient-to-br ${color} text-white rounded-xl p-4 flex items-center justify-between group hover:shadow-lg hover:scale-[1.02] transition-all duration-200`}
            >
              <div>
                <Icon size={18} className="mb-2 opacity-80" />
                <p className="text-sm font-semibold leading-tight">{label}</p>
              </div>
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-70 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-200" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
