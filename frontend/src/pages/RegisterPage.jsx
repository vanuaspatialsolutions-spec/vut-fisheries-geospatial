import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { VANUATU_PROVINCES } from '../utils/constants';

/* Compact marine decorations for the register left panel */
function RegisterMarineDecos() {
  return (
    <>
      {/* Fish — top right */}
      <svg className="marine-drift absolute pointer-events-none" style={{ top:'8%', right:'4%', width:60, height:30, opacity:0.09 }}
        viewBox="0 0 60 30" fill="none">
        <path d="M46,15 C30,4 10,4 3,15 C10,26 30,26 46,15 Z" fill="white"/>
        <path d="M46,15 L58,7 L54,15 L58,23 Z" fill="white"/>
      </svg>
      {/* Coral */}
      <svg className="marine-drift-slow absolute pointer-events-none" style={{ bottom:'22%', left:'3%', width:40, height:55, opacity:0.09 }}
        viewBox="0 0 40 55" fill="none">
        <path d="M20,55 L20,28 M20,42 L9,26 M20,42 L31,26 M20,34 L11,20 M20,34 L29,20"
          stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
      {/* Bubbles */}
      <svg className="bubble-rise absolute pointer-events-none" style={{ top:'50%', right:'8%', width:22, height:54, opacity:0.07 }}
        viewBox="0 0 22 54" fill="none">
        <circle cx="11" cy="50" r="4"   fill="white"/>
        <circle cx="5"  cy="37" r="2.8" fill="white"/>
        <circle cx="15" cy="25" r="3.2" fill="white"/>
        <circle cx="8"  cy="13" r="2"   fill="white"/>
      </svg>
      {/* Starfish */}
      <svg className="marine-drift-slow absolute pointer-events-none" style={{ top:'30%', left:'5%', width:32, height:32, opacity:0.07 }}
        viewBox="0 0 32 32" fill="none">
        <path d="M16,3 L18,12 L28,9 L21,16 L30,21 L20,19 L22,30 L16,23 L10,30 L12,19 L2,21 L11,16 L4,9 L14,12 Z"
          fill="white"/>
      </svg>
      {/* Seaweed */}
      <svg className="marine-drift absolute pointer-events-none" style={{ bottom:'14%', right:'4%', width:22, height:50, opacity:0.07 }}
        viewBox="0 0 22 50" fill="none">
        <path d="M11,50 C11,50 2,40 11,30 C20,20 3,12 11,4 C15,0 14,0 11,0"
          stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </svg>
      {/* Anchor watermark */}
      <svg className="absolute pointer-events-none" style={{ bottom:'5%', left:'35%', width:44, height:50, opacity:0.035 }}
        viewBox="0 0 44 50" fill="none">
        <circle cx="22" cy="8" r="6" stroke="white" strokeWidth="2.5"/>
        <line x1="22" y1="14" x2="22" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M8,28 C8,38 36,38 36,28" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <circle cx="8" cy="28" r="3" fill="white"/>
        <circle cx="36" cy="28" r="3" fill="white"/>
      </svg>
    </>
  );
}

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
    <div className="min-h-screen flex" style={{ background: '#000F24' }}>

      {/* Left accent panel (desktop) */}
      <div className="hidden lg:flex lg:w-[38%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #000F24 0%, #001A38 25%, #002855 55%, #003B7A 85%, #0051A8 100%)' }}>

        {/* Pacific tapa pattern */}
        <div className="absolute inset-0 pacific-tapa" />
        <div className="absolute inset-0 ocean-ripple" />

        {/* Orbs — pure ocean blue */}
        <div className="orb-float absolute top-[10%] right-[-5%] w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(74,168,255,0.14) 0%, transparent 70%)' }} />
        <div className="orb-float-slow absolute bottom-[15%] left-[-5%] w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,98,230,0.20) 0%, transparent 70%)' }} />

        {/* Ring decoration — ocean blue */}
        <div className="absolute bottom-[30%] right-[8%] pointer-events-none"
          style={{ width:160, height:160, borderRadius:'50%', border:'1px solid rgba(74,168,255,0.10)' }} />

        {/* Marine decorations */}
        <RegisterMarineDecos />

        {/* Animated waves */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height:100 }}>
          <div className="wave-animate" style={{ display:'flex', width:'200%' }}>
            {[0,1].map(i => (
              <svg key={i} viewBox="0 0 1440 100" preserveAspectRatio="none"
                style={{ width:'50%', height:100, flexShrink:0 }}>
                <path d="M0,40 C240,80 480,8 720,44 C960,80 1200,12 1440,40 L1440,100 L0,100 Z"
                  fill="rgba(0,98,230,0.13)" />
              </svg>
            ))}
          </div>
          <div className="wave-animate-slow" style={{ display:'flex', width:'200%', marginTop:-58 }}>
            {[0,1].map(i => (
              <svg key={i} viewBox="0 0 1440 100" preserveAspectRatio="none"
                style={{ width:'50%', height:100, flexShrink:0 }}>
                <path d="M0,28 C300,72 600,4 900,36 C1100,62 1280,16 1440,28 L1440,100 L0,100 Z"
                  fill="rgba(0,15,36,0.65)" />
              </svg>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          {/* Logos */}
          <div className="flex items-center gap-4 mb-10">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl pointer-events-none"
                style={{ background:'rgba(74,168,255,0.18)' }} />
              <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
                alt="Vanuatu Coat of Arms" className="relative w-12 h-12 object-contain drop-shadow-lg" />
            </div>
            <div className="w-px h-10" style={{ background:'rgba(255,255,255,0.12)' }} />
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl pointer-events-none"
                style={{ background:'rgba(0,98,230,0.20)' }} />
              <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
                alt="Vanuatu Fisheries" className="relative w-12 h-12 object-contain drop-shadow-lg" />
            </div>
          </div>

          {/* Ocean accent line */}
          <div className="ocean-line w-16 mb-8" />

          {/* Platform badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background:'rgba(74,168,255,0.15)', border:'1px solid rgba(74,168,255,0.28)' }}>
              <svg viewBox="0 0 16 9" width="11" height="7" fill="none">
                <path d="M12,4.5 C8,1.2 3,1.2 1,4.5 C3,7.8 8,7.8 12,4.5 Z M12,4.5 L15.5,2 L14,4.5 L15.5,7 Z" fill="#4AA8FF"/>
              </svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.20em]" style={{ color:'#4AA8FF' }}>
              CBFM Platform
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            Create your<br />account
          </h2>
          <p className="text-sm leading-relaxed" style={{ color:'rgba(164,204,255,0.78)' }}>
            Register to access Vanuatu&apos;s Community-Based Fisheries Management
            platform. Your account will be reviewed and activated by an administrator.
          </p>
        </div>

        <p className="text-[11px] relative z-10" style={{ color:'rgba(100,143,200,0.60)' }}>
          &copy; {new Date().getFullYear()} Vanuatu Dept. of Fisheries
        </p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col" style={{ background:'#F4F9FF' }}>

        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-6 py-5 border-b bg-white"
          style={{ borderColor:'rgba(0,59,122,0.10)' }}>
          <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
            alt="Vanuatu Coat of Arms" className="w-9 h-9 object-contain" />
          <div className="w-px h-7" style={{ background:'rgba(0,59,122,0.12)' }} />
          <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
            alt="Vanuatu Fisheries" className="w-9 h-9 object-contain" />
          <div>
            <p className="font-bold text-gray-900 text-sm">CBFM Platform</p>
            <p className="text-gray-400 text-xs">Vanuatu Dept. of Fisheries</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-10 relative">
          <div className="absolute inset-0 hex-grid-light" />

          <div className="relative z-10 w-full max-w-xl fade-in">

            <div className="hidden lg:block mb-7">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color:'#001A38' }}>Create Account</h1>
              <p className="text-gray-400 text-sm mt-1">
                All fields marked * are required. Your account will be pending admin approval.
              </p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden"
              style={{
                border:'1px solid rgba(0,59,122,0.10)',
                boxShadow:'0 24px 64px rgba(0,27,70,0.12), 0 4px 16px rgba(0,27,70,0.07)',
              }}>
              {/* Top accent bar — full ocean blue, no cyan */}
              <div className="h-1"
                style={{ background:'linear-gradient(90deg, #000F24 0%, #002855 30%, #003B7A 55%, #0062E6 80%, #4AA8FF 100%)' }} />

              <div className="p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

                  <div>
                    <label className="form-label">Email Address *</label>
                    <input type="email" className="form-input" placeholder="you@fisheries.gov.vu"
                      {...register('email', { required: true })} />
                  </div>

                  <div>
                    <label className="form-label">Password *</label>
                    <input type="password" className="form-input" placeholder="Minimum 8 characters"
                      {...register('password', { required: true, minLength: 8 })} />
                    {errors.password && <p className="text-red-500 text-xs mt-1">Minimum 8 characters</p>}
                  </div>

                  <div>
                    <label className="form-label">Organization / Department</label>
                    <input className="form-input" placeholder="e.g. Department of Fisheries"
                      {...register('organization')} />
                  </div>

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
                  <Link to="/login" className="font-semibold hover:underline underline-offset-2"
                    style={{ color:'#003B7A' }}>Sign in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
