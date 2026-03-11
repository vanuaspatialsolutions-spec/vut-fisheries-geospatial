import { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON as GeoJSONLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import {
  getDatasets, publishDataset, unpublishDataset, submitDatasetForReview,
  deleteDataset, recacheDatasetGeoJSON, getDatasetById, getDatasetGeoJSON,
  updateDatasetGeoJSON,
} from '../utils/firestore';
import toast from 'react-hot-toast';
import {
  Upload, Download, CheckCircle, Clock, Archive, Search, Trash2, Wrench, MapPin,
  Eye, X, Map as MapIcon, Table2, Pencil, Plus, Save,
} from 'lucide-react';
import { DATA_TYPES, VANUATU_PROVINCES, VANUATU_CENTER, VANUATU_ZOOM } from '../utils/constants';

function StatusBadge({ status }) {
  const map = {
    published: <span className="badge-published">Published</span>,
    draft: <span className="badge-draft">Draft</span>,
    under_review: <span className="badge-review">Under Review</span>,
    archived: <span className="badge-archived">Archived</span>,
  };
  return map[status] || <span className="badge bg-gray-100 text-gray-600">{status}</span>;
}

// All formats that produce a map layer — GeoJSON natively; others via conversion.
const MAP_FORMATS = ['geojson', 'json', 'zip', 'kml', 'gpkg', 'shp'];

const CATEGORY_COLOR = {
  marine_spatial_plan: '#38bdf8',
  protected_marine:    '#a78bfa',
  habitat_restoration: '#34d399',
};

// Returns true for map-eligible datasets that don't yet have inline Firestore data.
function needsGeojsonCache(d) {
  return MAP_FORMATS.includes(d.fileFormat?.toLowerCase()) && !d.hasGeojsonData;
}

// Human-readable label for the "needs conversion" badge on non-GeoJSON formats.
function conversionLabel(fmt) {
  const labels = { zip: 'Shapefile — needs conversion', kml: 'KML — needs conversion', gpkg: 'GeoPackage — needs conversion', shp: 'Shapefile — needs conversion' };
  return labels[fmt?.toLowerCase()] || 'Needs map conversion';
}

// ── Map helper: auto-fit bounds to the loaded GeoJSON ───────────────────────
function FitBounds({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    try {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    } catch { /* ignore invalid geometry */ }
  }, [geojson, map]);
  return null;
}

// ── Dataset preview modal (map + attribute table) ───────────────────────────
const TABLE_ROW_LIMIT = 500;

function DatasetPreviewModal({ dataset, onClose }) {
  const { isAdmin } = useAuth();
  const [geojson, setGeojson] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [tab, setTab] = useState('map');

  // ── Edit-mode state ──────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editFeatures, setEditFeatures] = useState([]);
  const [editKeys, setEditKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [renamingCol, setRenamingCol] = useState(null); // key being renamed
  const [renameVal, setRenameVal] = useState('');
  const [newColName, setNewColName] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);
  const newColInputRef = useRef(null);

  useEffect(() => {
    setLoadingPreview(true);
    getDatasetById(dataset.id)
      .then(fullDoc => getDatasetGeoJSON(fullDoc || dataset))
      .then(g => setGeojson(g))
      .catch(() => setGeojson(null))
      .finally(() => setLoadingPreview(false));
  }, [dataset]);

  const features = geojson?.features || [];

  const propKeys = useMemo(() => {
    const keys = new Set();
    features.forEach(f => Object.keys(f.properties || {}).forEach(k => keys.add(k)));
    return [...keys];
  }, [features]);

  const color = CATEGORY_COLOR[dataset.dataType] || '#38bdf8';
  const layerStyle = { color, weight: 1.5, fillColor: color, fillOpacity: 0.2 };
  const displayedRows = features.slice(0, TABLE_ROW_LIMIT);

  // ── Edit helpers ─────────────────────────────────────────────────────────
  const enterEditMode = () => {
    setEditFeatures(features.map(f => ({ ...f, properties: { ...(f.properties || {}) } })));
    setEditKeys([...propKeys]);
    setEditMode(true);
    setShowAddCol(false);
    setRenamingCol(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setShowAddCol(false);
    setRenamingCol(null);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      // Rebuild features with only the current editKeys (drops deleted columns)
      const newGeojson = {
        ...geojson,
        features: editFeatures.map(f => ({
          ...f,
          properties: Object.fromEntries(editKeys.map(k => [k, f.properties?.[k] ?? ''])),
        })),
      };
      await updateDatasetGeoJSON(dataset.id, newGeojson);
      setGeojson(newGeojson);
      setEditMode(false);
      toast.success('Attribute table saved.');
    } catch (err) {
      toast.error('Save failed: ' + (err.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const updateCell = (rowIdx, key, value) => {
    setEditFeatures(prev =>
      prev.map((f, i) =>
        i === rowIdx ? { ...f, properties: { ...f.properties, [key]: value } } : f
      )
    );
  };

  const deleteRow = (idx) => setEditFeatures(prev => prev.filter((_, i) => i !== idx));

  const addRow = () => {
    const emptyProps = Object.fromEntries(editKeys.map(k => [k, '']));
    setEditFeatures(prev => [...prev, { type: 'Feature', geometry: null, properties: emptyProps }]);
  };

  const deleteColumn = (key) => {
    if (!window.confirm(`Delete column "${key}"? This cannot be undone.`)) return;
    setEditKeys(prev => prev.filter(k => k !== key));
  };

  const addColumn = () => {
    const name = newColName.trim();
    if (!name) return;
    if (editKeys.includes(name)) { toast.error(`Column "${name}" already exists.`); return; }
    setEditKeys(prev => [...prev, name]);
    setEditFeatures(prev => prev.map(f => ({ ...f, properties: { ...f.properties, [name]: '' } })));
    setNewColName('');
    setShowAddCol(false);
  };

  const startRenameCol = (key) => { setRenamingCol(key); setRenameVal(key); };

  const commitRenameCol = (oldKey) => {
    const newKey = renameVal.trim();
    setRenamingCol(null);
    if (!newKey || newKey === oldKey) return;
    if (editKeys.includes(newKey)) { toast.error(`Column "${newKey}" already exists.`); return; }
    setEditKeys(prev => prev.map(k => k === oldKey ? newKey : k));
    setEditFeatures(prev => prev.map(f => {
      const props = { ...f.properties };
      props[newKey] = props[oldKey] ?? '';
      delete props[oldKey];
      return { ...f, properties: props };
    }));
  };

  // Focus add-column input when it appears
  useEffect(() => {
    if (showAddCol) setTimeout(() => newColInputRef.current?.focus(), 50);
  }, [showAddCol]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget && !editMode) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0 mr-4">
            <h2 className="font-semibold text-gray-900 truncate">{dataset.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loadingPreview ? 'Loading…' : `${(editMode ? editFeatures : features).length.toLocaleString()} feature${features.length !== 1 ? 's' : ''}`}
              {dataset.calculatedAreaHa > 0 && ` · ${Number(dataset.calculatedAreaHa).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha`}
              {dataset.province && ` · ${dataset.province}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => { if (editMode) cancelEdit(); setTab('map'); }}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${tab === 'map' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <MapIcon size={13} /> Map
              </button>
              <button
                onClick={() => setTab('table')}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${tab === 'table' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Table2 size={13} /> Attributes
                {!loadingPreview && features.length > 0 && (
                  <span className="text-[10px] bg-gray-200 text-gray-600 rounded px-1.5 py-0.5 font-medium">
                    {features.length.toLocaleString()}
                  </span>
                )}
              </button>
            </div>
            <button onClick={() => { if (!editMode) onClose(); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Close">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loadingPreview ? (
          <div className="flex-1 flex items-center justify-center gap-3 text-gray-400 py-20">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            Loading dataset…
          </div>
        ) : !geojson ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20 gap-2">
            <MapPin size={32} className="opacity-30" />
            <p className="text-sm">Unable to load dataset preview.</p>
            <p className="text-xs text-gray-300">The file may not be cached — try publishing or fixing the map layer first.</p>
          </div>
        ) : tab === 'map' ? (
          <div className="flex-1 min-h-0 h-[260px] sm:h-[380px] md:h-[520px]">
            <MapContainer
              center={VANUATU_CENTER}
              zoom={VANUATU_ZOOM}
              scrollWheelZoom
              style={{ width: '100%', height: '100%' }}
              className="rounded-b-xl"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <GeoJSONLayer
                key={dataset.id}
                data={geojson}
                style={() => layerStyle}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties || {};
                  const entries = Object.entries(props).slice(0, 12);
                  if (!entries.length) return;
                  const rows = entries
                    .map(([k, v]) => `<tr><td class="pr-3 font-medium text-gray-500 align-top whitespace-nowrap">${k}</td><td class="text-gray-700 max-w-xs break-words">${v ?? ''}</td></tr>`)
                    .join('');
                  layer.bindPopup(`<table class="text-xs border-collapse">${rows}</table>`, { maxWidth: 320 });
                }}
              />
              <FitBounds geojson={geojson} />
            </MapContainer>
          </div>
        ) : (
          /* Attribute table */
          <div className="flex flex-col flex-1 min-h-0">

            {/* Table toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0 bg-gray-50/60">
              {editMode ? (
                <>
                  <span className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Editing — {editFeatures.length} rows · {editKeys.length} columns
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <Save size={11} />
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-400">
                    {features.length > TABLE_ROW_LIMIT
                      ? `Showing first ${TABLE_ROW_LIMIT.toLocaleString()} of ${features.length.toLocaleString()} features`
                      : `${features.length.toLocaleString()} feature${features.length !== 1 ? 's' : ''} · ${propKeys.length} column${propKeys.length !== 1 ? 's' : ''}`}
                  </span>
                  {isAdmin && !loadingPreview && geojson && (
                    <button
                      onClick={enterEditMode}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                    >
                      <Pencil size={11} /> Edit attributes
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {(editMode ? editKeys : propKeys).length === 0 && !editMode ? (
                <p className="text-center text-gray-400 py-12 text-sm">No attributes found in this dataset.</p>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr>
                      <th className="border-b border-gray-200 px-3 py-2 text-left text-gray-400 font-semibold w-10">#</th>
                      {(editMode ? editKeys : propKeys).map(k => (
                        <th key={k} className="border-b border-gray-200 px-2 py-2 text-left text-gray-500 font-semibold whitespace-nowrap group">
                          {editMode ? (
                            <div className="flex items-center gap-1 min-w-[80px]">
                              {renamingCol === k ? (
                                <input
                                  className="border border-blue-400 rounded px-1 py-0.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  value={renameVal}
                                  autoFocus
                                  onChange={e => setRenameVal(e.target.value)}
                                  onBlur={() => commitRenameCol(k)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') commitRenameCol(k);
                                    if (e.key === 'Escape') setRenamingCol(null);
                                  }}
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:text-blue-600 flex-1 truncate"
                                  title="Double-click to rename"
                                  onDoubleClick={() => startRenameCol(k)}
                                >
                                  {k}
                                </span>
                              )}
                              <button
                                onClick={() => deleteColumn(k)}
                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-all"
                                title={`Delete column "${k}"`}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ) : k}
                        </th>
                      ))}
                      {editMode && (
                        <th className="border-b border-gray-200 px-2 py-2 w-8">
                          {showAddCol ? (
                            <div className="flex items-center gap-1">
                              <input
                                ref={newColInputRef}
                                className="border border-blue-400 rounded px-1.5 py-0.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                placeholder="Column name…"
                                value={newColName}
                                onChange={e => setNewColName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') addColumn();
                                  if (e.key === 'Escape') { setShowAddCol(false); setNewColName(''); }
                                }}
                              />
                              <button onClick={addColumn} className="p-0.5 rounded bg-gray-900 text-white hover:bg-gray-700" title="Add">
                                <Plus size={10} />
                              </button>
                              <button onClick={() => { setShowAddCol(false); setNewColName(''); }} className="p-0.5 rounded hover:bg-gray-100 text-gray-400">
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowAddCol(true)}
                              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 whitespace-nowrap px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
                              title="Add column"
                            >
                              <Plus size={11} /> Col
                            </button>
                          )}
                        </th>
                      )}
                      {editMode && <th className="border-b border-gray-200 w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {(editMode ? editFeatures : displayedRows).map((f, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${editMode ? 'hover:bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-1.5 text-gray-300 select-none">{i + 1}</td>
                        {(editMode ? editKeys : propKeys).map(k => (
                          <td key={k} className="px-2 py-1 max-w-[200px]">
                            {editMode ? (
                              <input
                                className="w-full min-w-[60px] border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1.5 py-0.5 text-gray-700 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors"
                                value={f.properties?.[k] ?? ''}
                                onChange={e => updateCell(i, k, e.target.value)}
                              />
                            ) : (
                              <span className="block truncate text-gray-700" title={f.properties?.[k] != null ? String(f.properties[k]) : ''}>
                                {f.properties?.[k] != null ? String(f.properties[k]) : <span className="text-gray-300">—</span>}
                              </span>
                            )}
                          </td>
                        ))}
                        {editMode && <td />}
                        {editMode && (
                          <td className="px-1 py-1 text-center">
                            <button
                              onClick={() => deleteRow(i)}
                              className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 size={11} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Add row footer */}
            {editMode && (
              <div className="border-t border-gray-100 px-4 py-2 flex-shrink-0 bg-gray-50/40">
                <button
                  onClick={addRow}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Add row
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DatasetsPage() {
  const { isStaff } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ status: '', dataType: '', province: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null); // dataset id currently being published/fixed
  const [previewDataset, setPreviewDataset] = useState(null);

  // One shared file-input element; mode ref tells the handler what to do.
  const fileInputRef = useRef(null);
  const actionRef = useRef(null); // { dataset, mode: 'fix' | 'publish' }

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const res = await getDatasets(filters);
      setDatasets(res.datasets);
      setPagination(res.pagination);
    } catch { toast.error('Failed to load datasets.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDatasets(); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── shared file-picker handler ──────────────────────────────────────────
  const openFilePicker = (dataset, mode) => {
    actionRef.current = { dataset, mode };
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    const { dataset, mode } = actionRef.current || {};
    if (!file || !dataset) return;

    setWorking(dataset.id);
    try {
      await recacheDatasetGeoJSON(dataset.id, file);

      if (mode === 'publish') {
        await publishDataset(dataset.id);
        toast.success('GeoJSON cached and dataset published — it will now appear on the map.');
      } else {
        toast.success('GeoJSON cached — dataset will now load on the map.');
      }
      fetchDatasets();
    } catch (err) {
      toast.error(`${mode === 'publish' ? 'Publish' : 'Fix'} failed: ${err.message}`);
    } finally {
      setWorking(null);
    }
  };

  // ── publish ─────────────────────────────────────────────────────────────
  const handlePublish = async (dataset) => {
    if (needsGeojsonCache(dataset)) {
      toast('Select the original file to convert and cache it — it will be published automatically.', {
        icon: '📂',
        duration: 5000,
      });
      openFilePicker(dataset, 'publish');
      return;
    }
    setWorking(dataset.id);
    try {
      await publishDataset(dataset.id);
      toast.success('Dataset published.');
      fetchDatasets();
    } catch { toast.error('Publish failed.'); }
    finally { setWorking(null); }
  };

  const handleUnpublish = async (id) => {
    try {
      await unpublishDataset(id);
      toast.success('Dataset unpublished.');
      fetchDatasets();
    } catch { toast.error('Action failed.'); }
  };

  const handleSubmitReview = async (id) => {
    try {
      await submitDatasetForReview(id);
      toast.success('Submitted for review.');
      fetchDatasets();
    } catch { toast.error('Failed to submit for review.'); }
  };

  const handleDelete = async (dataset) => {
    if (!window.confirm(`Delete "${dataset.title}"? This cannot be undone.`)) return;
    try {
      await deleteDataset(dataset.id, dataset.filePath);
      toast.success('Dataset deleted.');
      fetchDatasets();
    } catch { toast.error('Failed to delete dataset.'); }
  };

  const handleDownload = (dataset) => {
    if (!dataset.downloadURL) { toast.error('No download URL available.'); return; }
    window.open(dataset.downloadURL, '_blank', 'noopener,noreferrer');
  };

  const fileSizeDisplay = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Needs the amber "Fix Map Layer" button: already published but no inline data.
  const needsFix = (d) =>
    isStaff &&
    d.status === 'published' &&
    needsGeojsonCache(d);

  return (
    <div className="space-y-5">
      {/* Hidden file input shared by "Fix Map Layer" and "Publish (needs file)" */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json,.zip,.kml,.gpkg,.shp"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Preview modal */}
      {previewDataset && (
        <DatasetPreviewModal
          dataset={previewDataset}
          onClose={() => setPreviewDataset(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Datasets</h2>
          <p className="text-gray-500 text-sm">Upload, manage and download CBFM datasets</p>
        </div>
        <Link to="/datasets/upload" className="btn-primary flex items-center gap-2">
          <Upload size={16} />
          Upload Dataset
        </Link>
      </div>

      <div className="card py-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="form-input pl-8 py-2 text-sm" placeholder="Search datasets..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
          </div>
          {isStaff && (
            <select className="form-input py-2 text-sm w-auto" value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          )}
          <select className="form-input py-2 text-sm w-auto" value={filters.dataType}
            onChange={e => setFilters(f => ({ ...f, dataType: e.target.value, page: 1 }))}>
            <option value="">All Types</option>
            {DATA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="form-input py-2 text-sm w-auto" value={filters.province}
            onChange={e => setFilters(f => ({ ...f, province: e.target.value, page: 1 }))}>
            <option value="">All Provinces</option>
            {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-ocean-600">Loading datasets...</div>
      ) : datasets.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Upload size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No datasets found</p>
          <p className="text-sm mt-1">Upload your first dataset to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {datasets.map(dataset => (
            <div key={dataset.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">{dataset.title}</h3>
                    <StatusBadge status={dataset.status} />
                    <span className="badge bg-blue-50 text-blue-700">{dataset.fileFormat?.toUpperCase()}</span>
                    {dataset.hasGeojsonData && dataset.status === 'published' && (
                      <span className="badge bg-purple-50 text-purple-700 flex items-center gap-1">
                        <MapPin size={10} /> Map ready
                      </span>
                    )}
                    {needsFix(dataset) && (
                      <span className="badge bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Wrench size={10} />
                        {['geojson', 'json'].includes(dataset.fileFormat?.toLowerCase()) ? 'Map layer not cached' : conversionLabel(dataset.fileFormat)}
                      </span>
                    )}
                  </div>
                  {dataset.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{dataset.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    {dataset.dataType && <span>Type: {dataset.dataType.replace(/_/g, ' ')}</span>}
                    {dataset.province && <span>Province: {dataset.province}</span>}
                    {dataset.community && <span>Community: {dataset.community}</span>}
                    {dataset.collectionDate && <span>Collected: {dataset.collectionDate}</span>}
                    {dataset.calculatedAreaHa > 0 && (
                      <span className="font-medium text-ocean-700">
                        Area: {Number(dataset.calculatedAreaHa).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha
                      </span>
                    )}
                    <span>Size: {fileSizeDisplay(dataset.fileSize)}</span>
                    <span>Downloads: {dataset.downloadCount || 0}</span>
                    {dataset.uploaderName && <span>By: {dataset.uploaderName}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {/* Preview — shown when GeoJSON is cached */}
                  {dataset.hasGeojsonData && (
                    <button
                      onClick={() => setPreviewDataset(dataset)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Preview map & attribute table"
                    >
                      <Eye size={16} />
                    </button>
                  )}

                  <button onClick={() => handleDownload(dataset)}
                    className="p-2 text-ocean-700 hover:bg-ocean-50 rounded-lg transition-colors" title="Download">
                    <Download size={16} />
                  </button>

                  {isStaff && (dataset.status === 'under_review' || dataset.status === 'draft' || dataset.status === 'archived') && (
                    <button
                      onClick={() => handlePublish(dataset)}
                      disabled={working === dataset.id}
                      className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 disabled:opacity-60 text-white
                        ${needsGeojsonCache(dataset)
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-green-600 hover:bg-green-700'}`}
                      title={needsGeojsonCache(dataset)
                        ? 'Select the original file to convert and cache it, then publish'
                        : 'Publish dataset'}>
                      {working === dataset.id
                        ? 'Publishing...'
                        : needsGeojsonCache(dataset)
                          ? <><MapPin size={12} /> Publish + Cache</>
                          : <><CheckCircle size={12} /> Publish</>}
                    </button>
                  )}

                  {isStaff && dataset.status === 'published' && (
                    <button onClick={() => handleUnpublish(dataset.id)}
                      className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-1">
                      <Archive size={12} /> Unpublish
                    </button>
                  )}

                  {!isStaff && dataset.status === 'draft' && (
                    <button onClick={() => handleSubmitReview(dataset.id)}
                      className="px-3 py-1.5 text-xs bg-ocean-700 text-white rounded-lg hover:bg-ocean-800 flex items-center gap-1">
                      <Clock size={12} /> Submit for Review
                    </button>
                  )}

                  {needsFix(dataset) && (
                    <button
                      onClick={() => openFilePicker(dataset, 'fix')}
                      disabled={working === dataset.id}
                      className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1 disabled:opacity-60"
                      title="Re-select the GeoJSON file to cache it for the map">
                      <Wrench size={12} />
                      {working === dataset.id ? 'Fixing...' : 'Fix Map Layer'}
                    </button>
                  )}

                  {isStaff && (
                    <button onClick={() => handleDelete(dataset)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete dataset">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filters.page === p ? 'bg-ocean-700 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
