import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell } from 'lucide-react';

const routeMeta = {
  '/dashboard':        { title: 'Dashboard',              desc: 'Real-time overview' },
  '/map':              { title: 'Interactive Map',         desc: 'Spatial data explorer' },
  '/surveys':          { title: 'Community Surveys',       desc: 'CBFM survey records' },
  '/surveys/new':      { title: 'New Survey',              desc: 'Community Surveys' },
  '/marine':           { title: 'Marine Areas',            desc: 'LMMAs & protected zones' },
  '/marine/new':       { title: 'New Marine Area',         desc: 'Marine Areas' },
  '/monitoring':       { title: 'Biological Monitoring',   desc: 'Reef & ecosystem data' },
  '/monitoring/new':   { title: 'New Monitoring Record',   desc: 'Biological Monitoring' },
  '/datasets':         { title: 'Datasets',                desc: 'Files & geospatial data' },
  '/datasets/upload':  { title: 'Upload Dataset',          desc: 'Datasets' },
  '/admin':            { title: 'Admin Panel',             desc: 'User & content management' },
};

const roleBadge = {
  admin:             'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  staff:             'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  community_officer: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};
const roleLabel = {
  admin:             'Admin',
  staff:             'Staff',
  community_officer: 'Officer',
};

function UserAvatar({ user }) {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #1a4470, #0c2040)', boxShadow: '0 0 0 2px rgba(26,68,112,0.15)' }}>
      {initials || '?'}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const meta = routeMeta[location.pathname]
    || Object.entries(routeMeta).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1]
    || { title: 'CBFM Platform', desc: '' };

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-gray-100 px-6 flex items-center justify-between"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

      {/* Left — page title */}
      <div className="min-w-0">
        <h1 className="text-[15px] font-semibold text-gray-900 leading-tight tracking-tight">{meta.title}</h1>
        {meta.desc && <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{meta.desc}</p>}
      </div>

      {/* Right — actions + user */}
      <div className="flex items-center gap-2">

        {/* Bell */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-navy-600 hover:bg-navy-50 transition-colors">
          <Bell size={17} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-150 mx-1" style={{ background: '#e5e7eb' }} />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <UserAvatar user={user} />
          <div className="hidden sm:block text-sm leading-tight">
            <p className="font-semibold text-gray-800 text-[13px] leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${roleBadge[user?.role] || 'bg-gray-100 text-gray-500'}`}>
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-1">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
