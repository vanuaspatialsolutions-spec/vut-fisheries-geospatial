import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut, Bell,
  LayoutDashboard, Map, Users, Anchor, Activity, Database, Settings, FolderOpen,
} from 'lucide-react';

const routeMeta = {
  '/dashboard':        { title: 'Dashboard',              desc: 'Real-time overview',          icon: LayoutDashboard },
  '/map':              { title: 'Interactive Map',         desc: 'Spatial data explorer',       icon: Map             },
  '/surveys':          { title: 'Community Surveys',       desc: 'CBFM survey records',         icon: Users           },
  '/surveys/new':      { title: 'New Survey',              desc: 'Community Surveys',           icon: Users           },
  '/marine':           { title: 'Marine Areas',            desc: 'LMMAs & protected zones',     icon: Anchor          },
  '/marine/new':       { title: 'New Marine Area',         desc: 'Marine Areas',                icon: Anchor          },
  '/monitoring':       { title: 'Biological Monitoring',   desc: 'Reef & ecosystem data',       icon: Activity        },
  '/monitoring/new':   { title: 'New Monitoring Record',   desc: 'Biological Monitoring',       icon: Activity        },
  '/datasets':         { title: 'Datasets',                desc: 'Files & geospatial data',     icon: Database        },
  '/datasets/upload':  { title: 'Upload Dataset',          desc: 'Datasets',                    icon: Database        },
  '/files':            { title: 'My Files',                 desc: 'Personal file storage',       icon: FolderOpen      },
  '/admin':            { title: 'Admin Panel',             desc: 'User & content management',   icon: Settings        },
};

const roleBadge = {
  admin:             'bg-gray-100 text-gray-700',
  staff:             'bg-gray-100 text-gray-700',
  community_officer: 'bg-gray-100 text-gray-700',
};
const roleLabel = {
  admin:             'Admin',
  staff:             'Staff',
  community_officer: 'Officer',
};

function UserAvatar({ user }) {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
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

  const RouteIcon = meta.icon;

  return (
    <header className="h-12 flex-shrink-0 bg-white border-b border-gray-200 px-5 flex items-center justify-between">
      {/* Left — page title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {RouteIcon && (
          <RouteIcon size={14} className="text-gray-400 flex-shrink-0" strokeWidth={1.75} />
        )}
        <div className="min-w-0 flex items-baseline gap-2">
          <h1 className="text-sm font-semibold text-gray-800 tracking-tight leading-none">
            {meta.title}
          </h1>
          {meta.desc && (
            <span className="text-xs text-gray-400 hidden sm:inline">{meta.desc}</span>
          )}
        </div>
      </div>

      {/* Right — user */}
      <div className="flex items-center gap-2">
        <button
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Notifications"
        >
          <Bell size={14} />
        </button>

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center gap-2">
          <UserAvatar user={user} />
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-medium text-gray-700 leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <span className={`text-[10px] px-1 py-0.5 rounded font-medium mt-0.5 inline-block ${roleBadge[user?.role] || 'bg-gray-100 text-gray-500'}`}>
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={13} />
        </button>
      </div>
    </header>
  );
}
