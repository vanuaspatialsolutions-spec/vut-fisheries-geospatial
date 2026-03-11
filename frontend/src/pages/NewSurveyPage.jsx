import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useEffect } from 'react';
import { getSurvey, createSurvey, updateSurvey } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';
import { VANUATU_PROVINCES, SURVEY_TYPES, COMMON_CHALLENGES, TRAINING_TYPES } from '../utils/constants';
import FormSidebar from '../components/FormSidebar';
import { GlowingEffect } from '../components/ui/glowing-effect';

function CheckboxGroup({ label, options, value = [], onChange }) {
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt];
    onChange(next);
  };
  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)}
              className="rounded border-gray-300 text-ocean-600" />
            <span className="text-gray-600">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function NewSurveyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { challenges: [], trainingReceived: [] },
  });

  useEffect(() => {
    if (isEdit) {
      getSurvey(id).then(data => { if (data) reset(data); }).catch(() => toast.error('Failed to load survey.'));
    }
  }, [id]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateSurvey(id, data);
        toast.success('Survey updated.');
      } else {
        await createSurvey(data);
        toast.success('Survey submitted successfully!');
      }
      navigate('/surveys');
    } catch (err) {
      toast.error(err.message || 'Submission failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      <div className="xl:col-span-2 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit' : 'New'} Community Survey</h2>
          <p className="text-gray-500 text-sm">Record community-level CBFM data</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Location Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Province *</label>
              <select className="form-input" {...register('province', { required: true })}>
                <option value="">Select...</option>
                {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
              {errors.province && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
            <div>
              <label className="form-label">Island *</label>
              <input className="form-input" placeholder="e.g. Efate" {...register('island', { required: true })} />
            </div>
            <div>
              <label className="form-label">Community / Village *</label>
              <input className="form-input" placeholder="Community name" {...register('community', { required: true })} />
            </div>
            <div>
              <label className="form-label">LMMA Name</label>
              <input className="form-input" {...register('lmmaName')} />
            </div>
            <div>
              <label className="form-label">Latitude (decimal)</label>
              <input type="number" step="0.000001" className="form-input" placeholder="-15.xxx" {...register('latitude', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="form-label">Longitude (decimal)</label>
              <input type="number" step="0.000001" className="form-input" placeholder="166.xxx" {...register('longitude', { valueAsNumber: true })} />
            </div>
          </div>
        </div>

        <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Survey Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Survey Date *</label>
              <input type="date" className="form-input" {...register('surveyDate', { required: true })} />
            </div>
            <div>
              <label className="form-label">Survey Type *</label>
              <select className="form-input" {...register('surveyType', { required: true })}>
                <option value="">Select...</option>
                {SURVEY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Surveyor Name *</label>
              <input className="form-input" {...register('surveyorName', { required: true })} />
            </div>
            <div>
              <label className="form-label">Organization</label>
              <input className="form-input" {...register('surveyorOrganization')} />
            </div>
          </div>
        </div>

        <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Community Profile</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="form-label">Total Households</label>
              <input type="number" className="form-input" {...register('totalHouseholds', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Total Fishers</label>
              <input type="number" className="form-input" {...register('totalFishers', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Male Fishers</label>
              <input type="number" className="form-input" {...register('maleFishers', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Female Fishers</label>
              <input type="number" className="form-input" {...register('femaleFishers', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Youth Fishers (&lt;30)</label>
              <input type="number" className="form-input" {...register('youthFishers', { valueAsNumber: true })} /></div>
            <div>
              <label className="form-label">Primary Income</label>
              <select className="form-input" {...register('primaryIncomeSource')}>
                <option value="">Select...</option>
                <option value="fishing">Fishing</option>
                <option value="agriculture">Agriculture</option>
                <option value="both">Both</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label className="form-label">Avg Monthly Income (VUV)</label>
              <input type="number" className="form-input" {...register('averageMonthlyIncomeFishing', { valueAsNumber: true })} /></div>
          </div>
        </div>

        <div className="card space-y-4">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">CBFM Governance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="cbfmCommittee" className="rounded border-gray-300 text-ocean-600" {...register('hasCBFMCommittee')} />
              <label htmlFor="cbfmCommittee" className="text-sm text-gray-700">Has CBFM Committee</label>
            </div>
            <div><label className="form-label">Committee Size</label>
              <input type="number" className="form-input" {...register('committeeSize', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Female Committee Members</label>
              <input type="number" className="form-input" {...register('femaleMembersOnCommittee', { valueAsNumber: true })} /></div>
            <div className="flex items-center gap-3 mt-4">
              <input type="checkbox" id="fishingRules" className="rounded border-gray-300 text-ocean-600" {...register('hasFishingRules')} />
              <label htmlFor="fishingRules" className="text-sm text-gray-700">Has Community Fishing Rules</label>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <input type="checkbox" id="tabooArea" className="rounded border-gray-300 text-ocean-600" {...register('hasTabooArea')} />
              <label htmlFor="tabooArea" className="text-sm text-gray-700">Has Taboo / Closed Area</label>
            </div>
            <div><label className="form-label">Taboo Area Size (ha)</label>
              <input type="number" step="0.1" className="form-input" {...register('tabooAreaSizeHa', { valueAsNumber: true })} /></div>
            <div><label className="form-label">Last Taboo Lift (Year)</label>
              <input type="number" className="form-input" placeholder="e.g. 2023" {...register('lastTabooLiftYear', { valueAsNumber: true })} /></div>
          </div>
        </div>

        <div className="card space-y-5">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <h3 className="font-semibold text-ocean-800 border-b border-gray-100 pb-2">Challenges & Capacity</h3>
          <Controller name="challenges" control={control}
            render={({ field }) => (
              <CheckboxGroup label="Challenges Faced" options={COMMON_CHALLENGES} value={field.value} onChange={field.onChange} />
            )} />
          <Controller name="trainingReceived" control={control}
            render={({ field }) => (
              <CheckboxGroup label="Training Received" options={TRAINING_TYPES} value={field.value} onChange={field.onChange} />
            )} />
        </div>

        <div className="card">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
          <label className="form-label">Additional Notes</label>
          <textarea className="form-input" rows={3} {...register('notes')} />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Survey' : 'Submit Survey'}
          </button>
        </div>
      </form>
      </div>{/* xl:col-span-2 */}
      <div className="xl:col-span-1">
        <FormSidebar type="survey" />
      </div>
      </div>{/* grid */}
    </div>
  );
}
