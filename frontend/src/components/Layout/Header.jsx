import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell, ChevronRight } from 'lucide-react';

const routeMeta = {
  '/dashboard': { title: 'Dashboard', desc: 'Real-time overview' },
  '/map': { title: 'Interactive Map', desc: 'Spatial data explorer' },
  '/surveys': { title: 'Community Surveys', desc: 'CBFM survey records' },
  '/surveys/new': { title: 'New Survey', desc: 'Community Surveys' },
  '/marine': { title: 'Marine Areas', desc: 'LMMAs & protected zones' },
  '/marine/new': { title: 'New Marine Area', desc: 'Marine Areas' },
  '/monitoring': { title: 'Biological Monitoring', desc: 'Reef & ecosystem data' },
  '/monitoring/new': { title: 'New Monitoring Record', desc: 'Biological Monitoring' },
  '/datasets': { title: 'Datasets', desc: 'Files & geospatial data' },
  '/datasets/upload': { title: 'Upload Dataset', desc: 'Datasets' },
  '/admin': { title: 'Admin Panel', desc: 'User & content management' },
};

const roleBadge = {
  admin: 'bg-violet-100 text-violet-700',
  staff: 'bg-sky-100 text-sky-700',
  community_officer: 'bg-emerald-100 text-emerald-700',
};

const roleLabel = {
  admin: 'Admin',
  staff: 'Staff',
  community_officer: 'Officer',
};

function UserAvatar({ user }) {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  return (
    <div className="w-7 h-7 bg-ocean-700 rounded flex items-center justify-center text-white text-xs font-semibold">
      {initials || '?'}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Find best matching route meta
  const meta = routeMeta[location.pathname]
    || Object.entries(routeMeta).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1]
    || { title: 'CBFM Platform', desc: '' };

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-0 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] h-16 flex-shrink-0">
      {/* Left: Page title */}
      <div className="flex items-center gap-2 min-w-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900 leading-tight">{meta.title}</h1>
          {meta.desc && (
            <p className="text-[11px] text-gray-400 leading-tight">{meta.desc}</p>
          )}
        </div>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 text-gray-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors">
          <Bell size={18} />
        </button>

        {/* Divider */}
        <div className="w-px h-7 bg-gray-200" />

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <UserAvatar user={user} />
          <div className="text-sm leading-tight hidden sm:block">
            <p className="font-medium text-gray-800 text-[13px]">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-gray-400">{roleLabel[user?.role] || user?.role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
          title="Sign out"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
