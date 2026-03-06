import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createMarineArea, updateMarineArea, getMarineArea, parseFileToGeoJSON } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Upload, File, X, MapPin, SkipForward } from 'lucide-react';
import { VANUATU_PROVINCES, AREA_TYPES, HABITAT_TYPES } from '../utils/constants';

const BOUNDARY_ACCEPT = {
  'application/zip': ['.zip'],
  'application/json': ['.geojson', '.json'],
  'application/vnd.google-earth.kml+xml': ['.kml'],
  'application/octet-stream': ['.shp', '.gpkg'],
  'application/geopackage+sqlite3': ['.gpkg'],
  'text/plain': ['.kml'],
};

/** Extract a single geometry from a parsed GeoJSON result. */
function extractGeometry(geojson) {
  const src = geojson.type === 'Feature' ? [geojson] : (geojson.features || []);
  const geoms = src.map(f => f.geometry).filter(Boolean);
  if (geoms.length === 0) throw new Error('No geometry found in file.');
  if (geoms.length === 1) return geoms[0];
  // Merge multiple Polygons / MultiPolygons into one MultiPolygon
  const allPoly = geoms.every(g => ['Polygon', 'MultiPolygon'].includes(g.type));
  if (allPoly) {
    return {
      type: 'MultiPolygon',
      coordinates: geoms.flatMap(g => g.type === 'Polygon' ? [g.coordinates] : g.coordinates),
    };
  }
  return { type: 'GeometryCollection', geometries: geoms };
}

export default function NewMarineAreaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [geometry, setGeometry] = useState(null);       // parsed geometry object
  const [boundaryFile, setBoundaryFile] = useState(null); // File that was dropped
  const [boundaryMeta, setBoundaryMeta] = useState(null); // { featureCount }
  const [parsing, setParsing] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [selectedHabitats, setSelectedHabitats] = useState([]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (isEdit) {
      getMarineArea(id)
        .then(data => {
          if (data) {
            reset(data);
            if (data.geometry) {
              setGeometry(data.geometry);
              setBoundaryMeta({ featureCount: 1, fromSaved: true });
            }
            if (data.habitatTypes) setSelectedHabitats(data.habitatTypes);
          }
        })
        .catch(() => toast.error('Failed to load marine area.'));
    }
  }, [id]);

  const toggleHabitat = (h) => setSelectedHabitats(prev =>
    prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]
  );

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0];
    if (!file) return;
    setBoundaryFile(file);
    setParsing(true);
    setSkipped(false);
    try {
      const geojson = await parseFileToGeoJSON(file);
      const geom = extractGeometry(geojson);
      setGeometry(geom);
      const count = geojson.features?.length ?? 1;
      setBoundaryMeta({ featureCount: count });
      toast.success(`Boundary loaded — ${count.toLocaleString()} feature${count !== 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(`Could not read boundary: ${err.message}`);
      setBoundaryFile(null);
      setGeometry(null);
      setBoundaryMeta(null);
    } finally {
      setParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: BOUNDARY_ACCEPT,
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024,
    disabled: parsing,
  });

  const clearBoundary = () => {
    setBoundaryFile(null);
    setGeometry(null);
    setBoundaryMeta(null);
    setSkipped(false);
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, habitatTypes: selectedHabitats };
      if (geometry) payload.geometry = geometry;
      if (isEdit) {
        await updateMarineArea(id, payload);
        toast.success('Marine area updated!');
      } else {
        await createMarineArea(payload);
        toast.success('Marine area recorded!');
      }
      navigate('/marine');
    } catch (err) {
      toast.error(err.message || 'Failed to save.');
    }
  };

  const hasBoundary = !!geometry;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit' : 'New'} Marine Area</h2>
          <p className="text-gray-500 text-sm">Record an LMMA, taboo area, or other managed marine zone</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Area Identification ── */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Area Identification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Area Name *</label>
              <input className="form-input" placeholder="e.g. Pele Island LMMA" {...register('areaName', { required: true })} />
              {errors.areaName && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
            <div>
              <label className="form-label">Area Type *</label>
              <select className="form-input" {...register('areaType', { required: true })}>
                <option value="">Select type...</option>
                {AREA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Location ── */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Province *</label>
              <select className="form-input" {...register('province', { required: true })}>
                <option value="">Select...</option>
                {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="form-label">Island *</label>
              <input className="form-input" {...register('island', { required: true })} /></div>
            <div><label className="form-label">Community *</label>
              <input className="form-input" {...register('community', { required: true })} /></div>
          </div>
        </div>

        {/* ── Boundary Map ── */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-ocean-800">Boundary Map</h3>
              <p className="text-xs text-gray-400 mt-0.5">Upload a boundary file or skip — you can add it later</p>
            </div>
            {hasBoundary && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg">
                <MapPin size={11} /> Boundary loaded
              </span>
            )}
            {skipped && !hasBoundary && (
              <span className="text-xs text-gray-400 italic">Skipped — no boundary</span>
            )}
          </div>

          {/* State: file loaded */}
          {hasBoundary && boundaryFile && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <File size={16} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{boundaryFile.name}</p>
                <p className="text-xs text-gray-500">
                  {boundaryMeta?.featureCount
                    ? `${boundaryMeta.featureCount.toLocaleString()} feature${boundaryMeta.featureCount !== 1 ? 's' : ''} extracted`
                    : 'Geometry loaded'}
                </p>
              </div>
              <button type="button" onClick={clearBoundary} className="text-gray-400 hover:text-red-500 p-1">
                <X size={16} />
              </button>
            </div>
          )}

          {/* State: loaded from saved record (edit mode) */}
          {hasBoundary && !boundaryFile && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">Saved boundary</p>
                <p className="text-xs text-gray-500">Upload a new file below to replace it</p>
              </div>
              <button type="button" onClick={clearBoundary} className="text-gray-400 hover:text-red-500 p-1" title="Remove boundary">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Dropzone — shown when no boundary yet, or always to allow replacement */}
          {(!hasBoundary || boundaryMeta?.fromSaved) && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                ${parsing ? 'border-amber-300 bg-amber-50 cursor-wait'
                  : isDragActive ? 'border-ocean-500 bg-ocean-50'
                  : 'border-gray-200 hover:border-ocean-400 hover:bg-gray-50'}`}
            >
              <input {...getInputProps()} />
              {parsing ? (
                <p className="text-sm text-amber-600 animate-pulse">Reading boundary file…</p>
              ) : (
                <>
                  <Upload size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-600 font-medium">
                    {isDragActive ? 'Drop file to load boundary' : 'Drop boundary file here, or click to browse'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Accepts: ZIP (shapefile), Shapefile (.shp), KML, GeoJSON, GeoPackage (.gpkg)
                  </p>
                </>
              )}
            </div>
          )}

          {/* Skip option */}
          {!hasBoundary && !skipped && (
            <button
              type="button"
              onClick={() => setSkipped(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto"
            >
              <SkipForward size={13} /> Skip for now — add boundary later
            </button>
          )}

          {/* Undo skip */}
          {skipped && !hasBoundary && (
            <button
              type="button"
              onClick={() => setSkipped(false)}
              className="text-xs text-ocean-600 hover:underline mx-auto block"
            >
              Upload a boundary file instead
            </button>
          )}

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div><label className="form-label">Area Size (ha)</label>
              <input type="number" step="0.01" className="form-input" {...register('areaSizeHa', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Perimeter (km)</label>
              <input type="number" step="0.01" className="form-input" {...register('perimeterKm', { valueAsNumber: true })} /></div>
          </div>
        </div>

        {/* ── Management Details ── */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Management Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">Year Established</label>
              <input type="number" className="form-input" placeholder="e.g. 2018" {...register('establishedYear', { valueAsNumber: true })} /></div>
            <div>
              <label className="form-label">Management Status</label>
              <select className="form-input" {...register('managementStatus')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="under_review">Under Review</option>
                <option value="proposed">Proposed</option>
              </select>
            </div>
            <div>
              <label className="form-label">Protection Level</label>
              <select className="form-input" {...register('protectionLevel')}>
                <option value="">Select...</option>
                <option value="fully_protected">Fully Protected</option>
                <option value="partially_protected">Partially Protected</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>
            <div>
              <label className="form-label">Patrol Frequency</label>
              <select className="form-input" {...register('patrolFrequency')}>
                <option value="">Select...</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="irregular">Irregular</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isOpen" className="rounded text-ocean-600" {...register('isCurrentlyOpen')} />
              <label htmlFor="isOpen" className="text-sm text-gray-700">Currently Open to Fishing</label>
            </div>
            <div><label className="form-label">Last Closure Date</label>
              <input type="date" className="form-input" {...register('lastClosureDate')} /></div>
            <div><label className="form-label">Last Opening Date</label>
              <input type="date" className="form-input" {...register('lastOpeningDate')} /></div>
          </div>
        </div>

        {/* ── Habitat Types ── */}
        <div className="card">
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2 mb-4">Habitat Types Present</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HABITAT_TYPES.map(h => (
              <label key={h} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedHabitats.includes(h)} onChange={() => toggleHabitat(h)}
                  className="rounded border-gray-300 text-ocean-600" />
                <span className="text-gray-600 capitalize">{h.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="card">
          <label className="form-label">Notes</label>
          <textarea className="form-input" rows={3} {...register('notes')} />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting || parsing} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Marine Area' : 'Save Marine Area'}
          </button>
        </div>
      </form>
    </div>
  );
}
