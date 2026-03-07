import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSurveysForMap, getMarineGeoJSON, getMonitoringForMap, getPublishedGeoJSONDatasets, getDatasetGeoJSON } from '../utils/firestore';
import CBFMMap from '../components/Map/CBFMMap';
import { VANUATU_PROVINCES, AREA_TYPES } from '../utils/constants';
import { Layers, Filter, RefreshCw, Users, Anchor, Activity, Database, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const LAYER_CONFIG = [
  { key: 'surveys', label: 'Community Surveys', icon: Users, activeClass: 'bg-sky-500 text-white border-sky-500', dotClass: 'bg-sky-500' },
  { key: 'marine', label: 'Marine Areas', icon: Anchor, activeClass: 'bg-emerald-600 text-white border-emerald-600', dotClass: 'bg-emerald-500' },
  { key: 'monitoring', label: 'Bio. Monitoring', icon: Activity, activeClass: 'bg-orange-500 text-white border-orange-500', dotClass: 'bg-orange-500' },
  { key: 'datasets', label: 'Datasets', icon: Database, activeClass: 'bg-purple-600 text-white border-purple-600', dotClass: 'bg-purple-500' },
];

const LEGEND = [
  { color: 'bg-sky-400 ring-2 ring-sky-600',       label: 'Community Survey',                round: true  },
  { color: 'bg-sky-300 opacity-80',                label: 'Marine areas under spatial plan', round: false },
  { color: 'bg-violet-400 opacity-80',             label: 'Protected Marine areas',          round: false },
  { color: 'bg-emerald-400 opacity-80',            label: 'Areas under habitat restoration', round: false },
  { color: 'bg-orange-500 ring-2 ring-orange-700', label: 'Bio. Monitoring',                 round: true  },
];

export default function MapPage() {
  const [surveys, setSurveys] = useState([]);
  const [marineAreas, setMarineAreas] = useState(null);
  const [monitoring, setMonitoring] = useState([]);
  const [datasetLayers, setDatasetLayers] = useState([]);
  const [datasetsFailed, setDatasetsFailed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [layers, setLayers] = useState({ surveys: true, marine: true, monitoring: true, datasets: true });
  const [filters, setFilters] = useState({ province: '', areaType: '' });

  const fetchData = async () => {
    setLoading(true);
    setDatasetLayers([]);
    setDatasetsFailed(0);

    // Phase 1: Load base layers from Firestore (fast). Map appears immediately.
    let datasetMeta = [];
    try {
      const [surveyData, marineData, monData, meta] = await Promise.all([
        getSurveysForMap(),
        getMarineGeoJSON(filters),
        getMonitoringForMap(),
        getPublishedGeoJSONDatasets(),
      ]);
      setSurveys(surveyData);
      setMarineAreas(marineData);
      setMonitoring(monData);
      datasetMeta = meta;
    } catch (err) {
      console.error('Base data load error:', err);
      toast.error(`Map load error: ${err.message || 'unknown'}`, { duration: 6000 });
    } finally {
      setLoading(false);
    }

    // Phase 2: Load dataset GeoJSON in background (may be slow if fetching from Storage).
    if (datasetMeta.length === 0) return;
    setDatasetsLoading(true);
    try {
      const results = await Promise.allSettled(
        datasetMeta.map(d => getDatasetGeoJSON(d).then(geojson => (geojson ? { meta: d, geojson } : null)))
      );
      const loaded = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);
      const skipped = results.length - loaded.length;
      if (skipped > 0) {
        console.warn(`${skipped} dataset layer(s) could not be loaded — GeoJSON not cached in Firestore yet.`);
      }
      setDatasetLayers(loaded);
      setDatasetsFailed(skipped);
    } catch (err) {
      console.error('Dataset layer error:', err);
    } finally {
      setDatasetsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col gap-4 h-full fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interactive Map</h2>
          <p className="text-gray-400 text-sm">Vanuatu CBFM spatial data visualisation</p>
        </div>
        <button onClick={fetchData} disabled={loading || datasetsLoading}
          className="btn-secondary text-sm flex items-center gap-2 py-2">
          <RefreshCw size={14} className={(loading || datasetsLoading) ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : datasetsLoading ? 'Loading datasets...' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <Layers size={14} /> Layers
          </div>
          {LAYER_CONFIG.map(({ key, label, icon: Icon, activeClass, dotClass }) => (
            <button key={key} onClick={() => toggleLayer(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                ${layers[key] ? activeClass : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              <span className={`w-2 h-2 rounded-full transition-colors ${layers[key] ? 'bg-white' : dotClass}`} />
              {label}
              {key === 'datasets' && datasetsLoading && (
                <RefreshCw size={10} className="animate-spin ml-0.5" />
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <Filter size={14} className="text-gray-400 flex-shrink-0" />
          <select className="text-sm bg-transparent focus:outline-none text-gray-600 border-0"
            value={filters.province} onChange={e => setFilters(f => ({ ...f, province: e.target.value }))}>
            <option value="">All Provinces</option>
            {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
          </select>
          <div className="w-px h-4 bg-gray-200" />
          <select className="text-sm bg-transparent focus:outline-none text-gray-600 border-0"
            value={filters.areaType} onChange={e => setFilters(f => ({ ...f, areaType: e.target.value }))}>
            <option value="">All Area Types</option>
            <option value="lmma">LMMA</option>
            <option value="taboo_area">Taboo Area</option>
            <option value="patrol_zone">Patrol Zone</option>
            <option value="buffer_zone">Buffer Zone</option>
            <option value="spawning_aggregation">Spawning</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 flex items-center gap-5 text-xs text-gray-500 flex-wrap">
        <span className="font-semibold text-gray-600 uppercase tracking-wide text-[10px]">Legend</span>
        {LEGEND.map(({ color, label, round }) => (
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
        {!loading && !datasetsLoading && datasetLayers.length === 0 && layers.datasets && datasetsFailed === 0 && (
          <span className="ml-auto text-gray-400">No published dataset layers</span>
        )}
        {!loading && !datasetsLoading && datasetsFailed > 0 && datasetLayers.length === 0 && (
          <Link to="/datasets" className="ml-auto flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-medium text-xs bg-amber-50 px-2 py-1 rounded-lg">
            <AlertTriangle size={12} />
            {datasetsFailed} dataset{datasetsFailed !== 1 ? 's' : ''} need fixing — go to Datasets
          </Link>
        )}
        {(loading || datasetsLoading) && (
          <span className="ml-auto flex items-center gap-1.5 text-ocean-500">
            <RefreshCw size={11} className="animate-spin" />
            {loading ? 'Loading map...' : 'Loading datasets...'}
          </span>
        )}
      </div>

      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 flex-1" style={{ minHeight: '420px', maxHeight: 'calc(100vh - 340px)' }}>
        <CBFMMap
          surveys={layers.surveys ? surveys : []}
          marineAreas={layers.marine ? marineAreas : null}
          monitoringPoints={layers.monitoring ? monitoring : []}
          datasetLayers={layers.datasets ? datasetLayers : []}
        />
      </div>
    </div>
  );
}
