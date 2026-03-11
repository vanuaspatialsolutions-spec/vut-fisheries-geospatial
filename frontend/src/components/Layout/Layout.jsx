import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

function CompleteProfilePrompt() {
  const { user, saveProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    role: 'admin',
    organization: '',
    province: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Please enter your first and last name.');
      return;
    }
    setSaving(true);
    try {
      await saveProfile({ ...form, status: 'approved', isActive: true, approvalNotified: true });
      toast.success('Profile saved — welcome!');
    } catch {
      toast.error('Could not save to Firestore, but profile is stored locally.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Top accent */}
        <div className="h-1"
          style={{ background: 'linear-gradient(90deg, #000F24 0%, #002855 30%, #003B7A 55%, #0062E6 80%, #4AA8FF 100%)' }} />

        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #001A38, #003B7A)', boxShadow: '0 4px 14px rgba(0,27,70,0.28)' }}>
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight" style={{ color: '#001A38' }}>Complete Your Profile</h2>
              <p className="text-gray-500 text-xs mt-0.5">Your profile data could not be loaded from the server</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><Shield size={13} /> Firestore rules may not be deployed</p>
            <p className="text-xs text-amber-700">
              Fill in your details below — they will be saved locally and to Firestore (if available).
              To fully fix this, run <code className="bg-amber-100 px-1 rounded font-mono text-xs">firebase deploy --only firestore:rules</code> in the project root.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">First Name *</label>
                <input className="form-input" value={form.firstName}
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={form.lastName}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="community_officer">Community Officer</option>
              </select>
            </div>
            <div>
              <label className="form-label">Organisation (optional)</label>
              <input className="form-input" value={form.organization}
                onChange={e => setForm(p => ({ ...p, organization: e.target.value }))} />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            Logged in as <span className="font-medium">{user?.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
import ErrorBoundary from '../ErrorBoundary';
import { GradientDots } from '../ui/gradient-dots';
import { AuroraBackground } from '../ui/aurora-background';

export default function Layout() {
  const { user } = useAuth();
  const needsProfile = user && !user.role && !user.firstName;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #D8EEFF 0%, #E8F4FF 40%, #EEF6FF 70%, #E0EEFA 100%)' }}>
      {/* Aurora background — soft animated northern-lights */}
      <AuroraBackground style={{ opacity: 0.72, zIndex: 0 }} />
      {/* Gradient-dots on top of aurora for texture */}
      <GradientDots
        dotSize={6}
        spacing={13}
        duration={40}
        colorCycleDuration={10}
        backgroundColor="transparent"
        style={{ opacity: 0.10, zIndex: 1 }}
      />

      {needsProfile && <CompleteProfilePrompt />}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 relative z-10">
        <Header onMenuClick={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Portal footer */}
        <footer className="flex-shrink-0 flex items-center justify-between px-6 py-2"
          style={{
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.55)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.60)',
            minHeight: 36,
          }}>
          <p className="text-[10px]" style={{ color:'rgba(0,59,122,0.38)' }}>
            &copy; {new Date().getFullYear()} Vanuatu Department of Fisheries &mdash; All rights reserved
          </p>
          <p className="text-[10px]" style={{ color:'rgba(0,59,122,0.38)' }}>
            Prototype developed by{' '}
            <span className="font-semibold" style={{ color:'rgba(0,81,168,0.55)' }}>Vanua Spatial Solutions</span>
            {' '}for the Vanuatu Department of Fisheries
          </p>
        </footer>
      </div>
    </div>
  );
}
