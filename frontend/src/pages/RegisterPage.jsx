import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Fish } from 'lucide-react';
import { VANUATU_PROVINCES } from '../utils/constants';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/register', data);
      await login(data.email, data.password);
      toast.success('Account created! Welcome.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-700 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur rounded-2xl mb-3">
            <Fish size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-ocean-200 text-sm">CBFM Platform – Vanuatu Dept. of Fisheries</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name</label>
                <input className="form-input" {...register('firstName', { required: true })} />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">Required</p>}
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input className="form-input" {...register('lastName', { required: true })} />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">Required</p>}
              </div>
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" {...register('email', { required: true })} />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input type="password" className="form-input" {...register('password', { required: true, minLength: 8 })} />
              {errors.password && <p className="text-red-500 text-xs mt-1">Minimum 8 characters</p>}
            </div>

            <div>
              <label className="form-label">Organization / Department</label>
              <input className="form-input" placeholder="e.g. Department of Fisheries" {...register('organization')} />
            </div>

            <div>
              <label className="form-label">Province</label>
              <select className="form-input" {...register('province')}>
                <option value="">Select Province</option>
                {VANUATU_PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-ocean-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
