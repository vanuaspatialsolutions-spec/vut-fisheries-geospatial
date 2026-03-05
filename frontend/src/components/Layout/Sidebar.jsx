import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Map, Database, Users, Activity,
  Anchor, Settings, ChevronRight,
} from 'lucide-react';
import fisheriesLogo from '/fisheries-logo.png';

const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: Map, label: 'Interactive Map' },
];

const dataNav = [
  { to: '/surveys', icon: Users, label: 'Community Surveys' },
  { to: '/marine', icon: Anchor, label: 'Marine Areas' },
  { to: '/monitoring', icon: Activity, label: 'Bio. Monitoring' },
  { to: '/datasets', icon: Database, label: 'Datasets' },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative
        ${isActive
          ? 'bg-white/15 text-white shadow-sm'
          : 'text-ocean-200 hover:bg-white/8 hover:text-white'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
          )}
          <Icon size={17} className={`transition-transform duration-150 ${isActive ? '' : 'group-hover:scale-110'}`} />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight size={14} className="opacity-60" />}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="text-ocean-500 text-[10px] font-semibold uppercase tracking-widest px-3 pt-4 pb-1">
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="w-64 bg-ocean-900 text-white flex flex-col shadow-xl flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/10 bg-white flex items-center justify-center">
            <img src={fisheriesLogo} alt="Fisheries Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-white">CBFM Platform</p>
            <p className="text-ocean-400 text-[11px] mt-0.5">Dept. of Fisheries · VUT</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
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

      {/* Status footer */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-ocean-300 text-[11px]">System Online</span>
        </div>
        <p className="text-ocean-500 text-[10px]">
          Vanuatu Dept. of Fisheries &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
