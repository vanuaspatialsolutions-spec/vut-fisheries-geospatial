import { useEffect, useState, useRef } from 'react';
import { getAllUsers, updateUserProfile, approveUser, rejectUser, deleteUserProfile, getDatasets, publishDataset, unpublishDataset, recacheDatasetGeoJSON } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Users, Database, CheckCircle, XCircle, UserCheck, UserX, Shield, MapPin, Wrench, Trash2, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-ocean-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {children}
    </button>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    getAllUsers().then(setUsers).finally(() => setLoading(false));
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

  if (loading) return <div className="text-center py-8 text-ocean-600">Loading users...</div>;

  return (
    <div className="space-y-6">
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
        <p className="text-sm text-gray-500">{others.length} registered user{others.length !== 1 ? 's' : ''}</p>
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
      .then(res => setDatasets(res.datasets))
      .catch(() => toast.error('Failed to load datasets.'))
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

  if (loading) return <div className="text-center py-8 text-ocean-600">Loading...</div>;

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield size={24} className="text-ocean-700" /> Admin Panel
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
      </div>
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'datasets' && <DatasetsAdminTab />}
    </div>
  );
}
