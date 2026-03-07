import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Map, BarChart3, Shield, Users, KeyRound, ArrowLeft, Anchor } from 'lucide-react';

const features = [
  { icon: Map,       label: 'Spatial Data Management',  desc: 'Visualise LMMAs and marine zones across Vanuatu' },
  { icon: BarChart3, label: 'Real-time Analytics',      desc: 'Live dashboards for reef health and catch data' },
  { icon: Users,     label: 'Community Surveys',        desc: 'Centralised CBFM surveys and monitoring records' },
  { icon: Shield,    label: 'Secure & Role-based',      desc: 'Admin, staff, and community officer access levels' },
];

/* ── Decorative marine SVG icons for the left panel ── */
function MarineDecorations() {
  return (
    <>
      {/* Large fish — top right */}
      <svg className="marine-drift absolute pointer-events-none" style={{ top:'9%', right:'6%', width:90, height:44, opacity:0.08 }}
        viewBox="0 0 90 44" fill="none">
        <path d="M68,22 C48,6 18,6 5,22 C18,38 48,38 68,22 Z" fill="white"/>
        <path d="M68,22 L88,10 L82,22 L88,34 Z" fill="white"/>
        <circle cx="15" cy="19" r="2.5" fill="#001A38"/>
      </svg>

      {/* Small fish — mid left */}
      <svg className="marine-drift-slow absolute pointer-events-none" style={{ top:'32%', left:'7%', width:48, height:24, opacity:0.07 }}
        viewBox="0 0 48 24" fill="none">
        <path d="M36,12 C24,4 8,4 3,12 C8,20 24,20 36,12 Z" fill="white"/>
        <path d="M36,12 L46,6 L43,12 L46,18 Z" fill="white"/>
      </svg>

      {/* Tiny fish — center */}
      <svg className="marine-drift-fast absolute pointer-events-none" style={{ top:'55%', left:'22%', width:32, height:16, opacity:0.06 }}
        viewBox="0 0 32 16" fill="none">
        <path d="M24,8 C16,2.5 5,2.5 2,8 C5,13.5 16,13.5 24,8 Z" fill="white"/>
        <path d="M24,8 L31,4 L29,8 L31,12 Z" fill="white"/>
      </svg>

      {/* Coral branch — bottom left */}
      <svg className="marine-drift-slow absolute pointer-events-none" style={{ bottom:'18%', left:'4%', width:52, height:70, opacity:0.09 }}
        viewBox="0 0 52 70" fill="none">
        <path d="M26,70 L26,38 M26,55 L12,34 M26,55 L40,34 M26,44 L14,26 M26,44 L38,26 M26,34 L18,16 M26,34 L34,16"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* Seaweed — bottom right edge */}
      <svg className="marine-drift absolute pointer-events-none" style={{ bottom:'16%', right:'5%', width:28, height:64, opacity:0.08 }}
        viewBox="0 0 28 64" fill="none">
        <path d="M14,64 C14,64 2,52 14,40 C26,28 4,18 14,8 C20,2 18,0 14,0"
          stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M20,64 C20,64 10,54 20,44 C28,36 14,26 22,14"
          stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
      </svg>

      {/* Starfish — mid right */}
      <svg className="marine-drift-slow absolute pointer-events-none" style={{ top:'46%', right:'10%', width:44, height:44, opacity:0.07 }}
        viewBox="0 0 44 44" fill="none">
        <path d="M22,4 L25,17 L38,12 L29,22 L42,28 L28,26 L31,40 L22,31 L13,40 L16,26 L2,28 L15,22 L6,12 L19,17 Z"
          fill="white"/>
      </svg>

      {/* Bubble cluster — right side */}
      <svg className="bubble-rise absolute pointer-events-none" style={{ top:'64%', right:'14%', width:30, height:72, opacity:0.07 }}
        viewBox="0 0 30 72" fill="none">
        <circle cx="15" cy="66" r="5"   fill="white"/>
        <circle cx="7"  cy="50" r="3.5" fill="white"/>
        <circle cx="21" cy="38" r="4"   fill="white"/>
        <circle cx="11" cy="24" r="2.5" fill="white"/>
        <circle cx="19" cy="10" r="3"   fill="white"/>
      </svg>

      {/* Second bubble cluster — left mid */}
      <svg className="bubble-rise-slow absolute pointer-events-none" style={{ top:'72%', left:'14%', width:22, height:52, opacity:0.06 }}
        viewBox="0 0 22 52" fill="none">
        <circle cx="11" cy="48" r="4"   fill="white"/>
        <circle cx="5"  cy="34" r="2.5" fill="white"/>
        <circle cx="16" cy="22" r="3"   fill="white"/>
        <circle cx="8"  cy="10" r="2"   fill="white"/>
      </svg>

      {/* Anchor decoration — subtle, large, bottom centre */}
      <svg className="absolute pointer-events-none" style={{ bottom:'8%', left:'42%', width:56, height:64, opacity:0.04 }}
        viewBox="0 0 56 64" fill="none">
        <circle cx="28" cy="10" r="8" stroke="white" strokeWidth="3"/>
        <line x1="28" y1="18" x2="28" y2="54" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        <path d="M10,36 C10,50 46,50 46,36" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <circle cx="10" cy="36" r="4" fill="white"/>
        <circle cx="46" cy="36" r="4" fill="white"/>
      </svg>

      {/* Pacific cross motif — top left, large watermark */}
      <svg className="absolute pointer-events-none" style={{ top:'22%', left:'30%', width:80, height:80, opacity:0.03 }}
        viewBox="0 0 80 80" fill="none">
        <line x1="40" y1="5"  x2="40" y2="75" stroke="white" strokeWidth="4"/>
        <line x1="5"  y1="40" x2="75" y2="40" stroke="white" strokeWidth="4"/>
        <circle cx="40" cy="40" r="12" stroke="white" strokeWidth="2.5"/>
        <circle cx="40" cy="40" r="4"  fill="white"/>
      </svg>
    </>
  );
}

function loginErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Use "Forgot password?" to reset.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact the administrator.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts — account temporarily locked. Reset your password or try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled. Contact the administrator.';
    case 'auth/account-pending':
    case 'auth/account-rejected':
      return null;
    default:
      return `Sign-in failed (${code || 'unknown error'}). Try again or reset your password.`;
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const profile = await login(data.email, data.password);
      if (profile?._showApprovalToast) {
        toast.success('Your account has been approved! Welcome to the CBFM Platform.');
      } else {
        toast.success('Welcome back!');
      }
      navigate('/dashboard');
    } catch (err) {
      const code = err.code;
      if (code === 'auth/account-pending' || code === 'auth/account-rejected') {
        toast.error(err.message, { duration: 7000 });
      } else {
        const msg = loginErrorMessage(code);
        toast.error(msg, { duration: 6000 });
      }
    }
  };

  const openResetMode = () => {
    const emailVal = getValues('email');
    setResetEmail(emailVal || '');
    setResetMode(true);
  };

  const sendReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) { toast.error('Enter your email address first.'); return; }
    setResetSending(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      toast.success(`Password reset email sent to ${resetEmail.trim()}. Check your inbox.`, { duration: 8000 });
      setResetMode(false);
    } catch (err) {
      const code = err.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email' || code === 'auth/invalid-credential') {
        toast.success('If that email is registered, a reset link has been sent.', { duration: 8000 });
        setResetMode(false);
      } else if (code === 'auth/too-many-requests') {
        toast.error('Too many requests. Please wait a few minutes before trying again.');
      } else {
        toast.error(`Could not send reset email (${code || 'unknown'}). Try again.`);
      }
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#000F24' }}>

      {/* ─────────────────────────────────────────────────────
          Left panel — deep ocean blue with Pacific marine art
          ───────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[56%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #000F24 0%, #001A38 25%, #002855 55%, #003B7A 80%, #0051A8 100%)' }}
      >
        {/* Pacific tapa diamond pattern */}
        <div className="absolute inset-0 pacific-tapa" />
        {/* Horizontal ocean ripple stripes */}
        <div className="absolute inset-0 ocean-ripple" />

        {/* Floating orbs — all pure ocean blue */}
        <div className="orb-float absolute top-[8%] left-[5%] w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,98,230,0.22) 0%, rgba(0,59,122,0.08) 60%, transparent 80%)' }} />
        <div className="orb-float-slow absolute top-[42%] right-[-10%] w-[30rem] h-[30rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(74,168,255,0.12) 0%, rgba(0,98,230,0.05) 55%, transparent 78%)' }} />
        <div className="orb-float absolute bottom-[22%] left-[16%] w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,81,168,0.28) 0%, transparent 70%)' }} />

        {/* Concentric rings — ocean blue only */}
        <div className="absolute top-[16%] right-[10%] pointer-events-none" style={{ width:160, height:160 }}>
          <div style={{ position:'absolute', inset:0,              borderRadius:'50%', border:'1px solid rgba(74,168,255,0.10)' }} />
          <div style={{ position:'absolute', top:'20%', left:'20%', right:'20%', bottom:'20%', borderRadius:'50%', border:'1px solid rgba(74,168,255,0.17)' }} />
          <div style={{ position:'absolute', top:'38%', left:'38%', right:'38%', bottom:'38%', borderRadius:'50%', border:'1px solid rgba(74,168,255,0.26)' }} />
        </div>
        <div className="absolute bottom-[28%] right-[5%] pointer-events-none"
          style={{ width:224, height:224, borderRadius:'50%', border:'1px solid rgba(74,168,255,0.07)' }} />

        {/* Vertical shimmer — pure blue */}
        <div className="absolute top-0 right-[24%] w-px h-full pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(74,168,255,0.12) 35%, rgba(0,98,230,0.18) 70%, transparent 100%)' }} />

        {/* Marine icon decorations */}
        <MarineDecorations />

        {/* Animated ocean waves */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height:130 }}>
          <div className="wave-animate" style={{ display:'flex', width:'200%' }}>
            {[0,1].map(i => (
              <svg key={i} viewBox="0 0 1440 130" preserveAspectRatio="none"
                style={{ width:'50%', height:130, flexShrink:0 }}>
                <path d="M0,50 C240,100 480,10 720,55 C960,100 1200,15 1440,50 L1440,130 L0,130 Z"
                  fill="rgba(0,98,230,0.14)" />
              </svg>
            ))}
          </div>
          <div className="wave-animate-slow" style={{ display:'flex', width:'200%', marginTop:-75 }}>
            {[0,1].map(i => (
              <svg key={i} viewBox="0 0 1440 130" preserveAspectRatio="none"
                style={{ width:'50%', height:130, flexShrink:0 }}>
                <path d="M0,35 C300,85 600,5 900,45 C1100,75 1280,20 1440,35 L1440,130 L0,130 Z"
                  fill="rgba(0,15,36,0.68)" />
              </svg>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">

          {/* Logos */}
          <div className="flex items-center gap-0 mb-12">
            <div className="flex items-center gap-4 pr-6 border-r" style={{ borderColor:'rgba(255,255,255,0.10)' }}>
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-xl pointer-events-none"
                  style={{ background:'rgba(74,168,255,0.20)' }} />
                <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`} alt="Vanuatu Coat of Arms"
                  className="relative w-16 h-16 object-contain drop-shadow-lg flex-shrink-0" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Republic of Vanuatu</p>
                <p className="text-xs mt-0.5" style={{ color:'#A9CFFF' }}>Government of Vanuatu</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pl-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-xl pointer-events-none"
                  style={{ background:'rgba(0,98,230,0.22)' }} />
                <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`} alt="Vanuatu Fisheries"
                  className="relative w-16 h-16 object-contain drop-shadow-lg flex-shrink-0" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Department of Fisheries</p>
                <p className="text-xs mt-0.5" style={{ color:'#A9CFFF' }}>Ministry of Agriculture</p>
              </div>
            </div>
          </div>

          {/* Ocean accent line — pure blue */}
          <div className="ocean-line w-24 mb-10" />

          {/* Hero */}
          <div className="flex-1">
            {/* Platform badge */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background:'rgba(74,168,255,0.15)', border:'1px solid rgba(74,168,255,0.28)' }}>
                {/* Mini fish icon inline */}
                <svg viewBox="0 0 16 9" width="13" height="7" fill="none">
                  <path d="M12,4.5 C8,1.2 3,1.2 1,4.5 C3,7.8 8,7.8 12,4.5 Z M12,4.5 L15.5,2 L14,4.5 L15.5,7 Z" fill="#4AA8FF"/>
                </svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color:'#4AA8FF' }}>
                CBFM Platform
              </p>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-5">
              Community-Based<br />
              <span style={{ color:'#6AAFFF' }}>Fisheries</span>{' '}
              <span className="text-white">Management</span>
            </h1>
            <p className="text-sm leading-relaxed max-w-md mb-8" style={{ color:'rgba(164,204,255,0.80)' }}>
              Tracking, monitoring, and sustainably managing Vanuatu&apos;s coastal marine
              resources and fishing communities across all six provinces.
            </p>

            {/* Quick stats */}
            <div className="flex items-center gap-6 mb-8">
              {[
                { icon: '⚓', value:'6',    label:'Provinces' },
                { icon: '🌊', value:'5M+',  label:'Ha Waters' },
                { icon: '🔒', value:'100%', label:'Secure' },
              ].map(({ icon, value, label }) => (
                <div key={label} className="text-center">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5 text-base"
                    style={{ background:'rgba(74,168,255,0.10)', border:'1px solid rgba(74,168,255,0.18)' }}>
                    {icon}
                  </div>
                  <p className="text-white font-bold text-base leading-none">{value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color:'rgba(164,204,255,0.60)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3.5 mb-10">
            {features.map(({ icon:Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background:'rgba(0,98,230,0.18)', border:'1px solid rgba(74,168,255,0.22)' }}>
                  <Icon size={14} style={{ color:'#6AAFFF' }} />
                </div>
                <div>
                  <p className="text-white text-sm font-medium leading-tight">{label}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color:'rgba(164,204,255,0.58)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-5 border-t" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
            <p className="text-[11px]" style={{ color:'rgba(100,143,200,0.60)' }}>
              &copy; {new Date().getFullYear()} Vanuatu Department of Fisheries &mdash; All rights reserved
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────
          Right panel — sign-in / reset-password form
          ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col" style={{ background:'#F4F9FF' }}>

        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-4 px-6 py-5 border-b bg-white"
          style={{ borderColor:'rgba(0,59,122,0.10)' }}>
          <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
            alt="Vanuatu Coat of Arms" className="w-10 h-10 object-contain" />
          <div className="w-px h-8" style={{ background:'rgba(0,59,122,0.12)' }} />
          <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
            alt="Vanuatu Fisheries" className="w-10 h-10 object-contain" />
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">CBFM Platform</p>
            <p className="text-gray-400 text-xs">Vanuatu Dept. of Fisheries</p>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          <div className="absolute inset-0 hex-grid-light" />

          <div className="relative z-10 w-full max-w-[400px] fade-in">

            {!resetMode ? (
              /* ── Sign-in card ── */
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{
                  border:'1px solid rgba(0,59,122,0.10)',
                  boxShadow:'0 24px 64px rgba(0,27,70,0.14), 0 4px 16px rgba(0,27,70,0.08)',
                }}>
                {/* Top accent bar — full ocean blue spectrum, no cyan */}
                <div className="h-1"
                  style={{ background:'linear-gradient(90deg, #000F24 0%, #002855 30%, #003B7A 55%, #0062E6 80%, #4AA8FF 100%)' }} />

                <div className="p-8">
                  <div className="mb-7">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ background:'linear-gradient(135deg, #001A38, #003B7A)', boxShadow:'0 4px 16px rgba(0,27,70,0.30)' }}>
                      <Anchor size={20} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color:'#001A38' }}>Sign in</h2>
                    <p className="text-gray-400 text-sm mt-1">Enter your credentials to access the platform</p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                      <label className="form-label">Email address</label>
                      <input type="email" className="form-input" placeholder="you@fisheries.gov.vu"
                        autoComplete="email" {...register('email', { required:'Email is required' })} />
                      {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="form-label !mb-0">Password</label>
                        <button type="button" onClick={openResetMode}
                          className="text-xs font-medium transition-colors hover:underline underline-offset-2"
                          style={{ color:'#0051A8' }}>
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input type={showPass ? 'text' : 'password'} className="form-input pr-11"
                          placeholder="Enter your password" autoComplete="current-password"
                          {...register('password', { required:'Password is required' })} />
                        <button type="button" tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => setShowPass(s => !s)}>
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
                    </div>

                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 mt-1">
                      {isSubmitting
                        ? <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in…
                          </span>
                        : 'Sign in'}
                    </button>
                  </form>

                  <div className="mt-6 pt-5 border-t text-center" style={{ borderColor:'rgba(0,59,122,0.07)' }}>
                    <p className="text-sm text-gray-400">
                      Account access is managed by the platform administrator.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Forgot Password card ── */
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{
                  border:'1px solid rgba(0,59,122,0.10)',
                  boxShadow:'0 24px 64px rgba(0,27,70,0.14), 0 4px 16px rgba(0,27,70,0.08)',
                }}>
                <div className="h-1"
                  style={{ background:'linear-gradient(90deg, #000F24 0%, #002855 30%, #003B7A 55%, #0062E6 80%, #4AA8FF 100%)' }} />

                <div className="p-8">
                  <button onClick={() => setResetMode(false)}
                    className="flex items-center gap-1.5 text-sm mb-6 text-gray-400 hover:text-gray-700 transition-colors">
                    <ArrowLeft size={14} /> Back to sign in
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background:'linear-gradient(135deg, #001A38, #003B7A)', boxShadow:'0 4px 16px rgba(0,27,70,0.30)' }}>
                      <KeyRound size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight" style={{ color:'#001A38' }}>Reset password</h2>
                      <p className="text-gray-400 text-sm">We&apos;ll send a reset link to your email</p>
                    </div>
                  </div>

                  <form onSubmit={sendReset} className="space-y-4">
                    <div>
                      <label className="form-label">Email address</label>
                      <input type="email" className="form-input" placeholder="you@fisheries.gov.vu"
                        value={resetEmail} onChange={e => setResetEmail(e.target.value)} autoFocus required />
                    </div>
                    <button type="submit" disabled={resetSending} className="btn-primary w-full py-3">
                      {resetSending
                        ? <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending…
                          </span>
                        : 'Send reset link'}
                    </button>
                  </form>

                  <p className="text-xs text-gray-400 mt-4 text-center">
                    Check your spam folder if the email doesn&apos;t arrive within a few minutes.
                  </p>
                </div>
              </div>
            )}

            <p className="text-center text-xs mt-5" style={{ color:'rgba(0,59,122,0.38)' }}>
              Secure platform access &mdash; Community-Based Fisheries Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
