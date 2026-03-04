import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../utils/api';
import { Users, Anchor, Activity, Database, TrendingUp, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#0369a1', '#059669', '#ea580c', '#7c3aed', '#dc2626', '#ca8a04'];

function StatCard({ icon: Icon, label, value, sub, color = 'ocean' }) {
  const colors = {
    ocean: 'bg-ocean-50 text-ocean-700 border-ocean-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <div className={`card border ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-70">{label}</p>
          <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center shadow-sm">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({});
  const [surveysByProvince, setSurveysByProvince] = useState([]);
  const [datasetsByType, setDatasetsByType] = useState([]);
  const [monitoringByType, setMonitoringByType] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
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
        });

        setSurveysByProvince(
          (surveyStats.data.byProvince || []).map(item => ({
            province: item.province || 'Unknown',
            count: parseInt(item.count),
          }))
        );

        setDatasetsByType(
          (datasetStats.data.byType || []).map(item => ({
            name: item.dataType?.replace('_', ' ') || 'other',
            value: parseInt(item.count),
          }))
        );

        setMonitoringByType(
          (monitoringStats.data.byType || []).map(item => ({
            name: item.monitoringType?.replace(/_/g, ' ') || 'other',
            count: parseInt(item.count),
          }))
        );
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-ocean-600">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-ocean-200 border-t-ocean-600 rounded-full mx-auto mb-3" />
        Loading dashboard...
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Real-time CBFM overview – {format(new Date(), 'dd MMMM yyyy')}</p>
        </div>
        <Link to="/surveys/new" className="btn-primary flex items-center gap-2">
          <TrendingUp size={16} />
          New Entry
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Community Surveys" value={stats.surveys} sub="total records" color="ocean" />
        <StatCard icon={Anchor} label="Marine Areas" value={stats.marine}
          sub={stats.totalAreaHa ? `${parseFloat(stats.totalAreaHa).toFixed(0)} ha total` : 'total areas'} color="green" />
        <StatCard icon={Activity} label="Bio. Monitoring" value={stats.monitoring}
          sub={stats.avgCoral ? `avg ${parseFloat(stats.avgCoral).toFixed(1)}% coral cover` : 'total surveys'} color="orange" />
        <StatCard icon={Database} label="Datasets" value={stats.datasets} sub="uploaded files" color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surveys by province */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-ocean-600" />
            Surveys by Province
          </h3>
          {surveysByProvince.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={surveysByProvince}>
                <XAxis dataKey="province" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0369a1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No survey data yet
            </div>
          )}
        </div>

        {/* Datasets by type */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Database size={16} className="text-ocean-600" />
            Datasets by Type
          </h3>
          {datasetsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={datasetsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {datasetsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No datasets yet
            </div>
          )}
        </div>
      </div>

      {/* Monitoring chart */}
      {monitoringByType.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-ocean-600" />
            Biological Monitoring by Type
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monitoringByType} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'New Community Survey', to: '/surveys/new', color: 'bg-ocean-700' },
          { label: 'Record Marine Area', to: '/marine/new', color: 'bg-reef-600' },
          { label: 'Add Bio. Monitoring', to: '/monitoring/new', color: 'bg-coral-600' },
          { label: 'Upload Dataset', to: '/datasets/upload', color: 'bg-purple-700' },
        ].map(({ label, to, color }) => (
          <Link key={to} to={to} className={`${color} text-white rounded-xl p-4 text-sm font-medium text-center hover:opacity-90 transition-opacity`}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
