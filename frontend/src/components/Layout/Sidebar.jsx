import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Map, Database, Users, Activity,
  Anchor, Upload, Settings, Fish,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: Map, label: 'Interactive Map' },
  { to: '/surveys', icon: Users, label: 'Community Surveys' },
  { to: '/marine', icon: Anchor, label: 'Marine Areas' },
  { to: '/monitoring', icon: Activity, label: 'Bio. Monitoring' },
  { to: '/datasets', icon: Database, label: 'Datasets' },
];

export default function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="w-64 bg-ocean-900 text-white flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-5 border-b border-ocean-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ocean-600 rounded-lg flex items-center justify-center">
            <Fish size={22} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">CBFM Platform</p>
            <p className="text-ocean-300 text-xs">Dept. of Fisheries</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-ocean-600 text-white'
                : 'text-ocean-200 hover:bg-ocean-800 hover:text-white'}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-ocean-500 text-xs font-semibold uppercase tracking-wider">Admin</p>
            </div>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-ocean-600 text-white' : 'text-ocean-200 hover:bg-ocean-800 hover:text-white'}`
              }
            >
              <Settings size={18} />
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-ocean-800">
        <p className="text-ocean-400 text-xs text-center">
          Vanuatu Dept. of Fisheries<br />© {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
