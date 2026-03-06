import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Map, Database, Users, Activity,
  Anchor, Settings, ChevronRight,
} from 'lucide-react';

const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map',       icon: Map,             label: 'Interactive Map' },
];

const dataNav = [
  { to: '/surveys',    icon: Users,    label: 'Community Surveys' },
  { to: '/marine',     icon: Anchor,   label: 'Marine Areas' },
  { to: '/monitoring', icon: Activity, label: 'Bio. Monitoring' },
  { to: '/datasets',   icon: Database, label: 'Datasets' },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
        ${isActive
          ? 'bg-white/12 text-white'
          : 'text-navy-300 hover:bg-white/6 hover:text-white'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
              style={{ background: '#d4a92a' }} />
          )}
          <Icon size={16} className={`flex-shrink-0 transition-transform duration-150 ${!isActive && 'group-hover:scale-110'}`} />
          <span className="flex-1 truncate">{label}</span>
          {isActive && <ChevronRight size={13} className="opacity-40 flex-shrink-0" />}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-500 select-none">
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="w-64 flex flex-col flex-shrink-0 shadow-xl"
      style={{ background: 'linear-gradient(180deg, #071529 0%, #0c2040 100%)' }}>

      {/* ── Logo block ── */}
      <div className="px-5 py-5 border-b border-white/8">
        {/* Both logos side by side */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
              alt="Vanuatu Coat of Arms"
              className="w-9 h-9 object-contain drop-shadow"
            />
            <img
              src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
              alt="Vanuatu Fisheries"
              className="w-9 h-9 object-contain drop-shadow"
            />
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">CBFM Platform</p>
            <p className="text-navy-400 text-[10px] mt-0.5 leading-tight truncate">Dept. of Fisheries · VUT</p>
          </div>
        </div>
        {/* Gold accent line */}
        <div className="gold-line" />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
        <SectionLabel label="Overview" />
        {mainNav.map(item => <NavItem key={item.to} {...item} />)}

        <SectionLabel label="Data Management" />
        {dataNav.map(item => <NavItem key={item.to} {...item} />)}

        {isAdmin && (
          <>
            <SectionLabel label="Administration" />
            <NavItem to="/admin" icon={Settings} label="Admin Panel" />
          </>
        )}
      </nav>

      {/* ── Status footer ── */}
      <div className="px-5 py-4 border-t border-white/8">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-navy-400 text-[11px]">System Online</span>
        </div>
        <p className="text-navy-600 text-[10px]">
          &copy; {new Date().getFullYear()} Vanuatu Dept. of Fisheries
        </p>
      </div>
    </aside>
  );
}
