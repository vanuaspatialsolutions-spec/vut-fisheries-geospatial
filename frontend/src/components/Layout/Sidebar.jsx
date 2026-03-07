import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Map, Database, Users, Activity,
  Anchor, Settings, ChevronRight,
import {
  LayoutDashboard, Map, Database, Activity,
  Anchor, ClipboardList, Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/fisheries-logo.png';

const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',       color: '#6AAFFF' },
  { to: '/map',       icon: Map,             label: 'Interactive Map',  color: '#4AA8FF' },
];

const dataNav = [
  { to: '/surveys',    icon: Users,    label: 'Community Surveys', color: '#fb7185' },
  { to: '/marine',     icon: Anchor,   label: 'Marine Areas',      color: '#4AA8FF' },
  { to: '/monitoring', icon: Activity, label: 'Bio. Monitoring',   color: '#fbbf24' },
  { to: '/datasets',   icon: Database, label: 'Datasets',          color: '#a78bfa' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map',       icon: Map,             label: 'Interactive Map' },
];

const dataNav = [
  { to: '/surveys',    icon: ClipboardList, label: 'Community Surveys' },
  { to: '/marine',     icon: Anchor,        label: 'Marine Areas' },
  { to: '/monitoring', icon: Activity,      label: 'Bio. Monitoring' },
  { to: '/datasets',   icon: Database,      label: 'Datasets' },
];

function NavItem({ to, icon: Icon, label, color = '#6AAFFF' }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
        ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/6 hover:text-white'}`
        `flex items-center gap-3 py-2 pr-3 text-sm font-medium transition-colors duration-100 rounded-r relative
        border-l-2 pl-[14px]
        ${isActive
          ? 'border-white bg-white/10 text-white'
          : 'border-transparent text-ocean-300 hover:bg-white/6 hover:text-ocean-100'
        }`
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
          <Icon size={15} className={isActive ? 'text-white' : 'text-ocean-400'} />
          <span className="leading-none">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[9px] font-bold uppercase tracking-[0.20em] select-none"
      style={{ color: 'rgba(106,175,255,0.42)' }}>
    <p className="text-[9px] font-bold text-ocean-600 uppercase tracking-[0.18em] px-4 pt-5 pb-1.5">
      {label}
    </p>
  );
}

/* Minimal marine icon strip in sidebar footer */
function SidebarMarineStrip() {
  return (
    <div className="flex items-center gap-3 mb-3 opacity-20" style={{ justifyContent: 'flex-start' }}>
      {/* Fish */}
      <svg viewBox="0 0 24 12" width="22" height="11" fill="none">
        <path d="M18,6 C12,1.5 4,1.5 1,6 C4,10.5 12,10.5 18,6 Z M18,6 L23,3 L21,6 L23,9 Z" fill="white"/>
      </svg>
      {/* Coral */}
      <svg viewBox="0 0 16 20" width="12" height="18" fill="none">
        <path d="M8,20 L8,10 M8,15 L3,9 M8,15 L13,9 M8,12 L4,6 M8,12 L12,6"
          stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {/* Starfish */}
      <svg viewBox="0 0 18 18" width="14" height="14" fill="none">
        <path d="M9,2 L10,7 L15,5 L12,9 L16,12 L11,11 L12,17 L9,13 L6,17 L7,11 L2,12 L6,9 L3,5 L8,7 Z"
          fill="white"/>
      </svg>
      {/* Anchor */}
      <svg viewBox="0 0 16 18" width="12" height="16" fill="none">
        <circle cx="8" cy="3" r="2.5" stroke="white" strokeWidth="1.5"/>
        <line x1="8" y1="5.5" x2="8" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M3,10 C3,15 13,15 13,10" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <circle cx="3"  cy="10" r="1.5" fill="white"/>
        <circle cx="13" cy="10" r="1.5" fill="white"/>
      </svg>
    </div>
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

      {/* Pacific tapa pattern overlay — no cyan */}
      <div className="absolute inset-0 pacific-tapa pointer-events-none" style={{ opacity: 0.75 }} />
      {/* Horizontal ocean-ripple */}
      <div className="absolute inset-0 ocean-ripple pointer-events-none" style={{ opacity: 0.6 }} />
      {/* Right-edge shimmer — pure blue */}
      <div className="absolute top-0 right-0 w-px h-full pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(74,168,255,0.14) 40%, rgba(0,98,230,0.17) 75%, transparent)' }} />

      {/* ── Logo block ── */}
      <div className="relative z-10 px-5 py-5 border-b" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md pointer-events-none"
                style={{ background:'rgba(74,168,255,0.16)' }} />
              <img src={`${import.meta.env.BASE_URL}vanuatu-coat-of-arms.png`}
                alt="Vanuatu Coat of Arms"
                className="relative w-9 h-9 object-contain drop-shadow" />
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md pointer-events-none"
                style={{ background:'rgba(0,98,230,0.20)' }} />
              <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
                alt="Vanuatu Fisheries"
                className="relative w-9 h-9 object-contain drop-shadow" />
            </div>
          </div>
          <div className="w-px h-8" style={{ background:'rgba(255,255,255,0.09)' }} />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight tracking-tight truncate">CBFM Platform</p>
            <p className="text-[10px] mt-0.5 leading-tight truncate" style={{ color:'#A9CFFF' }}>
              Dept. of Fisheries · VUT
            </p>
    <aside className="w-56 bg-ocean-900 flex flex-col flex-shrink-0">
      <div className="px-4 py-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white rounded flex items-center justify-center flex-shrink-0 p-0.5">
            <img src={logo} alt="Vanuatu Dept. of Fisheries" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-[13px] text-white leading-tight">CBFM Platform</p>
            <p className="text-ocean-400 text-[10px] leading-tight mt-0.5">Dept. of Fisheries · Vanuatu</p>
          </div>
        </div>
        {/* Ocean accent line — no cyan */}
        <div className="ocean-line" />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-10 flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
      <nav className="flex-1 py-1 pl-2 pr-2 overflow-y-auto space-y-0.5">
        <SectionLabel label="Overview" />
        {mainNav.map(item => <NavItem key={item.to} {...item} />)}

        <SectionLabel label="Data Management" />
        {dataNav.map(item => <NavItem key={item.to} {...item} />)}

        {isAdmin && (
          <>
            <SectionLabel label="Administration" />
            <NavItem to="/admin" icon={Settings} label="Admin Panel" color="#a78bfa" />
            <NavItem to="/admin" icon={Shield} label="Admin Panel" />
          </>
        )}
      </nav>

      {/* ── Status footer ── */}
      <div className="relative z-10 px-5 py-4 border-t" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <SidebarMarineStrip />
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-[11px]" style={{ color:'rgba(164,204,255,0.55)' }}>System Online</span>
        </div>
        <p className="text-[10px]" style={{ color:'rgba(100,143,200,0.40)' }}>
          &copy; {new Date().getFullYear()} Vanuatu Dept. of Fisheries
      <div className="px-4 py-3 border-t border-white/8">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="text-ocean-400 text-[10px]">System Online</span>
        </div>
        <p className="text-ocean-600 text-[10px]">
          © {new Date().getFullYear()} Vanuatu Dept. of Fisheries
        </p>
      </div>
    </aside>
  );
}
