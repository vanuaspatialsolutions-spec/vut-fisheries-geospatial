import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Database, Users, Activity,
  Anchor, Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
        ${isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
          <span className="leading-none">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] px-3 pt-5 pb-1.5">
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { isAdmin } = useAuth();
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}fisheries-logo.png`} alt="Vanuatu Fisheries"
              className="w-8 h-8 object-contain" />
          </div>
          <div>
            <p className="font-bold text-[13px] text-gray-900 leading-tight">CBFM Platform</p>
            <p className="text-gray-400 text-[10px] leading-tight mt-0.5">Dept. of Fisheries · Vanuatu</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-0.5">
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="text-gray-400 text-[10px]">System Online</span>
        </div>
        <p className="text-gray-300 text-[10px]">
          © {new Date().getFullYear()} Vanuatu Dept. of Fisheries
        </p>
      </div>
    </aside>
  );
}
