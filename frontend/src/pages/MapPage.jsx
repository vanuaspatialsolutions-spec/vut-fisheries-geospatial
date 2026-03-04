import { useEffect, useState } from 'react';
import api from '../utils/api';
import CBFMMap from '../components/Map/CBFMMap';
import { VANUATU_PROVINCES, AREA_TYPES } from '../utils/constants';
import { Layers, Filter } from 'lucide-react';

export default function MapPage() {
  const [surveys, setSurveys] = useState([]);
  const [marineAreas, setMarineAreas] = useState(null);
  const [monitoring, setMonitoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState({ surveys: true, marine: true, monitoring: true });
  const [filters, setFilters] = useState({ province: '', areaType: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.province) params.set('province', filters.province);
      if (filters.areaType) params.set('areaType', filters.areaType);

      const [surveyRes, marineRes, monRes] = await Promise.all([
        api.get('/surveys/map'),
        api.get(`/marine/geojson?${params}`),
        api.get('/monitoring/map'),
      ]);

      setSurveys(surveyRes.data.features || []);
      setMarineAreas(marineRes.data);
      setMonitoring(monRes.data.features || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interactive Map</h2>
          <p className="text-gray-500 text-sm">Vanuatu CBFM spatial data visualization</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {/* Layer toggles */}
        <div className="card flex items-center gap-4 py-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Layers size={16} />
            <span className="font-medium">Layers:</span>
          </div>
          {[
            { key: 'surveys', label: 'Community Surveys', color: 'bg-blue-500' },
            { key: 'marine', label: 'Marine Areas', color: 'bg-green-500' },
            { key: 'monitoring', label: 'Bio. Monitoring', color: 'bg-orange-500' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${layers[key] ? `${color} text-white border-transparent` : 'bg-white text-gray-500 border-gray-200'}`}
            >
              <span className={`w-2 h-2 rounded-full ${layers[key] ? 'bg-white' : color}`} />
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="card flex items-center gap-3 py-3">
          <Filter size={16} className="text-gray-500" />
          <select
            className="text-sm border-0 bg-transparent focus:outline-none text-gray-600"
            value={filters.province}
            onChange={e => setFilters(f => ({ ...f, province: e.target.value }))}
          >
            <option value="">All Provinces</option>
            {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select
            className="text-sm border-0 bg-transparent focus:outline-none text-gray-600"
            value={filters.areaType}
            onChange={e => setFilters(f => ({ ...f, areaType: e.target.value }))}
          >
            <option value="">All Area Types</option>
            <option value="lmma">LMMA</option>
            <option value="taboo_area">Taboo Area</option>
            <option value="patrol_zone">Patrol Zone</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="card py-3 flex items-center gap-6 text-xs text-gray-500 flex-wrap">
        <span className="font-medium text-gray-700">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 border-2 border-blue-600 inline-block" /> Community Survey</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-700 opacity-50 inline-block" /> LMMA</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-600 opacity-50 inline-block" /> Taboo Area</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-600 opacity-50 inline-block" /> Patrol Zone</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-700 inline-block" /> Bio. Monitoring</span>
        {loading && <span className="text-ocean-600 animate-pulse ml-auto">Updating...</span>}
      </div>

      {/* Map */}
      <div style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
        <CBFMMap
          surveys={layers.surveys ? surveys : []}
          marineAreas={layers.marine ? marineAreas : null}
          monitoringPoints={layers.monitoring ? monitoring : []}
        />
      </div>
    </div>
  );
}
