import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Map, BarChart3, Shield, Users, KeyRound, ArrowLeft, Fish, Waves, Anchor } from 'lucide-react';

const features = [
  { icon: Map,       label: 'Spatial Data Management',  desc: 'Visualise LMMAs and marine zones across Vanuatu' },
  { icon: BarChart3, label: 'Real-time Analytics',      desc: 'Live dashboards for reef health and catch data' },
  { icon: Users,     label: 'Community Surveys',        desc: 'Centralised CBFM surveys and monitoring records' },
  { icon: Shield,    label: 'Secure & Role-based',      desc: 'Admin, staff, and community officer access levels' },
];

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
          Left panel — immersive Dept. of Fisheries branding
          ───────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[56%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #000F24 0%, #001A38 25%, #002855 55%, #003B7A 80%, #0051A8 100%)' }}
      >
        {/* Fish-scale texture */}
        <div className="absolute inset-0 fish-scale" />
        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.45 }} />

        {/* Floating orbs */}
        <div className="orb-float absolute top-[8%] left-[5%] w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,98,230,0.22) 0%, rgba(0,59,122,0.08) 60%, transparent 80%)' }} />
        <div className="orb-float-slow absolute top-[40%] right-[-8%] w-[28rem] h-[28rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.14) 0%, rgba(0,98,230,0.05) 55%, transparent 78%)' }} />
        <div className="orb-float absolute bottom-[20%] left-[15%] w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,81,168,0.26) 0%, transparent 70%)' }} />

        {/* Concentric ring decorations */}
        <div className="absolute top-[16%] right-[10%] pointer-events-none" style={{ width: 160, height: 160 }}>
          <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1px solid rgba(34,211,238,0.09)' }} />
          <div style={{ position:'absolute', top:'20%', left:'20%', right:'20%', bottom:'20%', borderRadius:'50%', border:'1px solid rgba(34,211,238,0.15)' }} />
          <div style={{ position:'absolute', top:'38%', left:'38%', right:'38%', bottom:'38%', borderRadius:'50%', border:'1px solid rgba(34,211,238,0.24)' }} />
        </div>
        <div className="absolute bottom-[28%] right-[5%] pointer-events-none"
          style={{ width:224, height:224, borderRadius:'50%', border:'1px solid rgba(51,136,255,0.08)' }} />

        {/* Vertical shimmer line */}
        <div className="absolute top-0 right-[24%] w-px h-full pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.10) 35%, rgba(0,98,230,0.16) 70%, transparent 100%)' }} />

        {/* Animated ocean waves */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height:130 }}>
          <div className="wave-animate" style={{ display:'flex', width:'200%' }}>
            {[0,1].map(i => (
              <svg key={i} viewBox="0 0 1440 130" preserveAspectRatio="none"
                style={{ width:'50%', height:130, flexShrink:0 }}>
                <path d="M0,50 C240,100 480,10 720,55 C960,100 1200,15 1440,50 L1440,130 L0,130 Z"
                  fill="rgba(0,98,230,0.13)" />
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
                  style={{ background:'rgba(34,211,238,0.18)' }} />
                <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`} alt="Vanuatu Coat of Arms"
                  className="relative w-16 h-16 object-contain drop-shadow-lg flex-shrink-0" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Republic of Vanuatu</p>
                <p className="text-xs mt-0.5" style={{ color:'#6AAFFF' }}>Government of Vanuatu</p>
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
                <p className="text-xs mt-0.5" style={{ color:'#6AAFFF' }}>Ministry of Agriculture</p>
              </div>
            </div>
          </div>

          {/* Cyan accent line */}
          <div className="gold-line w-24 mb-10" />

          {/* Hero */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background:'rgba(34,211,238,0.15)', border:'1px solid rgba(34,211,238,0.28)' }}>
                <Fish size={13} style={{ color:'#22D3EE' }} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color:'#22D3EE' }}>
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

            {/* Stats */}
            <div className="flex items-center gap-6 mb-8">
              {[
                { icon: Anchor, value:'6',    label:'Provinces' },
                { icon: Waves,  value:'5M+',  label:'Ha Waters' },
                { icon: Shield, value:'100%', label:'Secure' },
              ].map(({ icon:Icon, value, label }) => (
                <div key={label} className="text-center">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                    style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.09)' }}>
                    <Icon size={15} style={{ color:'#22D3EE' }} />
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
                  style={{ background:'rgba(0,98,230,0.18)', border:'1px solid rgba(51,136,255,0.22)' }}>
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
                <div className="h-1"
                  style={{ background:'linear-gradient(90deg, #001A38 0%, #003B7A 35%, #0062E6 65%, #22D3EE 100%)' }} />

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
                  style={{ background:'linear-gradient(90deg, #001A38 0%, #003B7A 35%, #0062E6 65%, #22D3EE 100%)' }} />

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
