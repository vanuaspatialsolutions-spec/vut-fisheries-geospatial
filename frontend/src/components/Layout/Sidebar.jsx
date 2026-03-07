import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Map, Database, Users, Activity,
  Anchor, Settings, ChevronRight,
} from 'lucide-react';

const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',       color: '#6AAFFF' },
  { to: '/map',       icon: Map,             label: 'Interactive Map',  color: '#22D3EE' },
];

const dataNav = [
  { to: '/surveys',    icon: Users,    label: 'Community Surveys', color: '#fb7185' },
  { to: '/marine',     icon: Anchor,   label: 'Marine Areas',      color: '#22D3EE' },
  { to: '/monitoring', icon: Activity, label: 'Bio. Monitoring',   color: '#fbbf24' },
  { to: '/datasets',   icon: Database, label: 'Datasets',          color: '#a78bfa' },
];

function NavItem({ to, icon: Icon, label, color = '#6AAFFF' }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
        ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/6 hover:text-white'}`
      }
      style={({ isActive }) => ({ color: isActive ? '#fff' : 'rgba(164,204,255,0.70)' })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
              style={{ background: color }} />
          )}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{
              background: isActive ? `${color}22` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isActive ? `${color}38` : 'rgba(255,255,255,0.07)'}`,
            }}>
            <Icon size={14} style={{ color: isActive ? color : 'rgba(164,204,255,0.55)' }}
              className="flex-shrink-0 transition-colors duration-150" />
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
    <p className="px-3 pt-5 pb-1 text-[9px] font-bold uppercase tracking-[0.20em] select-none"
      style={{ color: 'rgba(106,175,255,0.42)' }}>
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="w-64 flex flex-col flex-shrink-0 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #000F24 0%, #001A38 40%, #002855 80%, #003B7A 100%)',
        boxShadow: '4px 0 24px rgba(0,10,30,0.40)',
      }}>

      {/* Fish-scale pattern overlay */}
      <div className="absolute inset-0 fish-scale pointer-events-none" style={{ opacity: 0.65 }} />
      {/* Right-edge shimmer line */}
      <div className="absolute top-0 right-0 w-px h-full pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(34,211,238,0.12) 40%, rgba(0,98,230,0.15) 75%, transparent)' }} />

      {/* ── Logo block ── */}
      <div className="relative z-10 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md pointer-events-none"
                style={{ background: 'rgba(34,211,238,0.15)' }} />
              <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
                alt="Vanuatu Coat of Arms"
                className="relative w-9 h-9 object-contain drop-shadow" />
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md pointer-events-none"
                style={{ background: 'rgba(0,98,230,0.20)' }} />
              <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
                alt="Vanuatu Fisheries"
                className="relative w-9 h-9 object-contain drop-shadow" />
            </div>
          </div>
          <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.09)' }} />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight tracking-tight truncate">CBFM Platform</p>
            <p className="text-[10px] mt-0.5 leading-tight truncate" style={{ color: '#6AAFFF' }}>
              Dept. of Fisheries · VUT
            </p>
          </div>
        </div>
        <div className="gold-line" />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-10 flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
        <SectionLabel label="Overview" />
        {mainNav.map(item => <NavItem key={item.to} {...item} />)}

        <SectionLabel label="Data Management" />
        {dataNav.map(item => <NavItem key={item.to} {...item} />)}

        {isAdmin && (
          <>
            <SectionLabel label="Administration" />
            <NavItem to="/admin" icon={Settings} label="Admin Panel" color="#a78bfa" />
          </>
        )}
      </nav>

      {/* ── Status footer ── */}
      <div className="relative z-10 px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-[11px]" style={{ color: 'rgba(164,204,255,0.55)' }}>System Online</span>
        </div>
        <p className="text-[10px]" style={{ color: 'rgba(100,143,200,0.40)' }}>
          &copy; {new Date().getFullYear()} Vanuatu Dept. of Fisheries
        </p>
      </div>
    </aside>
  );
}
