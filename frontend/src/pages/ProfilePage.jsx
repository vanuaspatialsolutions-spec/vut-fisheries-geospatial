import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Camera, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlowingEffect } from '../components/ui/glowing-effect';

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    position:  user?.position  || '',
    unit:      user?.unit      || '',
  });
  const [saving,          setSaving]          = useState(false);
  const [uploading,       setUploading]       = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState(null);
  const [previewURL,      setPreviewURL]      = useState(user?.photoURL || null);
  const fileInputRef = useRef(null);

  const initials = `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`.toUpperCase() || '?';

  // ── avatar upload ───────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const localURL = URL.createObjectURL(file);
    setPreviewURL(localURL);
    setUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) =>
        task.on('state_changed',
          snap => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          resolve,
        )
      );

      const photoURL = await getDownloadURL(task.snapshot.ref);
      await updateUserProfile({ photoURL });
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
      setPreviewURL(user?.photoURL || null);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // ── save profile fields ─────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        position:  form.position.trim(),
        unit:      form.unit.trim(),
      });
      toast.success('Profile saved');
    } catch (err) {
      toast.error('Could not save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* ── Main profile card ── */}
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">My Profile</h2>
          <p className="text-xs text-gray-400 mt-0.5">Update your name, position, unit and profile picture</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar row */}
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {previewURL ? (
                <img
                  src={previewURL}
                  alt={initials}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-white text-2xl font-semibold border-2 border-gray-200 select-none">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors border-2 border-white disabled:opacity-60"
                title="Change profile picture"
              >
                <Camera size={12} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{form.firstName} {form.lastName}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
              {form.position && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{form.position}{form.unit ? ` · ${form.unit}` : ''}</p>
              )}
              {uploading && (
                <div className="mt-2">
                  <div className="h-1 w-32 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress ?? 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Uploading {uploadProgress}%…</p>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name *</label>
                <input
                  className="form-input"
                  value={form.firstName}
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label">Last Name *</label>
                <input
                  className="form-input"
                  value={form.lastName}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Position / Job Title</label>
              <input
                className="form-input"
                placeholder="e.g. Senior Fisheries Officer"
                value={form.position}
                onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
              />
            </div>

            <div>
              <label className="form-label">Unit / Department</label>
              <input
                className="form-input"
                placeholder="e.g. Marine Conservation Unit"
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Save size={13} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Account info ── */}
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={2} disabled={false} />
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Account Info</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[
            { label: 'Email',        value: user?.email },
            { label: 'Role',         value: user?.role?.replace(/_/g, ' ') },
            { label: 'Organisation', value: user?.organization },
            { label: 'Province',     value: user?.province },
          ].filter(r => r.value).map(r => (
            <div key={r.label} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{r.label}</span>
              <span className="text-gray-700 font-medium capitalize">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
