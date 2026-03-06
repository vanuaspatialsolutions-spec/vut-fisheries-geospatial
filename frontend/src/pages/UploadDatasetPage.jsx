import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { uploadDataset } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Upload, File, X, AlertTriangle, MapPin } from 'lucide-react';
import { DATA_TYPES, VANUATU_PROVINCES } from '../utils/constants';

const ACCEPTED_EXTENSIONS = {
  'application/zip': ['.zip'],
  'text/csv': ['.csv'],
  'application/json': ['.geojson', '.json'],
  'application/octet-stream': ['.shp', '.dbf', '.shx', '.prj'],
  'application/vnd.google-earth.kml+xml': ['.kml'],
  'text/plain': ['.csv', '.kml'],
};

export default function UploadDatasetPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_EXTENSIONS,
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
  });

  const onSubmit = async (data) => {
    if (!file) return toast.error('Please select a file to upload.');
    setUploading(true);
    try {
      await uploadDataset(file, data, setProgress);
      toast.success('Dataset uploaded successfully!');
      navigate('/datasets');
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
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
        <p className="text-gray-500 text-sm">Upload historical or current CBFM datasets (ZIP, Shapefile, CSV, KML, GeoJSON)</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Select File</h3>
          {!file ? (
            <div {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-ocean-500 bg-ocean-50' : 'border-gray-200 hover:border-ocean-400 hover:bg-gray-50'}`}>
              <input {...getInputProps()} />
              <Upload size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">Drop your file here, or click to browse</p>
              <p className="text-gray-400 text-sm mt-1">Supported: ZIP, Shapefile (.shp, .dbf, .shx), CSV, KML, GeoJSON</p>
              <p className="text-gray-400 text-xs mt-1">Maximum file size: 500 MB</p>
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
              {/* GeoJSON map-readiness indicator */}
              {['geojson', 'json'].includes(file.name.split('.').pop().toLowerCase()) && (
                file.size < 900000 ? (
                  <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                    <MapPin size={13} className="flex-shrink-0" />
                    This GeoJSON will be cached inline and appear automatically on the interactive map when published.
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>
                      File is {fileSizeDisplay(file.size)} — over the 900 KB inline limit. It will still upload to storage,
                      but when publishing you will be asked to select the file again so the map layer can be cached.
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Uploading to Firebase Storage...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-ocean-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
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
            {uploading ? `Uploading ${progress}%...` : 'Upload Dataset'}
          </button>
        </div>
      </form>
    </div>
  );
}
