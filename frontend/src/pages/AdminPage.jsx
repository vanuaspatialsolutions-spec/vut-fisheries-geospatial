import { useEffect, useState } from 'react';
import { getAllUsers, updateUserProfile, getDatasets, publishDataset, unpublishDataset } from '../utils/firestore';
import toast from 'react-hot-toast';
import { Users, Database, CheckCircle, XCircle, UserCheck, UserX, Shield } from 'lucide-react';

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

  useEffect(() => {
    getAllUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const updateUser = async (uid, data) => {
    try {
      await updateUserProfile(uid, data);
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, ...data } : u));
      toast.success('User updated.');
    } catch { toast.error('Update failed.'); }
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    staff: 'bg-blue-100 text-blue-800',
    community_officer: 'bg-green-100 text-green-800',
  };

  if (loading) return <div className="text-center py-8 text-ocean-600">Loading users...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{users.length} registered users</p>
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
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.organization || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{user.province || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <select value={user.role}
                    onChange={e => updateUser(user.id, { role: e.target.value })}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${roleColors[user.role]}`}>
                    <option value="community_officer">Community Officer</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                    {user.isActive ? <><UserCheck size={12} />Active</> : <><UserX size={12} />Inactive</>}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {user.role === 'admin' && <Shield size={14} className="text-purple-500" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatasetsAdminTab() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDatasets = () => {
    getDatasets({ status: 'under_review', pageSize: 50 })
      .then(res => setDatasets(res.datasets))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDatasets(); }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'publish') await publishDataset(id);
      else await unpublishDataset(id);
      toast.success(`Dataset ${action === 'publish' ? 'published' : 'unpublished'}.`);
      fetchDatasets();
    } catch { toast.error('Action failed.'); }
  };

  if (loading) return <div className="text-center py-8 text-ocean-600">Loading...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{datasets.length} datasets under review</p>
      {datasets.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
          <p>No datasets pending review</p>
        </div>
      ) : (
        datasets.map(dataset => (
          <div key={dataset.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-800">{dataset.title}</h3>
                <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                  <span>{dataset.dataType?.replace(/_/g, ' ')}</span>
                  {dataset.province && <span>{dataset.province}</span>}
                  {dataset.community && <span>{dataset.community}</span>}
                  <span>{dataset.fileFormat?.toUpperCase()} · {dataset.fileName}</span>
                  {dataset.uploaderName && <span>by {dataset.uploaderName}</span>}
                </div>
                {dataset.description && <p className="text-sm text-gray-500 mt-1">{dataset.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleAction(dataset.id, 'publish')}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                  <CheckCircle size={12} /> Publish
                </button>
                <button onClick={() => handleAction(dataset.id, 'unpublish')}
                  className="px-3 py-1.5 text-xs bg-gray-400 text-white rounded-lg hover:bg-gray-500 flex items-center gap-1">
                  <XCircle size={12} /> Reject
                </button>
              </div>
            </div>
          </div>
        ))
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
