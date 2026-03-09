import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Database, Users, Activity,
  Anchor, Settings, FolderOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map',       icon: Map,             label: 'Interactive Map' },
];

const dataNav = [
  { to: '/surveys',    icon: Users,       label: 'Community Surveys' },
  { to: '/marine',     icon: Anchor,      label: 'Marine Areas' },
  { to: '/monitoring', icon: Activity,    label: 'Bio. Monitoring' },
  { to: '/datasets',   icon: Database,    label: 'Datasets' },
  { to: '/files',      icon: FolderOpen,  label: 'My Files' },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors duration-100
        ${isActive
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-normal'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={14} className={isActive ? 'text-gray-700' : 'text-gray-400'} strokeWidth={isActive ? 2 : 1.75} />
          <span className="leading-none tracking-tight">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] px-2.5 pt-4 pb-1">
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { isAdmin } = useAuth();
  return (
    <aside className="w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              src={`${import.meta.env.BASE_URL}fisheries-logo.png`}
              alt="Vanuatu Fisheries"
              className="w-6 h-6 object-contain"
            />
          </div>
          <div>
            <p className="font-semibold text-[12px] text-gray-800 leading-tight tracking-tight">CBFM Platform</p>
            <p className="text-gray-400 text-[10px] leading-tight mt-0.5 tracking-tight">Dept. of Fisheries · Vanuatu</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1 px-2 overflow-y-auto">
        <SectionLabel label="Overview" />
        <div className="space-y-0.5">
          {mainNav.map(item => <NavItem key={item.to} {...item} />)}
        </div>

        <SectionLabel label="Data Management" />
        <div className="space-y-0.5">
          {dataNav.map(item => <NavItem key={item.to} {...item} />)}
        </div>

        {isAdmin && (
          <>
            <SectionLabel label="Administration" />
            <div className="space-y-0.5">
              <NavItem to="/admin" icon={Settings} label="Admin Panel" />
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-gray-100">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
          <span className="text-gray-400 text-[10px]">System Online</span>
        </div>
        <p className="text-gray-300 text-[10px]">
          © {new Date().getFullYear()} Vanuatu Dept. of Fisheries
        </p>
      </div>
    </aside>
  );
}
