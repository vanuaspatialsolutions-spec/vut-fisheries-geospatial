import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Bell } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    staff: 'bg-blue-100 text-blue-800',
    community_officer: 'bg-green-100 text-green-800',
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-ocean-900">
          Community-Based Fisheries Management
        </h1>
        <p className="text-xs text-gray-500">Real-time Tracking & Monitoring Platform</p>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-400 hover:text-ocean-600 transition-colors">
          <Bell size={20} />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 bg-ocean-700 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColors[user?.role] || 'bg-gray-100 text-gray-600'}`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
