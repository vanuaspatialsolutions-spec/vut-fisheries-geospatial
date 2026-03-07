import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Map, Database, Users, Activity,
  Anchor, Settings, ChevronRight,
} from 'lucide-react';

const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',       color: '#38bdf8' },
  { to: '/map',       icon: Map,             label: 'Interactive Map',  color: '#2dd4bf' },
];

const dataNav = [
  { to: '/surveys',    icon: Users,    label: 'Community Surveys', color: '#fb7185' },
  { to: '/marine',     icon: Anchor,   label: 'Marine Areas',      color: '#22d3ee' },
  { to: '/monitoring', icon: Activity, label: 'Bio. Monitoring',   color: '#fbbf24' },
  { to: '/datasets',   icon: Database, label: 'Datasets',          color: '#a78bfa' },
];

function NavItem({ to, icon: Icon, label, color = '#38bdf8' }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
        ${isActive
          ? 'bg-white/10 text-white'
          : 'text-navy-300 hover:bg-white/6 hover:text-white'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
              style={{ background: color }}
            />
          )}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{
              background: isActive ? `${color}22` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isActive ? `${color}38` : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <Icon
              size={14}
              style={{ color: isActive ? color : 'rgba(148,163,184,0.7)' }}
              className="flex-shrink-0 transition-colors duration-150"
            />
          </div>
          <span className="flex-1 truncate tracking-tight">{label}</span>
          {isActive && <ChevronRight size={11} className="opacity-30 flex-shrink-0" />}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-navy-500 select-none">
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="w-64 flex flex-col flex-shrink-0 shadow-xl"
      style={{ background: 'linear-gradient(180deg, #172554 0%, #1e3a8a 100%)' }}>

      {/* ── Logo block ── */}
      <div className="px-5 py-5 border-b border-white/8">
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
            <p className="text-white font-bold text-sm leading-tight tracking-tight truncate">CBFM Platform</p>
            <p className="text-navy-400 text-[10px] mt-0.5 leading-tight truncate">Dept. of Fisheries · VUT</p>
          </div>
        </div>
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
            <NavItem to="/admin" icon={Settings} label="Admin Panel" color="#94a3b8" />
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
