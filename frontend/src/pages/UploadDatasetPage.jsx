import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { uploadDataset } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Upload, File, X, MapPin } from 'lucide-react';
import { DATA_TYPES, VANUATU_PROVINCES } from '../utils/constants';

// iOS Safari often reports unexpected MIME types for geo files (e.g. geojson
// as application/octet-stream or text/plain). Listing the extension under every
// plausible MIME type ensures react-dropzone accepts the file on all platforms.
const ACCEPTED_EXTENSIONS = {
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  'text/csv': ['.csv'],
  'application/json': ['.geojson', '.json'],
  'application/geo+json': ['.geojson'],
  'application/octet-stream': ['.shp', '.dbf', '.shx', '.prj', '.gpkg', '.geojson', '.json', '.kml', '.zip', '.csv'],
  'application/vnd.google-earth.kml+xml': ['.kml'],
  'application/geopackage+sqlite3': ['.gpkg'],
  'text/plain': ['.csv', '.kml', '.geojson', '.json'],
  'text/xml': ['.kml'],
};

const MAP_FORMATS = new Set(['geojson', 'json', 'zip', 'kml', 'gpkg', 'shp']);

export default function UploadDatasetPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState('uploading'); // 'processing' | 'uploading'
  const [progress, setProgress] = useState(0);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onDrop = useCallback((accepted, rejected) => {
    if (accepted[0]) {
      setFile(accepted[0]);
    } else if (rejected?.length) {
      const reason = rejected[0]?.errors?.[0]?.message || 'File not accepted';
      toast.error(`File rejected: ${reason}`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_EXTENSIONS,
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
    // iOS Safari blocks programmatic input.click() — use noClick so the
    // native <input> element (overlaid below) captures the tap directly.
    noClick: true,
  });

  const onSubmit = async (data) => {
    if (!file) return toast.error('Please select a file to upload.');
    setUploading(true);
    setStage('processing');
    setProgress(0);
    try {
      await uploadDataset(file, data, setProgress, setStage);
      toast.success('Dataset uploaded successfully!');
      navigate('/datasets');
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      setStage('uploading');
      setProgress(0);
    }
  };

  const fileSizeDisplay = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload Dataset</h2>
        <p className="text-gray-500 text-sm">Upload historical or current CBFM datasets — ZIP, Shapefile, KML, GeoJSON, GeoPackage, CSV</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Select File</h3>
          {!file ? (
            <div {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-ocean-500 bg-ocean-50' : 'border-gray-200 hover:border-ocean-400 hover:bg-gray-50'}`}>
              {/* Overlay the native input so iOS taps it directly (bypasses blocked programmatic click) */}
              <input {...getInputProps()} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
              <Upload size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">Drop your file here, or click to browse</p>
              <p className="text-gray-400 text-sm mt-1">
                Supported: <strong className="text-gray-500">ZIP</strong> (shapefile bundle) · <strong className="text-gray-500">Shapefile</strong> (.shp) · <strong className="text-gray-500">KML</strong> · <strong className="text-gray-500">GeoJSON</strong> · <strong className="text-gray-500">GeoPackage</strong> (.gpkg) · CSV
              </p>
              <p className="text-gray-400 text-xs mt-1">Maximum file size: 500 MB · Large files are automatically simplified for map display</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <File size={20} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">{fileSizeDisplay(file.size)}</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
                  <X size={18} />
                </button>
              </div>
              {/* Map-readiness indicator for all spatial formats */}
              {MAP_FORMATS.has(file.name.split('.').pop().toLowerCase()) && (
                <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                  <MapPin size={13} className="flex-shrink-0" />
                  {(() => {
                    const ext = file.name.split('.').pop().toLowerCase();
                    if (ext === 'zip') return 'Shapefile ZIP will be converted to GeoJSON. Large files are simplified automatically to fit the map cache — the original is always preserved for download.';
                    if (ext === 'kml') return 'KML will be converted to GeoJSON and cached for the interactive map.';
                    if (ext === 'gpkg') return 'GeoPackage will be read in the browser and converted to GeoJSON for the map.';
                    if (ext === 'shp') return 'Shapefile geometry will be extracted. For attributes, ZIP all components (.shp, .dbf, .shx, .prj) together.';
                    return 'This file will be cached and appear automatically on the interactive map when published.';
                  })()}
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                {stage === 'processing'
                  ? <span className="animate-pulse">Processing file — converting to GeoJSON&hellip;</span>
                  : <span>Uploading to Firebase Storage&hellip;</span>}
                {stage === 'uploading' && <span>{progress}%</span>}
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stage === 'processing' ? 'bg-amber-400 w-full animate-pulse' : 'bg-ocean-600'}`}
                  style={stage === 'uploading' ? { width: `${progress}%` } : undefined}
                />
              </div>
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">Dataset Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Dataset Title *</label>
              <input className="form-input" placeholder="e.g. Shefa Province LMMA Survey 2024"
                {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} placeholder="Describe the dataset contents and purpose..."
                {...register('description')} />
            </div>
            <div>
              <label className="form-label">Data Type *</label>
              <select className="form-input" {...register('dataType', { required: true })}>
                <option value="">Select type...</option>
                {DATA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Province</label>
              <select className="form-input" {...register('province')}>
                <option value="">Select province...</option>
                {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="form-label">Island</label>
              <input className="form-input" placeholder="e.g. Efate, Espiritu Santo" {...register('island')} /></div>
            <div><label className="form-label">Community / Village</label>
              <input className="form-input" placeholder="e.g. Pele Island Community" {...register('community')} /></div>
            <div><label className="form-label">LMMA Name</label>
              <input className="form-input" placeholder="Locally Managed Marine Area name" {...register('lmmaName')} /></div>
            <div><label className="form-label">Collection Start Date</label>
              <input type="date" className="form-input" {...register('collectionDate')} /></div>
            <div><label className="form-label">Collection End Date</label>
              <input type="date" className="form-input" {...register('collectionEndDate')} /></div>
            <div><label className="form-label">Data Coordinator</label>
              <input className="form-input" placeholder="Name of coordinator" {...register('coordinatorName')} /></div>
            <div><label className="form-label">Coordinator Contact</label>
              <input className="form-input" placeholder="Email or phone" {...register('coordinatorContact')} /></div>
            <div className="md:col-span-2"><label className="form-label">Methodology</label>
              <textarea className="form-input" rows={2} placeholder="Data collection methodology..." {...register('methodology')} /></div>
            <div className="md:col-span-2"><label className="form-label">Tags (comma-separated)</label>
              <input className="form-input" placeholder="e.g. reef fish, 2024, baseline, Shefa" {...register('tags')} /></div>
            <div className="md:col-span-2"><label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} placeholder="Additional notes or data quality notes..." {...register('notes')} /></div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={uploading || !file} className="btn-primary flex items-center gap-2">
            <Upload size={16} />
            {uploading
              ? stage === 'processing' ? 'Processing...' : `Uploading ${progress}%...`
              : 'Upload Dataset'}
          </button>
        </div>
      </form>
    </div>
  );
}
