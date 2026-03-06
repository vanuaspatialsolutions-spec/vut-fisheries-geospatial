import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Map, BarChart3, Shield, Users } from 'lucide-react';

const features = [
  { icon: Map,       label: 'Spatial Data Management',  desc: 'Visualise LMMAs and marine zones across Vanuatu' },
  { icon: BarChart3, label: 'Real-time Analytics',      desc: 'Live dashboards for reef health and catch data' },
  { icon: Users,     label: 'Community Surveys',        desc: 'Centralised CBFM surveys and monitoring records' },
  { icon: Shield,    label: 'Secure & Role-based',      desc: 'Admin, staff, and community officer access levels' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

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
        toast.error(err.message, { duration: 6000 });
      } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Invalid email or password.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Left panel — branding (desktop) ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-animate flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #071529 0%, #0c2040 40%, #112f53 70%, #1a4470 100%)' }}>

        {/* Dot-grid texture */}
        <div className="absolute inset-0 dot-grid" />
        {/* Radial glow bottom-right */}
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,169,42,0.12) 0%, transparent 70%)' }} />
        {/* Radial glow top-left */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(90,141,192,0.15) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">

          {/* ── Logos row ── */}
          <div className="flex items-center gap-0 mb-12">
            {/* Coat of Arms */}
            <div className="flex items-center gap-4 pr-6 border-r border-white/15">
              <img
                src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
                alt="Vanuatu Coat of Arms"
                className="w-16 h-16 object-contain drop-shadow-lg flex-shrink-0"
              />
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Republic of Vanuatu</p>
                <p className="text-navy-300 text-xs mt-0.5">Government of Vanuatu</p>
              </div>
            </div>
            {/* Fisheries Logo */}
            <div className="flex items-center gap-4 pl-6">
              <img
                src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
                alt="Vanuatu Fisheries"
                className="w-16 h-16 object-contain drop-shadow-lg flex-shrink-0"
              />
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Department of Fisheries</p>
                <p className="text-navy-300 text-xs mt-0.5">Ministry of Agriculture</p>
              </div>
            </div>
          </div>

          {/* ── Gold divider ── */}
          <div className="gold-line w-16 mb-10" />

          {/* ── Hero text ── */}
          <div className="flex-1">
            <p className="text-gold-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4">
              CBFM Platform
            </p>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-5">
              Community-Based<br />
              <span className="text-navy-300">Fisheries</span>{' '}
              <span className="text-white">Management</span>
            </h1>
            <p className="text-navy-300 text-base leading-relaxed max-w-md">
              Tracking, monitoring, and sustainably managing Vanuatu&apos;s
              coastal marine resources and fishing communities.
            </p>
          </div>

          {/* ── Feature list ── */}
          <div className="space-y-4 mb-10">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <Icon size={15} className="text-gold-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-navy-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <div className="pt-6 border-t border-white/10">
            <p className="text-navy-500 text-[11px]">
              &copy; {new Date().getFullYear()} Vanuatu Department of Fisheries &mdash; All rights reserved
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — sign-in form ── */}
      <div className="flex-1 flex flex-col">

        {/* Mobile-only header */}
        <div className="lg:hidden flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
            alt="Vanuatu Coat of Arms" className="w-10 h-10 object-contain" />
          <div className="w-px h-8 bg-gray-200" />
          <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
            alt="Vanuatu Fisheries" className="w-10 h-10 object-contain" />
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">CBFM Platform</p>
            <p className="text-gray-400 text-xs">Vanuatu Dept. of Fisheries</p>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          <div className="w-full max-w-[400px] fade-in">

            {/* Form card */}
            <div className="bg-white rounded-2xl shadow-card-lg border border-gray-100 p-8">

              {/* Heading */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in</h2>
                <p className="text-gray-400 text-sm mt-1">Enter your credentials to access the platform</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@fisheries.gov.vu"
                    autoComplete="email"
                    {...register('email', { required: 'Email is required' })}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="form-label">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input pr-11"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...register('password', { required: 'Password is required' })}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowPass(!showPass)}
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 mt-2">
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : 'Sign in'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="text-navy-700 font-semibold hover:text-navy-800 hover:underline underline-offset-2">
                    Register
                  </Link>
                </p>
              </div>
            </div>

            <p className="text-center text-gray-400 text-[11px] mt-5">
              Secure platform access &mdash; Community-Based Fisheries Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
