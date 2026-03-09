import { useEffect, useState, useRef } from 'react';
import { getAllUsers, updateUserProfile, approveUser, rejectUser, deleteUserProfile, createUserByAdmin, getDatasets, publishDataset, unpublishDataset, recacheDatasetGeoJSON, backfillProvinces } from '../utils/firestore';
import { useAuth } from '../context/AuthContext';
import { VANUATU_PROVINCES } from '../utils/constants';
import toast from 'react-hot-toast';
import { Users, Database, CheckCircle, XCircle, UserCheck, UserX, Shield, MapPin, Wrench, Trash2, Clock, ThumbsUp, ThumbsDown, AlertTriangle, UserPlus, X, Eye, EyeOff } from 'lucide-react';

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${active ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-navy-50 hover:text-navy-700'}`}
      style={active ? { background: 'linear-gradient(135deg, #001A38, #003B7A)', boxShadow: '0 2px 8px rgba(0,27,70,0.25)' } : {}}>
      {children}
    </button>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', role:'staff', organization:'', province:'' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('First and last name are required.');
    if (!form.email.trim()) return toast.error('Email is required.');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    setSaving(true);
    try {
      await createUserByAdmin(form);
      toast.success(`Account created for ${form.firstName} ${form.lastName}.`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.45)'}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus size={18} style={{ color: '#003B7A' }} />
            <h3 className="font-semibold text-gray-900">Create New User</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">First Name *</label>
              <input className="form-input" value={form.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="First name" required/>
            </div>
            <div>
              <label className="form-label">Last Name *</label>
              <input className="form-input" value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Last name" required/>
            </div>
          </div>

          <div>
            <label className="form-label">Email Address *</label>
            <input className="form-input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="user@example.com" required/>
          </div>

          <div>
            <label className="form-label">Password *</label>
            <div className="relative">
              <input className="form-input pr-10" type={showPw?'text':'password'} value={form.password}
                onChange={e=>set('password',e.target.value)} placeholder="Min. 6 characters" required minLength={6}/>
              <button type="button" onClick={()=>setShowPw(p=>!p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Role *</label>
            <select className="form-input" value={form.role} onChange={e=>set('role',e.target.value)}>
              <option value="community_officer">Community Officer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="form-label">Organization</label>
            <input className="form-input" value={form.organization} onChange={e=>set('organization',e.target.value)} placeholder="e.g. Vanuatu Dept. of Fisheries"/>
          </div>

          <div>
            <label className="form-label">Province</label>
            <select className="form-input" value={form.province} onChange={e=>set('province',e.target.value)}>
              <option value="">Select province…</option>
              {VANUATU_PROVINCES.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating…</> : <><UserPlus size={15}/>Create User</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [working, setWorking] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    getAllUsers()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        // If listing returned nothing (empty collection or rules issue), at minimum
        // show the currently-logged-in admin so the page is never completely blank.
        if (list.length === 0 && currentUser?.uid) {
          list.push({
            id: currentUser.uid,
            uid: currentUser.uid,
            firstName: currentUser.firstName || currentUser.displayName?.split(' ')[0] || '',
            lastName: currentUser.lastName || currentUser.displayName?.split(' ').slice(1).join(' ') || '',
            email: currentUser.email,
            role: currentUser.role || 'admin',
            status: currentUser.status || 'approved',
            isActive: currentUser.isActive ?? true,
            organization: currentUser.organization || '',
            province: currentUser.province || '',
          });
        }
        setUsers(list);
      })
      .catch(err => {
        console.error('getAllUsers failed:', err);
        const code = err?.code || '';
        const isPermission = code === 'permission-denied' || code.includes('PERMISSION_DENIED') || err.message?.includes('permission');
        setError({ message: err.message || 'Failed to load users', isPermission, code });
        toast.error('Could not load users. See details below.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateUser = async (uid, data) => {
    try {
      await updateUserProfile(uid, data);
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, ...data } : u));
      toast.success('User updated.');
    } catch { toast.error('Update failed.'); }
  };

  const handleApprove = async (uid) => {
    setWorking(uid);
    try {
      await approveUser(uid);
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, status: 'approved', isActive: true } : u));
      toast.success('Account approved. The user will be notified on next login.');
    } catch { toast.error('Approval failed.'); }
    finally { setWorking(null); }
  };

  const handleRejectAccount = async (uid) => {
    setWorking(uid);
    try {
      await rejectUser(uid);
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, status: 'rejected', isActive: false } : u));
      toast.success('Account rejected.');
    } catch { toast.error('Rejection failed.'); }
    finally { setWorking(null); }
  };

  const handleDelete = async (uid, name) => {
    if (!window.confirm(`Delete ${name}'s account? This cannot be undone.`)) return;
    setWorking(uid);
    try {
      await deleteUserProfile(uid);
      setUsers(prev => prev.filter(u => u.id !== uid));
      toast.success('User deleted.');
    } catch { toast.error('Delete failed.'); }
    finally { setWorking(null); }
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    staff: 'bg-blue-100 text-blue-800',
    community_officer: 'bg-green-100 text-green-800',
  };

  // Backwards-compat: users created before this feature have no status field
  const pending = users.filter(u => u.status === 'pending');
  const others  = users.filter(u => u.status !== 'pending');

  if (loading) return (
    <div className="flex items-center justify-center py-12 gap-3" style={{ color: '#003B7A' }}>
      <span className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,59,122,0.20)', borderTopColor: '#003B7A' }} />
      Loading users…
    </div>
  );

  if (error) return (
    <div className="card py-8 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 text-red-600">
        <AlertTriangle size={22} className="flex-shrink-0" />
        <p className="font-semibold">Failed to load users</p>
      </div>
      <p className="text-gray-500 text-sm">{error.message}</p>
      {error.isPermission && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-sm">
          <p className="font-semibold text-amber-800">Fix: Deploy Firestore security rules</p>
          <p className="text-amber-700 text-xs">The security rules file exists locally but has not been deployed to Firebase yet. Run this command in the project root:</p>
          <pre className="bg-amber-100 rounded p-2 text-xs font-mono text-amber-900 select-all">firebase deploy --only firestore:rules</pre>
          <p className="text-amber-600 text-xs">Then click Retry below.</p>
        </div>
      )}
      {!error.isPermission && (
        <p className="text-gray-400 text-xs">Error code: {error.code || 'unknown'}</p>
      )}
      <button onClick={fetchUsers} className="btn-secondary text-sm">Retry</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchUsers}
        />
      )}

      {/* ── Pending approvals ── */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <h3 className="font-semibold text-gray-800">Pending Approval</h3>
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-amber-500 text-white rounded-full">{pending.length}</span>
          </div>
          <div className="space-y-2">
            {pending.map(user => (
              <div key={user.id} className="card border-l-4 border-amber-400 bg-amber-50/40 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  {user.organization && <p className="text-xs text-gray-400">{user.organization}{user.province ? ` · ${user.province}` : ''}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={working === user.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-60">
                    <ThumbsUp size={12} /> Approve
                  </button>
                  <button
                    onClick={() => handleRejectAccount(user.id)}
                    disabled={working === user.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-60">
                    <ThumbsDown size={12} /> Reject
                  </button>
                  <button
                    onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}
                    disabled={working === user.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-400 hover:bg-gray-500 text-white rounded-lg disabled:opacity-60">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All other users ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{others.length} registered user{others.length !== 1 ? 's' : ''}</p>
          <button onClick={() => setShowCreate(true)}
            className="btn-primary text-sm py-2 flex items-center gap-2">
            <UserPlus size={15} /> Create User
          </button>
        </div>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Organization</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Province</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {others.map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-800">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      {user.role === 'admin' && <Shield size={13} className="text-purple-500 flex-shrink-0" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.organization || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{user.province || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <select value={user.role}
                      onChange={e => updateUser(user.id, { role: e.target.value })}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      <option value="community_officer">Community Officer</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <XCircle size={12} /> Rejected
                      </span>
                    ) : (
                      <button onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                          ${user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {user.isActive ? <><UserCheck size={12} /> Active</> : <><UserX size={12} /> Inactive</>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}
                      disabled={working === user.id}
                      title="Delete user"
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function isMapEligibleDataset(d) {
  return ['geojson', 'json', 'zip'].includes(d.fileFormat?.toLowerCase());
}

function DatasetsAdminTab() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);

  // Shared hidden file input for publish+cache flow
  const fileInputRef = useRef(null);
  const actionRef = useRef(null); // { dataset }

  const fetchDatasets = () => {
    setLoading(true);
    getDatasets({ status: 'under_review', pageSize: 50 })
      .then(res => setDatasets(Array.isArray(res?.datasets) ? res.datasets : []))
      .catch(err => { console.error('getDatasets failed:', err); toast.error('Failed to load datasets.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDatasets(); }, []);

  // Called when user selects file during publish+cache flow
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    const { dataset } = actionRef.current || {};
    if (!file || !dataset) return;

    setWorking(dataset.id);
    try {
      await recacheDatasetGeoJSON(dataset.id, file);
      await publishDataset(dataset.id);
      toast.success('GeoJSON cached and dataset published — it will now appear on the map.');
      fetchDatasets();
    } catch (err) {
      toast.error(`Publish failed: ${err.message}`);
    } finally {
      setWorking(null);
    }
  };

  const handlePublish = async (dataset) => {
    // GeoJSON without inline data: prompt for file first
    if (isMapEligibleDataset(dataset) && !dataset.hasGeojsonData) {
      toast('Select the GeoJSON file to cache it — the dataset will then be published automatically.', {
        icon: '📂',
        duration: 5000,
      });
      actionRef.current = { dataset };
      fileInputRef.current.value = '';
      fileInputRef.current.click();
      return;
    }
    setWorking(dataset.id);
    try {
      await publishDataset(dataset.id);
      toast.success('Dataset published.');
      fetchDatasets();
    } catch { toast.error('Publish failed.'); }
    finally { setWorking(null); }
  };

  const handleReject = async (id) => {
    try {
      await unpublishDataset(id);
      toast.success('Dataset rejected.');
      fetchDatasets();
    } catch { toast.error('Action failed.'); }
  };

  if (loading) return <div className="text-center py-8 font-medium" style={{ color: '#003B7A' }}>Loading...</div>;

  return (
    <div className="space-y-3">
      {/* Hidden file input for publish+cache */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json,.zip"
        className="hidden"
        onChange={handleFileSelected}
      />

      <p className="text-sm text-gray-500">{datasets.length} datasets under review</p>
      {datasets.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
          <p>No datasets pending review</p>
        </div>
      ) : (
        datasets.map(dataset => {
          const needsFile = isMapEligibleDataset(dataset) && !dataset.hasGeojsonData;
          return (
            <div key={dataset.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-800">{dataset.title}</h3>
                    <span className="badge bg-blue-50 text-blue-700">{dataset.fileFormat?.toUpperCase()}</span>
                    {needsFile && (
                      <span className="badge bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 text-xs">
                        <Wrench size={10} /> File required to cache map layer
                      </span>
                    )}
                    {dataset.hasGeojsonData && (
                      <span className="badge bg-purple-50 text-purple-700 flex items-center gap-1 text-xs">
                        <MapPin size={10} /> Map ready
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                    <span>{dataset.dataType?.replace(/_/g, ' ')}</span>
                    {dataset.province && <span>{dataset.province}</span>}
                    {dataset.community && <span>{dataset.community}</span>}
                    <span>{dataset.fileName}</span>
                    {dataset.uploaderName && <span>by {dataset.uploaderName}</span>}
                  </div>
                  {dataset.description && <p className="text-sm text-gray-500 mt-1">{dataset.description}</p>}
                  {needsFile && (
                    <p className="text-xs text-amber-600 mt-1">
                      Publishing will prompt you to select the GeoJSON file so it can be displayed on the map.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handlePublish(dataset)}
                    disabled={working === dataset.id}
                    className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 text-white disabled:opacity-60
                      ${needsFile ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
                    {working === dataset.id
                      ? 'Publishing...'
                      : needsFile
                        ? <><MapPin size={12} /> Publish + Cache</>
                        : <><CheckCircle size={12} /> Publish</>}
                  </button>
                  <button
                    onClick={() => handleReject(dataset.id)}
                    disabled={working === dataset.id}
                    className="px-3 py-1.5 text-xs bg-gray-400 text-white rounded-lg hover:bg-gray-500 flex items-center gap-1 disabled:opacity-60">
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function ToolsTab() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleBackfill = async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await backfillProvinces();
      setResult(r);
      toast.success(`Done — ${r.marineUpdated + r.datasetsUpdated} records updated.`);
    } catch (err) {
      toast.error(err.message || 'Migration failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card max-w-xl">
        <div className="flex items-start gap-3">
          <MapPin size={20} style={{ color: '#003B7A' }} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">Backfill Province from Geometry</h3>
            <p className="text-sm text-gray-500 mt-1">
              Automatically detects the province for any Marine Area or Dataset that is missing one,
              using the nearest-island centroid of its geometry. Records that already have a province
              are untouched.
            </p>
            <button
              onClick={handleBackfill}
              disabled={running}
              className="mt-3 btn-primary text-sm flex items-center gap-2"
            >
              <Wrench size={14} />
              {running ? 'Running…' : 'Run Backfill'}
            </button>
            {result && (
              <div className="mt-3 text-sm text-gray-700 bg-green-50 border border-green-200 rounded-lg p-3 space-y-0.5">
                <p>Marine Areas updated: <strong>{result.marineUpdated}</strong> (skipped: {result.marineSkipped})</p>
                <p>Datasets updated: <strong>{result.datasetsUpdated}</strong> (skipped: {result.datasetsSkipped})</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield size={24} style={{ color: '#003B7A' }} /> Admin Panel
        </h2>
        <p className="text-gray-500 text-sm">Manage users, datasets, and platform settings</p>
      </div>
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
          <span className="flex items-center gap-2"><Users size={14} /> User Management</span>
        </TabButton>
        <TabButton active={activeTab === 'datasets'} onClick={() => setActiveTab('datasets')}>
          <span className="flex items-center gap-2"><Database size={14} /> Dataset Review</span>
        </TabButton>
        <TabButton active={activeTab === 'tools'} onClick={() => setActiveTab('tools')}>
          <span className="flex items-center gap-2"><Wrench size={14} /> Tools</span>
        </TabButton>
      </div>
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'datasets' && <DatasetsAdminTab />}
      {activeTab === 'tools' && <ToolsTab />}
    </div>
  );
}
