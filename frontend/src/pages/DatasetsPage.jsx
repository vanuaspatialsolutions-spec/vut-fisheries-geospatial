import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDatasets, publishDataset, unpublishDataset, submitDatasetForReview, deleteDataset, recacheDatasetGeoJSON } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Upload, Download, CheckCircle, Clock, Archive, Search, Trash2, Wrench } from 'lucide-react';
import { format } from 'date-fns';
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

export default function DatasetsPage() {
  const { isStaff } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ status: '', dataType: '', province: '', search: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(null); // dataset id currently being fixed
  const fixInputRef = useRef(null);
  const fixTargetRef = useRef(null);

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

  const handleDownload = (dataset) => {
    if (dataset.downloadURL) {
      window.open(dataset.downloadURL, '_blank');
      toast.success(`Downloading ${dataset.fileName}`);
    } else {
      toast.error('Download URL not available.');
    }
  };

  const handlePublish = async (id, publish) => {
    try {
      if (publish) await publishDataset(id);
      else await unpublishDataset(id);
      toast.success(`Dataset ${publish ? 'published' : 'unpublished'}.`);
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

  const handleFixMapLayer = (dataset) => {
    fixTargetRef.current = dataset;
    fixInputRef.current.value = '';
    fixInputRef.current.click();
  };

  const handleFixFileSelected = async (e) => {
    const file = e.target.files?.[0];
    const dataset = fixTargetRef.current;
    if (!file || !dataset) return;
    setFixing(dataset.id);
    try {
      await recacheDatasetGeoJSON(dataset.id, file);
      toast.success('GeoJSON cached — dataset will now load on the map.');
      fetchDatasets();
    } catch (err) {
      toast.error(`Fix failed: ${err.message}`);
    } finally {
      setFixing(null);
    }
  };

  const fileSizeDisplay = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Needs fixing: published GeoJSON dataset without cached inline data
  const needsFix = (d) =>
    isStaff &&
    d.status === 'published' &&
    ['geojson', 'json'].includes(d.fileFormat?.toLowerCase()) &&
    !d.hasGeojsonData;

  return (
    <div className="space-y-5">
      {/* Hidden file input for re-caching GeoJSON */}
      <input
        ref={fixInputRef}
        type="file"
        accept=".geojson,.json"
        className="hidden"
        onChange={handleFixFileSelected}
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
                    {needsFix(dataset) && (
                      <span className="badge bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Wrench size={10} /> Map layer not cached
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
                    <span>Size: {fileSizeDisplay(dataset.fileSize)}</span>
                    <span>Downloads: {dataset.downloadCount || 0}</span>
                    {dataset.uploaderName && <span>By: {dataset.uploaderName}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleDownload(dataset)}
                    className="p-2 text-ocean-700 hover:bg-ocean-50 rounded-lg transition-colors" title="Download">
                    <Download size={16} />
                  </button>

                  {isStaff && (dataset.status === 'under_review' || dataset.status === 'draft' || dataset.status === 'archived') && (
                    <button onClick={() => handlePublish(dataset.id, true)}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                      <CheckCircle size={12} /> Publish
                    </button>
                  )}

                  {isStaff && dataset.status === 'published' && (
                    <button onClick={() => handlePublish(dataset.id, false)}
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
                      onClick={() => handleFixMapLayer(dataset)}
                      disabled={fixing === dataset.id}
                      className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1 disabled:opacity-60"
                      title="Re-select the GeoJSON file to cache it for the map">
                      <Wrench size={12} />
                      {fixing === dataset.id ? 'Fixing...' : 'Fix Map Layer'}
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
