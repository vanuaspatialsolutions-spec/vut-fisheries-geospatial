import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDatasets, publishDataset, unpublishDataset, submitDatasetForReview, deleteDataset, recacheDatasetGeoJSON } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Upload, Download, CheckCircle, Clock, Archive, Search, Trash2, Wrench, MapPin } from 'lucide-react';
import { DATA_TYPES, VANUATU_PROVINCES } from '../utils/constants';

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

// Returns true for map-eligible datasets that don't yet have inline Firestore data.
function needsGeojsonCache(d) {
  return MAP_FORMATS.includes(d.fileFormat?.toLowerCase()) && !d.hasGeojsonData;
}

// Human-readable label for the "needs conversion" badge on non-GeoJSON formats.
function conversionLabel(fmt) {
  const labels = { zip: 'Shapefile — needs conversion', kml: 'KML — needs conversion', gpkg: 'GeoPackage — needs conversion', shp: 'Shapefile — needs conversion' };
  return labels[fmt?.toLowerCase()] || 'Needs map conversion';
}

export default function DatasetsPage() {
  const { isStaff } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ status: '', dataType: '', province: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null); // dataset id currently being published/fixed

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

  useEffect(() => { fetchDatasets(); }, [filters]);

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
        // After caching succeed, publish the dataset.
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
    // GeoJSON datasets without inline data: require the user to provide the file
    // so we can cache it before publishing. Storage SDK + fetch are both CORS-blocked.
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
