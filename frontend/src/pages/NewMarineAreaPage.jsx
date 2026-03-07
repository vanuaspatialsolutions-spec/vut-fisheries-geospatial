import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { createMarineArea } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Info } from 'lucide-react';
import { VANUATU_PROVINCES, AREA_TYPES, HABITAT_TYPES } from '../utils/constants';

export default function NewMarineAreaPage() {
  const navigate = useNavigate();
  const [geoJsonText, setGeoJsonText] = useState('');
  const [geoJsonError, setGeoJsonError] = useState('');
  const [selectedHabitats, setSelectedHabitats] = useState([]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const toggleHabitat = (h) => setSelectedHabitats(prev =>
    prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]
  );

  const onSubmit = async (data) => {
    let geometry = null;
    if (geoJsonText.trim()) {
      try {
        geometry = JSON.parse(geoJsonText);
        if (!geometry.type || !geometry.coordinates) throw new Error();
        setGeoJsonError('');
      } catch {
        setGeoJsonError('Invalid GeoJSON format. Must be a Polygon or MultiPolygon geometry object.');
        return;
      }
    }
    try {
      await createMarineArea({ ...data, geometry, habitatTypes: selectedHabitats });
      toast.success('Marine area recorded!');
      navigate('/marine');
    } catch (err) {
      toast.error(err.message || 'Failed to save.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">New Marine Area</h2>
          <p className="text-gray-500 text-sm">Record an LMMA, taboo area, or other managed marine zone</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card space-y-4">
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Area Identification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Area Name *</label>
              <input className="form-input" placeholder="e.g. Pele Island LMMA" {...register('areaName', { required: true })} />
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

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ocean-800">Boundary Geometry *</h3>
            <a href="https://geojson.io" target="_blank" rel="noopener noreferrer"
              className="text-xs text-ocean-600 hover:underline flex items-center gap-1">
              <Info size={12} /> Draw at geojson.io
            </a>
          </div>
          <p className="text-xs text-gray-500">Paste GeoJSON geometry (Polygon or MultiPolygon). Draw your boundary at geojson.io and copy the geometry object.</p>
          <textarea className={`form-input font-mono text-xs ${geoJsonError ? 'border-red-400' : ''}`} rows={6}
            placeholder={`{\n  "type": "Polygon",\n  "coordinates": [[[166.92, -15.37], ...]]\n}`}
            value={geoJsonText} onChange={e => { setGeoJsonText(e.target.value); setGeoJsonError(''); }} />
          {geoJsonError && <p className="text-red-500 text-xs">{geoJsonError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Area Size (ha)</label>
              <input type="number" step="0.01" className="form-input" {...register('areaSizeHa', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Perimeter (km)</label>
              <input type="number" step="0.01" className="form-input" {...register('perimeterKm', { valueAsNumber: true })} /></div>
          </div>
        </div>

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

        <div className="card">
          <label className="form-label">Notes</label>
          <textarea className="form-input" rows={3} {...register('notes')} />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            <Save size={16} />{isSubmitting ? 'Saving...' : 'Save Marine Area'}
          </button>
        </div>
      </form>
    </div>
  );
}
