import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Waves, ClipboardList, Microscope,
  Layers, CalendarCheck, Ship, FileStack, MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToThreads } from '../../utils/messaging';
import UserAvatar from '../UserAvatar';

const dataNav = [
  { to: '/surveys',    icon: ClipboardList,  label: 'Community Surveys', color: 'text-violet-400' },
  { to: '/marine',     icon: Waves,          label: 'Marine Areas',      color: 'text-cyan-400'   },
  { to: '/monitoring', icon: Microscope,     label: 'Bio. Monitoring',   color: 'text-teal-400'   },
  { to: '/datasets',   icon: Layers,         label: 'Datasets',          color: 'text-blue-400'   },
  { to: '/schedule',   icon: CalendarCheck,  label: 'Schedule',          color: 'text-indigo-400' },
  { to: '/trips',      icon: Ship,           label: 'Trips',             color: 'text-amber-400'  },
  { to: '/files',      icon: FileStack,      label: 'My Files',          color: 'text-slate-400'  },
  { to: '/messages',   icon: MessageCircle,  label: 'Messages',          color: 'text-slate-400'  },
];

function NavItem({ to, icon: Icon, label, badge, color = 'text-slate-400', onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2 rounded-lg text-[12.5px] transition-all duration-200
        ${isActive
          ? 'bg-white/10 text-white font-semibold shadow-sm'
          : 'text-slate-400 hover:bg-white/6 hover:text-slate-100 font-normal'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          )}
          <Icon
            size={15}
            className={isActive ? 'text-cyan-400' : color}
            strokeWidth={isActive ? 2 : 1.75}
          />
          <span className="leading-none tracking-tight flex-1">{label}</span>
          {badge > 0 && (
            <span className="bg-cyan-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none flex-shrink-0 shadow-sm">
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
    <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-[0.18em] px-3 pt-5 pb-1.5">
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
          background: 'linear-gradient(180deg, rgba(2,8,23,0.97) 0%, rgba(3,12,30,0.96) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.50), 2px 0 8px rgba(0,0,0,0.30)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0891b2 0%, #0369a1 100%)',
                boxShadow: '0 0 0 1px rgba(8,145,178,0.30), 0 4px 16px rgba(8,145,178,0.35)',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
                alt="Vanuatu Fisheries"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[12.5px] text-white leading-tight tracking-tight">CBFM Platform</p>
              <p className="text-slate-500 text-[10px] leading-tight mt-0.5 tracking-tight truncate">Dept. of Fisheries · Vanuatu</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto sidebar-scroll">
          <SectionLabel label="Overview" />
          <div className="space-y-0.5">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" color="text-sky-400" onClick={handleNavClick} />
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
                <NavItem to="/admin" icon={ShieldCheck} label="Admin Panel" color="text-amber-400" onClick={handleNavClick} />
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06]">
          <Link
            to="/profile"
            onClick={handleNavClick}
            className="flex items-center gap-2.5 px-3 py-3 hover:bg-white/5 transition-colors group"
            title="My Profile"
          >
            <UserAvatar user={user} sizePx={28} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200 truncate leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              {user?.position ? (
                <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-tight">{user.position}</p>
              ) : (
                <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-tight capitalize">{user?.role?.replace(/_/g, ' ')}</p>
              )}
            </div>
          </Link>

          <div className="px-3 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0 pulse-dot" />
              <span className="text-slate-600 text-[10px]">System Online</span>
            </div>
            <p className="text-slate-700 text-[10px]">
              © {new Date().getFullYear()} DoF
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
