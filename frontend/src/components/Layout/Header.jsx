import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut, Bell,
  LayoutDashboard, Map, Users, Anchor, Activity, Database, Settings,
} from 'lucide-react';

const routeMeta = {
  '/dashboard':        { title: 'Dashboard',              desc: 'Real-time overview',          icon: LayoutDashboard, color: '#3388FF', bg: 'rgba(51,136,255,0.10)'   },
  '/map':              { title: 'Interactive Map',         desc: 'Spatial data explorer',       icon: Map,             color: '#22D3EE', bg: 'rgba(34,211,238,0.10)'   },
  '/surveys':          { title: 'Community Surveys',       desc: 'CBFM survey records',         icon: Users,           color: '#fb7185', bg: 'rgba(251,113,133,0.10)'  },
  '/surveys/new':      { title: 'New Survey',              desc: 'Community Surveys',           icon: Users,           color: '#fb7185', bg: 'rgba(251,113,133,0.10)'  },
  '/marine':           { title: 'Marine Areas',            desc: 'LMMAs & protected zones',     icon: Anchor,          color: '#22D3EE', bg: 'rgba(34,211,238,0.10)'   },
  '/marine/new':       { title: 'New Marine Area',         desc: 'Marine Areas',                icon: Anchor,          color: '#22D3EE', bg: 'rgba(34,211,238,0.10)'   },
  '/monitoring':       { title: 'Biological Monitoring',   desc: 'Reef & ecosystem data',       icon: Activity,        color: '#fbbf24', bg: 'rgba(251,191,36,0.10)'   },
  '/monitoring/new':   { title: 'New Monitoring Record',   desc: 'Biological Monitoring',       icon: Activity,        color: '#fbbf24', bg: 'rgba(251,191,36,0.10)'   },
  '/datasets':         { title: 'Datasets',                desc: 'Files & geospatial data',     icon: Database,        color: '#a78bfa', bg: 'rgba(167,139,250,0.10)'  },
  '/datasets/upload':  { title: 'Upload Dataset',          desc: 'Datasets',                    icon: Database,        color: '#a78bfa', bg: 'rgba(167,139,250,0.10)'  },
  '/admin':            { title: 'Admin Panel',             desc: 'User & content management',   icon: Settings,        color: '#94a3b8', bg: 'rgba(148,163,184,0.10)'  },
};

const roleBadge = {
  admin:             'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  staff:             'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
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
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, #001A38, #003B7A)',
        boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px rgba(0,59,122,0.28)',
      }}
    >
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
    <header
      className="h-16 flex-shrink-0 bg-white border-b px-6 flex items-center justify-between"
      style={{
        borderColor: 'rgba(0,59,122,0.08)',
        boxShadow: '0 1px 0 rgba(0,27,70,0.04), 0 2px 8px rgba(0,27,70,0.04)',
      }}
    >
      {/* Left — route icon + page title */}
      <div className="flex items-center gap-3 min-w-0">
        {RouteIcon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: meta.bg, border: `1px solid ${meta.color}28` }}>
            <RouteIcon size={15} style={{ color: meta.color }} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold leading-tight tracking-tight" style={{ color: '#001A38' }}>
            {meta.title}
          </h1>
          {meta.desc && <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{meta.desc}</p>}
        </div>
      </div>

      {/* Right — actions + user */}
      <div className="flex items-center gap-1.5">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 transition-colors"
          style={{ '--hover-bg': 'rgba(0,59,122,0.06)' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(0,59,122,0.06)'}
          onMouseOut={e => e.currentTarget.style.background = ''}>
          <Bell size={16} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1.5" />

        <div className="flex items-center gap-2.5">
          <UserAvatar user={user} />
          <div className="hidden sm:block leading-tight">
            <p className="font-semibold text-[13px] leading-tight" style={{ color: '#001A38' }}>
              {user?.firstName} {user?.lastName}
            </p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${roleBadge[user?.role] || 'bg-gray-100 text-gray-500'}`}>
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-1"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
