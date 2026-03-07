import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { VANUATU_PROVINCES } from '../utils/constants';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const profile = await registerUser(data);
      if (profile.status === 'pending') {
        toast.success('Registration submitted! You will be notified once an admin approves your account.', { duration: 7000 });
        navigate('/login');
      } else {
        toast.success('Account created! Welcome.');
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists.');
      } else {
        toast.error(err.message || 'Registration failed.');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-blue-50">

      {/* Left accent strip (desktop) */}
      <div className="hidden lg:flex lg:w-[38%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)' }}>
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)' }} />

        <div className="relative z-10">
          {/* Logos */}
          <div className="flex items-center gap-4 mb-10">
            <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
              alt="Vanuatu Coat of Arms" className="w-12 h-12 object-contain drop-shadow-lg" />
            <div className="w-px h-10 bg-white/15" />
            <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
              alt="Vanuatu Fisheries" className="w-12 h-12 object-contain drop-shadow-lg" />
          </div>

          <div className="gold-line w-12 mb-8" />

          <p className="text-gold-400 text-xs font-semibold uppercase tracking-[0.18em] mb-3">
            CBFM Platform
          </p>
          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            Create your<br />account
          </h2>
          <p className="text-navy-300 text-sm leading-relaxed">
            Register to access Vanuatu&apos;s Community-Based Fisheries Management
            platform. Your account will be reviewed and activated by an administrator.
          </p>
        </div>

        <p className="text-navy-500 text-[11px] relative z-10">
          &copy; {new Date().getFullYear()} Vanuatu Dept. of Fisheries
        </p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-white">
          <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
            alt="Vanuatu Coat of Arms" className="w-9 h-9 object-contain" />
          <div className="w-px h-7 bg-gray-200" />
          <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
            alt="Vanuatu Fisheries" className="w-9 h-9 object-contain" />
          <div>
            <p className="font-bold text-gray-900 text-sm">CBFM Platform</p>
            <p className="text-gray-400 text-xs">Vanuatu Dept. of Fisheries</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-xl fade-in">

            {/* Page heading (desktop only — mobile has it in sidebar) */}
            <div className="hidden lg:block mb-7">
              <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
              <p className="text-gray-400 text-sm mt-1">
                All fields marked * are required. Your account will be pending admin approval.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-card-lg border border-gray-100 p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {/* Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name *</label>
                    <input className="form-input" placeholder="John"
                      {...register('firstName', { required: true })} />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input className="form-input" placeholder="Doe"
                      {...register('lastName', { required: true })} />
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">Required</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-input" placeholder="you@fisheries.gov.vu"
                    {...register('email', { required: true })} />
                </div>

                {/* Password */}
                <div>
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-input" placeholder="Minimum 8 characters"
                    {...register('password', { required: true, minLength: 8 })} />
                  {errors.password && <p className="text-red-500 text-xs mt-1">Minimum 8 characters</p>}
                </div>

                {/* Organization */}
                <div>
                  <label className="form-label">Organization / Department</label>
                  <input className="form-input" placeholder="e.g. Department of Fisheries"
                    {...register('organization')} />
                </div>

                {/* Province */}
                <div>
                  <label className="form-label">Province</label>
                  <select className="form-input" {...register('province')}>
                    <option value="">Select Province</option>
                    {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
                  {isSubmitting ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-navy-700 font-semibold hover:underline underline-offset-2">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
