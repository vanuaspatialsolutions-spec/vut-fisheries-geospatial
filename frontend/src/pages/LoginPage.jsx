import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import SingularityWaveShader from '../components/ui/shader-animation';

/* ── Decorative marine SVG icons ── */
function MarineDecorations() {
  return (
    <>
      <svg className="marine-drift absolute pointer-events-none" style={{ top:'7%', right:'8%', width:100, height:48, opacity:0.07 }}
        viewBox="0 0 90 44" fill="none">
        <path d="M68,22 C48,6 18,6 5,22 C18,38 48,38 68,22 Z" fill="white"/>
        <path d="M68,22 L88,10 L82,22 L88,34 Z" fill="white"/>
        <circle cx="15" cy="19" r="2.5" fill="#001A38"/>
      </svg>
      <svg className="marine-drift-slow absolute pointer-events-none" style={{ top:'28%', left:'5%', width:52, height:26, opacity:0.06 }}
        viewBox="0 0 48 24" fill="none">
        <path d="M36,12 C24,4 8,4 3,12 C8,20 24,20 36,12 Z" fill="white"/>
        <path d="M36,12 L46,6 L43,12 L46,18 Z" fill="white"/>
      </svg>
      <svg className="marine-drift-fast absolute pointer-events-none" style={{ top:'58%', right:'12%', width:36, height:18, opacity:0.05 }}
        viewBox="0 0 32 16" fill="none">
        <path d="M24,8 C16,2.5 5,2.5 2,8 C5,13.5 16,13.5 24,8 Z" fill="white"/>
        <path d="M24,8 L31,4 L29,8 L31,12 Z" fill="white"/>
      </svg>
      <svg className="marine-drift-slow absolute pointer-events-none" style={{ bottom:'20%', left:'6%', width:52, height:70, opacity:0.08 }}
        viewBox="0 0 52 70" fill="none">
        <path d="M26,70 L26,38 M26,55 L12,34 M26,55 L40,34 M26,44 L14,26 M26,44 L38,26 M26,34 L18,16 M26,34 L34,16"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <svg className="marine-drift-slow absolute pointer-events-none" style={{ top:'44%', right:'5%', width:44, height:44, opacity:0.06 }}
        viewBox="0 0 44 44" fill="none">
        <path d="M22,4 L25,17 L38,12 L29,22 L42,28 L28,26 L31,40 L22,31 L13,40 L16,26 L2,28 L15,22 L6,12 L19,17 Z"
          fill="white"/>
      </svg>
      <svg className="bubble-rise absolute pointer-events-none" style={{ top:'60%', left:'10%', width:30, height:72, opacity:0.06 }}
        viewBox="0 0 30 72" fill="none">
        <circle cx="15" cy="66" r="5"   fill="white"/>
        <circle cx="7"  cy="50" r="3.5" fill="white"/>
        <circle cx="21" cy="38" r="4"   fill="white"/>
        <circle cx="11" cy="24" r="2.5" fill="white"/>
        <circle cx="19" cy="10" r="3"   fill="white"/>
      </svg>
      <svg className="bubble-rise-slow absolute pointer-events-none" style={{ top:'70%', right:'18%', width:22, height:52, opacity:0.05 }}
        viewBox="0 0 22 52" fill="none">
        <circle cx="11" cy="48" r="4"   fill="white"/>
        <circle cx="5"  cy="34" r="2.5" fill="white"/>
        <circle cx="16" cy="22" r="3"   fill="white"/>
        <circle cx="8"  cy="10" r="2"   fill="white"/>
      </svg>
      {/* Large watermark anchor — center background */}
      <svg className="absolute pointer-events-none" style={{ top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:320, height:360, opacity:0.025 }}
        viewBox="0 0 56 64" fill="none">
        <circle cx="28" cy="10" r="8" stroke="white" strokeWidth="3"/>
        <line x1="28" y1="18" x2="28" y2="54" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        <path d="M10,36 C10,50 46,50 46,36" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <circle cx="10" cy="36" r="4" fill="white"/>
        <circle cx="46" cy="36" r="4" fill="white"/>
      </svg>
      {/* Concentric rings — top left */}
      <div className="absolute top-[12%] left-[8%] pointer-events-none" style={{ width:140, height:140 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1px solid rgba(74,168,255,0.09)' }} />
        <div style={{ position:'absolute', top:'20%', left:'20%', right:'20%', bottom:'20%', borderRadius:'50%', border:'1px solid rgba(74,168,255,0.15)' }} />
        <div style={{ position:'absolute', top:'38%', left:'38%', right:'38%', bottom:'38%', borderRadius:'50%', border:'1px solid rgba(74,168,255,0.22)' }} />
      </div>
      {/* Concentric rings — bottom right */}
      <div className="absolute bottom-[14%] right-[7%] pointer-events-none" style={{ width:200, height:200 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1px solid rgba(74,168,255,0.07)' }} />
        <div style={{ position:'absolute', top:'22%', left:'22%', right:'22%', bottom:'22%', borderRadius:'50%', border:'1px solid rgba(74,168,255,0.12)' }} />
      </div>
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
    <div className="min-h-screen relative flex flex-col items-center justify-center py-12 px-4 overflow-hidden"
      style={{ background: '#000F24' }}>

      {/* WebGL shader — z-0, fixed full-screen */}
      <SingularityWaveShader />

      {/* Marine SVG decorations — z-1, overlaid on shader */}
      <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
        <MarineDecorations />
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center fade-in">

        {/* Logos — centred above the card */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
                style={{ background:'rgba(74,168,255,0.25)' }} />
              <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
                alt="Vanuatu Coat of Arms"
                className="relative w-20 h-20 object-contain drop-shadow-2xl flex-shrink-0" />
            </div>
            <p className="text-white text-[11px] font-semibold tracking-wide text-center leading-tight opacity-90">
              Republic of Vanuatu
            </p>
          </div>

          {/* Divider */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-px h-10" style={{ background:'rgba(255,255,255,0.18)' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background:'rgba(74,168,255,0.50)' }} />
            <div className="w-px h-10" style={{ background:'rgba(255,255,255,0.18)' }} />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
                style={{ background:'rgba(0,98,230,0.28)' }} />
              <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
                alt="Vanuatu Fisheries"
                className="relative w-20 h-20 object-contain drop-shadow-2xl flex-shrink-0" />
            </div>
            <p className="text-white text-[11px] font-semibold tracking-wide text-center leading-tight opacity-90">
              Department of Fisheries
            </p>
          </div>
        </div>

        {/* Platform title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
            Community-Based<br />
            <span style={{ color:'#6AAFFF' }}>Fisheries</span> Management
          </h1>
          <p className="text-xs mt-2" style={{ color:'rgba(164,204,255,0.65)' }}>
            CBFM Platform &mdash; Vanuatu Department of Fisheries
          </p>
        </div>

        {/* ── Sign-in / Reset card ── */}
        {!resetMode ? (
          <div className="w-full bg-white rounded-2xl overflow-hidden"
            style={{
              border:'1px solid rgba(0,59,122,0.12)',
              boxShadow:'0 32px 80px rgba(0,15,36,0.55), 0 8px 24px rgba(0,15,36,0.30)',
            }}>
            <div className="h-1"
              style={{ background:'linear-gradient(90deg, #000F24 0%, #002855 30%, #003B7A 55%, #0062E6 80%, #4AA8FF 100%)' }} />

            <div className="p-8">
              <div className="mb-7">
                <h2 className="text-xl font-bold tracking-tight" style={{ color:'#001A38' }}>Sign in</h2>
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
          <div className="w-full bg-white rounded-2xl overflow-hidden"
            style={{
              border:'1px solid rgba(0,59,122,0.12)',
              boxShadow:'0 32px 80px rgba(0,15,36,0.55), 0 8px 24px rgba(0,15,36,0.30)',
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

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[11px]" style={{ color:'rgba(100,143,200,0.50)' }}>
            &copy; {new Date().getFullYear()} Vanuatu Department of Fisheries &mdash; All rights reserved
          </p>
          <p className="text-[10px]" style={{ color:'rgba(100,143,200,0.35)' }}>
            Prototype developed by{' '}
            <span style={{ color:'rgba(74,168,255,0.55)', fontWeight:600 }}>Vanua Spatial Solutions</span>
            {' '}for the Vanuatu Department of Fisheries
          </p>
        </div>
      </div>
    </div>
  );
}
