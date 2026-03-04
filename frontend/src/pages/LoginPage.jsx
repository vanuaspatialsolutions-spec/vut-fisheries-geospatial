import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Fish, Eye, EyeOff, Map, BarChart3, Shield, Users } from 'lucide-react';

const features = [
  { icon: Map, label: 'Interactive Mapping', desc: 'Visualise LMMAs & marine zones across Vanuatu' },
  { icon: BarChart3, label: 'Real-time Analytics', desc: 'Live dashboards for reef health & catch data' },
  { icon: Users, label: 'Community Data', desc: 'Centralised CBFM surveys & monitoring records' },
  { icon: Shield, label: 'Secure & Role-based', desc: 'Admin, staff, and community officer access' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-700 bg-animate flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 wave-pattern opacity-60" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-ocean-500/20 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center ring-2 ring-white/20">
              <Fish size={26} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-tight">CBFM Platform</p>
              <p className="text-ocean-300 text-xs">Vanuatu Department of Fisheries</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Community-Based<br />Fisheries Management
          </h2>
          <p className="text-ocean-200 text-base leading-relaxed max-w-sm">
            Tracking, monitoring, and managing Vanuatu&apos;s coastal marine resources and communities.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-4">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={16} className="text-ocean-200" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-ocean-300 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-ocean-500 text-xs relative z-10">
          &copy; {new Date().getFullYear()} Vanuatu Dept. of Fisheries &mdash; All rights reserved
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-ocean-700 rounded-xl flex items-center justify-center">
              <Fish size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">CBFM Platform</p>
              <p className="text-gray-500 text-xs">Vanuatu Dept. of Fisheries</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
              <p className="text-gray-500 text-sm mt-1">Enter your credentials to access the platform</p>
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
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input pr-10"
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
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
                )}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5 text-sm mt-1">
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-ocean-700 font-semibold hover:text-ocean-800 hover:underline">
                  Register
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Secure access &mdash; Community-Based Fisheries Management System
          </p>
        </div>
      </div>
    </div>
  );
}
