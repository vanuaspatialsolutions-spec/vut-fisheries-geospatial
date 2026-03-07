/**
 * FormSidebar — shown alongside data-entry forms.
 * Displays summary stats + a mini-map of existing records for the given type.
 * type: 'survey' | 'marine' | 'monitoring'
 */
import { useEffect, useState } from 'react';
import { getSurveyStats, getMarineStats, getMonitoringStats,
         getSurveysForMap, getMarineGeoJSON, getMonitoringForMap } from '../utils/firestore';
import CBFMMap from './Map/CBFMMap';

function fmtNum(n, decimals = 0) {
  if (n === null || n === undefined) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function StatCard({ label, value, unit, color }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
      style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.08)' }}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-bold" style={{ color: color || '#1d4ed8' }}>
        {value}{unit && <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

export default function FormSidebar({ type }) {
  const [stats, setStats] = useState(null);
  const [mapSurveys, setMapSurveys] = useState([]);
  const [marineAreas, setMarineAreas] = useState(null);
  const [mapMonitor, setMapMonitor] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const promises = [];
    if (type === 'survey') {
      promises.push(getSurveyStats().then(s => setStats(s)));
      promises.push(getSurveysForMap().then(s => setMapSurveys(s)));
    } else if (type === 'marine') {
      promises.push(getMarineStats().then(s => setStats(s)));
      promises.push(getMarineGeoJSON().then(g => setMarineAreas(g)));
    } else if (type === 'monitoring') {
      promises.push(getMonitoringStats().then(s => setStats(s)));
      promises.push(getMonitoringForMap().then(m => setMapMonitor(m)));
    }
    Promise.allSettled(promises).finally(() => setLoading(false));
  }, [type]);

  const statCards = (() => {
    if (!stats) return [];
    if (type === 'survey') return [
      { label: 'Total Surveys',       value: fmtNum(stats.total),           color: '#0369a1' },
      { label: 'Communities',         value: fmtNum(stats.communityCount),  color: '#059669' },
      { label: 'Provinces covered',   value: fmtNum(stats.byProvince?.length), color: '#7c3aed' },
    ];
    if (type === 'marine') return [
      { label: 'Marine Areas',        value: fmtNum(stats.total),           color: '#0369a1' },
      { label: 'Total Coverage',      value: fmtNum(stats.totalAreaHa, 1),  unit: 'ha', color: '#0891b2' },
      { label: 'Areas Protected',     value: fmtNum(stats.protectedCount),  color: '#7c3aed' },
    ];
    if (type === 'monitoring') return [
      { label: 'Total Records',       value: fmtNum(stats.total),                                             color: '#0369a1' },
      { label: 'Monitoring Types',    value: fmtNum(stats.byType?.length),                                    color: '#059669' },
      { label: 'Avg Coral Cover',     value: stats.avgCoralCover != null ? fmtNum(stats.avgCoralCover, 1) : '—', unit: stats.avgCoralCover != null ? '%' : undefined, color: '#7c3aed' },
    ];
    return [];
  })();

  const titles = {
    survey:     { heading: 'Survey Overview',     sub: 'Existing community surveys' },
    marine:     { heading: 'Marine Areas',        sub: 'Registered spatial areas' },
    monitoring: { heading: 'Monitoring Overview', sub: 'Biological monitoring records' },
  };
  const { heading, sub } = titles[type] || {};

  return (
    <div className="space-y-4 sticky top-6">
      {/* Header */}
      <div className="card py-4">
        <h3 className="font-semibold text-gray-800 text-sm">{heading}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>

        {/* Stat cards */}
        <div className="mt-3 space-y-2">
          {loading
            ? [1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-xl animate-pulse"
                  style={{ background: 'rgba(12,32,64,0.05)' }} />
              ))
            : statCards.map(s => <StatCard key={s.label} {...s} />)
          }
        </div>
      </div>

      {/* Mini-map */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Map</p>
        </div>
        <div style={{ height: 280 }}>
          {loading
            ? <div className="w-full h-full animate-pulse" style={{ background: 'rgba(12,32,64,0.05)' }} />
            : <CBFMMap
                surveys={type === 'survey' ? mapSurveys : []}
                marineAreas={type === 'marine' ? marineAreas : null}
                monitoringPoints={type === 'monitoring' ? mapMonitor : []}
                datasetLayers={[]}
              />
          }
        </div>
      </div>
    </div>
  );
}
