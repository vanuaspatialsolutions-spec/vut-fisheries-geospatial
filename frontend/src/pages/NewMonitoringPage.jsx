import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { createMonitoring, updateMonitoring, getMonitoringRecord } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { VANUATU_PROVINCES, MONITORING_TYPES } from '../utils/constants';
import FormSidebar from '../components/FormSidebar';
import { GlowingEffect } from '../components/ui/glowing-effect';

const THREATS = ['blast_fishing', 'poison_fishing', 'overfishing', 'runoff', 'sedimentation', 'tourism_pressure', 'anchor_damage', 'coral_bleaching'];

export default function NewMonitoringPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [selectedThreats, setSelectedThreats] = useState([]);
  const [teamInput, setTeamInput] = useState('');
  const [team, setTeam] = useState([]);
  const { register, handleSubmit, control, reset, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { speciesData: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'speciesData' });

  useEffect(() => {
    if (isEdit) {
      getMonitoringRecord(id)
        .then(data => {
          if (data) {
            reset(data);
            if (data.threatsObserved) setSelectedThreats(data.threatsObserved);
            if (data.surveyTeam) setTeam(data.surveyTeam);
          }
        })
        .catch(() => toast.error('Failed to load monitoring record.'));
    }
  }, [id]);

  const toggleThreat = (t) => setSelectedThreats(prev =>
    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
  );

  const addTeamMember = () => {
    if (teamInput.trim()) { setTeam(prev => [...prev, teamInput.trim()]); setTeamInput(''); }
  };

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateMonitoring(id, { ...data, threatsObserved: selectedThreats, surveyTeam: team });
        toast.success('Monitoring record updated!');
      } else {
        await createMonitoring({ ...data, threatsObserved: selectedThreats, surveyTeam: team });
        toast.success('Monitoring record submitted!');
      }
      navigate('/monitoring');
    } catch (err) {
      toast.error(err.message || 'Submission failed.');
    }
  };

  const monType = watch('monitoringType');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <div className="xl:col-span-2 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit' : 'New'} Biological Monitoring Record</h2>
          <p className="text-gray-500 text-sm">Record reef survey, coral cover, species counts and health data</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Survey Identification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Survey Name *</label>
              <input className="form-input" placeholder="e.g. Pele LMMA Annual Fish Survey 2024" {...register('surveyName', { required: true })} />
            </div>
            <div>
              <label className="form-label">Monitoring Type *</label>
              <select className="form-input" {...register('monitoringType', { required: true })}>
                <option value="">Select...</option>
                {MONITORING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Survey Date *</label>
              <input type="date" className="form-input" {...register('surveyDate', { required: true })} />
            </div>
          </div>
        </div>

        <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Site Location</h3>
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
            <div><label className="form-label">Site Name *</label>
              <input className="form-input" placeholder="e.g. North Reef Transect 1" {...register('siteName', { required: true })} /></div>
            <div><label className="form-label">Latitude *</label>
              <input type="number" step="0.000001" className="form-input" placeholder="-15.xxx"
                {...register('latitude', { required: true, valueAsNumber: true })} /></div>
            <div><label className="form-label">Longitude *</label>
              <input type="number" step="0.000001" className="form-input" placeholder="166.xxx"
                {...register('longitude', { required: true, valueAsNumber: true })} /></div>
            <div><label className="form-label">Depth (m)</label>
              <input type="number" step="0.5" className="form-input" {...register('depthM', { valueAsNumber: true })} /></div>
          </div>
        </div>

        <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Survey Methodology</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="form-label">Transect Length (m)</label>
              <input type="number" step="0.5" className="form-input" {...register('transectLengthM', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Transect Width (m)</label>
              <input type="number" step="0.5" className="form-input" {...register('transectWidthM', { valueAsNumber: true })} /></div>
            <div><label className="form-label">No. of Transects</label>
              <input type="number" className="form-input" {...register('numberOfTransects', { valueAsNumber: true })} /></div>
          </div>
          <div>
            <label className="form-label">Methodology Description</label>
            <textarea className="form-input" rows={2} {...register('methodology')} />
          </div>
        </div>

        <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Survey Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(monType === 'reef_fish_survey' || monType === 'catch_composition') && (
              <>
                <div><label className="form-label">Total Fish Count</label>
                  <input type="number" className="form-input" {...register('totalFishCount', { valueAsNumber: true })} /></div>
                <div><label className="form-label">Total Biomass (kg)</label>
                  <input type="number" step="0.1" className="form-input" {...register('totalFishBiomassKg', { valueAsNumber: true })} /></div>
                <div><label className="form-label">Target Species Count</label>
                  <input type="number" className="form-input" {...register('targetSpeciesCount', { valueAsNumber: true })} /></div>
              </>
            )}
            {monType === 'coral_cover' && (
              <>
                <div><label className="form-label">Live Coral Cover (%)</label>
                  <input type="number" step="0.1" min="0" max="100" className="form-input" {...register('liveCoralCoverPct', { valueAsNumber: true })} /></div>
                <div><label className="form-label">Dead Coral Cover (%)</label>
                  <input type="number" step="0.1" min="0" max="100" className="form-input" {...register('deadCoralCoverPct', { valueAsNumber: true })} /></div>
                <div><label className="form-label">Algae Cover (%)</label>
                  <input type="number" step="0.1" min="0" max="100" className="form-input" {...register('algaeCoverPct', { valueAsNumber: true })} /></div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="bleach" className="rounded text-ocean-600" {...register('bleachingPresent')} />
                  <label htmlFor="bleach" className="text-sm text-gray-700">Bleaching Present</label>
                </div>
                <div><label className="form-label">Bleaching (%)</label>
                  <input type="number" step="0.1" min="0" max="100" className="form-input" {...register('bleachingPct', { valueAsNumber: true })} /></div>
              </>
            )}
            {monType === 'invertebrate_survey' && (
              <>
                <div><label className="form-label">Sea Cucumber (per 100m²)</label>
                  <input type="number" step="0.1" className="form-input" {...register('seaCucumberDensityPer100m2', { valueAsNumber: true })} /></div>
                <div><label className="form-label">Trochus (per 100m²)</label>
                  <input type="number" step="0.1" className="form-input" {...register('trochusDensityPer100m2', { valueAsNumber: true })} /></div>
              </>
            )}
            <div><label className="form-label">Reef Health Score (1–5)</label>
              <input type="number" step="0.5" min="1" max="5" className="form-input" {...register('reefHealthScore', { valueAsNumber: true })} /></div>
          </div>
        </div>

        <div className="card space-y-3">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ocean-800">Species Observations</h3>
            <button type="button" onClick={() => append({ species: '', commonName: '', count: '', sizeRange: '', notes: '' })}
              className="text-sm text-ocean-600 hover:text-ocean-800 flex items-center gap-1">
              <Plus size={14} /> Add Species
            </button>
          </div>
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-5 gap-2 items-center bg-gray-50 p-3 rounded-lg">
              <input className="form-input text-xs" placeholder="Scientific name" {...register(`speciesData.${i}.species`)} />
              <input className="form-input text-xs" placeholder="Common name" {...register(`speciesData.${i}.commonName`)} />
              <input type="number" className="form-input text-xs" placeholder="Count" {...register(`speciesData.${i}.count`, { valueAsNumber: true })} />
              <input className="form-input text-xs" placeholder="Size range (cm)" {...register(`speciesData.${i}.sizeRange`)} />
              <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 justify-self-end">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="card space-y-3">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800">Survey Team</h3>
          <div className="flex gap-2">
            <input className="form-input" placeholder="Add team member name" value={teamInput}
              onChange={e => setTeamInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTeamMember())} />
            <button type="button" onClick={addTeamMember} className="btn-secondary whitespace-nowrap">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {team.map((member, i) => (
              <span key={i} className="flex items-center gap-1 bg-ocean-50 text-ocean-700 text-sm px-3 py-1 rounded-full">
                {member}
                <button type="button" onClick={() => setTeam(prev => prev.filter((_, j) => j !== i))}>
                  <span className="text-ocean-400 ml-1">×</span>
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="card">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2 mb-4">Threats Observed</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {THREATS.map(t => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedThreats.includes(t)} onChange={() => toggleThreat(t)}
                  className="rounded border-gray-300 text-ocean-600" />
                <span className="text-gray-600 capitalize">{t.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <label className="form-label">Additional Notes</label>
          <textarea className="form-input" rows={3} {...register('notes')} />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            <Save size={16} />{isSubmitting ? 'Saving...' : isEdit ? 'Update Record' : 'Submit Record'}
          </button>
        </div>
      </form>
      </div>{/* xl:col-span-2 */}
      <div className="xl:col-span-1">
        <FormSidebar type="monitoring" />
      </div>
      </div>{/* grid */}
    </div>
  );
}
