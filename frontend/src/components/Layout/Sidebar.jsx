import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Database, Users, Activity,
  Anchor, Settings, FolderOpen, MessageSquare, CalendarDays, Plane,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToThreads } from '../../utils/messaging';
import UserAvatar from '../UserAvatar';

const dataNav = [
  { to: '/surveys',    icon: Users,          label: 'Community Surveys', color: 'text-violet-400' },
  { to: '/marine',     icon: Anchor,         label: 'Marine Areas',      color: 'text-cyan-400'   },
  { to: '/monitoring', icon: Activity,       label: 'Bio. Monitoring',   color: 'text-teal-400'   },
  { to: '/datasets',   icon: Database,       label: 'Datasets',          color: 'text-blue-400'   },
  { to: '/schedule',   icon: CalendarDays,   label: 'Schedule',          color: 'text-indigo-400' },
  { to: '/trips',      icon: Plane,          label: 'Trips',             color: 'text-amber-400'  },
  { to: '/files',      icon: FolderOpen,     label: 'My Files',          color: 'text-slate-400'  },
  { to: '/messages',   icon: MessageSquare,  label: 'Messages',          color: 'text-slate-400'  },
];

function NavItem({ to, icon: Icon, label, badge, color = 'text-slate-400', onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150
        ${isActive
          ? 'bg-white/10 text-white font-medium shadow-sm'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 font-normal'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-cyan-400 rounded-full" />
          )}
          <Icon
            size={14}
            className={isActive ? 'text-cyan-400' : color}
            strokeWidth={isActive ? 2.25 : 1.75}
          />
          <span className="leading-none tracking-tight flex-1">{label}</span>
          {badge > 0 && (
            <span className="bg-cyan-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none flex-shrink-0 shadow-sm">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.16em] px-2.5 pt-5 pb-1.5">
      {label}
    </p>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToThreads(user.uid, (threads) => {
      const count = threads.reduce((sum, t) => sum + (t.unread?.[user.uid] || 0), 0);
      setTotalUnread(count);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          md:static md:w-52 md:translate-x-0 md:z-auto md:flex-shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: 'rgba(2,8,23,0.94)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.45), 2px 0 8px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', boxShadow: '0 0 0 1px rgba(8,145,178,0.35), 0 4px 12px rgba(8,145,178,0.40)' }}>
              <img
                src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
                alt="Vanuatu Fisheries"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div>
              <p className="font-bold text-[12.5px] text-white leading-tight tracking-tight">CBFM Platform</p>
              <p className="text-slate-500 text-[10px] leading-tight mt-0.5 tracking-tight">Dept. of Fisheries · Vanuatu</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-1 px-2 overflow-y-auto sidebar-scroll">
          <SectionLabel label="Overview" />
          <div className="space-y-0.5">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" color="text-slate-400" onClick={handleNavClick} />
          </div>

          <SectionLabel label="Data Management" />
          <div className="space-y-0.5">
            {dataNav.map(item => (
              <NavItem
                key={item.to}
                {...item}
                badge={item.to === '/messages' ? totalUnread : 0}
                onClick={handleNavClick}
              />
            ))}
          </div>

          {isAdmin && (
            <>
              <SectionLabel label="Administration" />
              <div className="space-y-0.5">
                <NavItem to="/admin" icon={Settings} label="Admin Panel" color="text-amber-400" onClick={handleNavClick} />
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800/60">
          <Link
            to="/profile"
            onClick={handleNavClick}
            className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors group"
            title="My Profile"
          >
            <UserAvatar user={user} sizePx={26} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              {user?.position ? (
                <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-none">{user.position}</p>
              ) : (
                <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-none capitalize">{user?.role?.replace(/_/g, ' ')}</p>
              )}
            </div>
          </Link>

          <div className="px-3 pb-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0 pulse-dot" />
              <span className="text-slate-600 text-[10px]">System Online</span>
            </div>
            <p className="text-slate-700 text-[10px]">
              © {new Date().getFullYear()} Vanuatu Dept. of Fisheries
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
