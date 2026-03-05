import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Database, Activity,
  Anchor, Fish, ClipboardList,
} from 'lucide-react';

const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map',       icon: Map,             label: 'Interactive Map' },
];

const dataNav = [
  { to: '/surveys',    icon: ClipboardList, label: 'Community Surveys' },
  { to: '/marine',     icon: Anchor,        label: 'Marine Areas' },
  { to: '/monitoring', icon: Activity,      label: 'Bio. Monitoring' },
  { to: '/datasets',   icon: Database,      label: 'Datasets' },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 py-2 pr-3 text-sm font-medium transition-colors duration-100 rounded-r relative
        border-l-2 pl-[14px]
        ${isActive
          ? 'border-white bg-white/10 text-white'
          : 'border-transparent text-ocean-300 hover:bg-white/6 hover:text-ocean-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} className={isActive ? 'text-white' : 'text-ocean-400'} />
          <span className="leading-none">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="text-[9px] font-bold text-ocean-600 uppercase tracking-[0.18em] px-4 pt-5 pb-1.5">
      {label}
    </p>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-56 bg-ocean-900 flex flex-col flex-shrink-0">

      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-ocean-700 rounded flex items-center justify-center flex-shrink-0">
            <Fish size={14} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-[13px] text-white leading-tight">CBFM Platform</p>
            <p className="text-ocean-400 text-[10px] leading-tight mt-0.5">Dept. of Fisheries · Vanuatu</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-1 pl-2 pr-2 overflow-y-auto space-y-0.5">
        <SectionLabel label="Overview" />
        {mainNav.map(item => <NavItem key={item.to} {...item} />)}

        <SectionLabel label="Data Management" />
        {dataNav.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/8">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="text-ocean-400 text-[10px]">System Online · Demo Mode</span>
        </div>
        <p className="text-ocean-600 text-[10px]">
          © {new Date().getFullYear()} Vanuatu Dept. of Fisheries
        </p>
      </div>
    </aside>
  );
}
