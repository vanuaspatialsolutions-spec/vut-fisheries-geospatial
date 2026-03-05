import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Database, Activity,
  Anchor, ClipboardList,
} from 'lucide-react';

// ─── Dept. of Fisheries logo (inline SVG recreation) ───────────────────────
// Fish body curls into an Archimedean spiral; blue wave pairs on each side.
// Replace with <img src={logo} /> if you copy the actual PNG into public/.
function FisheriesLogo({ className }) {
  return (
    <svg
      viewBox="-6 -10 132 132"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
    >
      {/* ── Spiral rings (center 52, 84) ──────────────────────────── */}
      {/* Ring 2 (r=20): 11-o'clock → 3-o'clock, large clockwise arc */}
      <path d="M 42 66 A 20 20 0 1 1 72 84" stroke="#111" strokeWidth="3.4" strokeLinecap="round"/>
      {/* Ring 3 (r=13) */}
      <path d="M 45.5 72.7 A 13 13 0 1 1 65 84" stroke="#111" strokeWidth="2.9" strokeLinecap="round"/>
      {/* Ring 4 (r=7) */}
      <path d="M 48.5 77.9 A 7 7 0 1 1 59 84" stroke="#111" strokeWidth="2.4" strokeLinecap="round"/>
      {/* Centre dot */}
      <circle cx="52" cy="84" r="3.2" fill="#111"/>

      {/* ── Outer ring (r=30) + fish back — one connected stroke ── */}
      {/* Arc: 11-o'clock (37,58) clockwise 270° to 3-o'clock (82,84), then curves up to head */}
      <path
        d="M 37 58 A 30 30 0 1 1 82 84 C 86 74 90 60 92 46 C 94 34 93 26 91 22"
        stroke="#111" strokeWidth="4.6" strokeLinecap="round"
      />

      {/* ── Fish belly — head back down to 3-o'clock of outer ring ── */}
      <path
        d="M 91 22 C 90 34 83 48 74 60 C 67 70 65 80 73 87"
        stroke="#111" strokeWidth="4" strokeLinecap="round"
      />

      {/* ── Body fill (white) — covers spiral interior leaving rings visible ── */}
      <path
        d="M 38 59 C 32 40 50 13 74 11 C 93 9 108 24 103 42
           C 97 56 87 67 78 76 C 70 83 68 88 73 87
           A 30 30 0 0 0 38 59 Z"
        fill="white"
      />

      {/* ── Body stripes (skipjack-style longitudinal lines) ── */}
      <path d="M 70 13 C 90 20 103 36 101 52" stroke="#111" strokeWidth="2.1" strokeLinecap="round"/>
      <path d="M 62 21 C 82 30 94 48 90 64"  stroke="#111" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M 55 31 C 72 42 80 58 78 74"  stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>

      {/* ── Dorsal fin (solid black) ── */}
      <path d="M 78 18 C 83 4 97 -1 101 6 C 104 13 101 25 96 27 L 88 22 Z" fill="#111"/>

      {/* ── Pectoral fin ── */}
      <path d="M 89 44 C 86 54 80 60 76 62" stroke="#111" strokeWidth="2.2" strokeLinecap="round"/>

      {/* ── Head (solid black block) ── */}
      <path
        d="M 91 22 C 97 14 104 2 100 -4 C 96 -10 87 -7 83 3 L 87 13 L 91 21 Z"
        fill="#111"
      />

      {/* ── Eye ── */}
      <circle cx="95" cy="4"  r="5.5" fill="white"/>
      <circle cx="96" cy="5"  r="2.6" fill="#111"/>
      <circle cx="94" cy="3"  r="1.1" fill="white"/>

      {/* ── Lower jaw (separate rounded piece) ── */}
      <ellipse cx="99" cy="20" rx="4.8" ry="3.6" fill="white" stroke="#111" strokeWidth="1.9"/>
      <circle  cx="99" cy="21" r="1.8" fill="#111"/>

      {/* ── Mouth opening ── */}
      <path d="M 104 12 L 112  7" stroke="#111" strokeWidth="2"   strokeLinecap="round"/>
      <path d="M 104 19 L 112 16" stroke="#111" strokeWidth="1.7" strokeLinecap="round"/>

      {/* ── Blue waves — LEFT ────────────────────────────────────── */}
      {/* Upper pair */}
      <path d="M  4 68 C  9 60 16 60 21 68 C 26 76 33 76 38 68" stroke="#1565C0" strokeWidth="4"   strokeLinecap="round"/>
      <path d="M  6 75 C 11 67 18 67 23 75 C 28 83 35 83 40 75" stroke="#0D47A1" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
      {/* Lower pair */}
      <path d="M  4 84 C  9 76 16 76 21 84 C 26 92 33 92 38 84" stroke="#1565C0" strokeWidth="4"   strokeLinecap="round"/>
      <path d="M  6 91 C 11 83 18 83 23 91 C 28 99 35 99 40 91" stroke="#0D47A1" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>

      {/* ── Blue waves — RIGHT ───────────────────────────────────── */}
      {/* Upper pair */}
      <path d="M 80 68 C 85 60 92 60 97 68 C 102 76 109 76 114 68" stroke="#1565C0" strokeWidth="4"   strokeLinecap="round"/>
      <path d="M 82 75 C 87 67 94 67 99 75 C 104 83 111 83 116 75" stroke="#0D47A1" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
      {/* Lower pair */}
      <path d="M 80 84 C 85 76 92 76 97 84 C 102 92 109 92 114 84" stroke="#1565C0" strokeWidth="4"   strokeLinecap="round"/>
      <path d="M 82 91 C 87 83 94 83 99 91 C 104 99 111 99 116 91" stroke="#0D47A1" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
    </svg>
  );
}

// ─── Nav components ────────────────────────────────────────────────────────

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
          {/* White container so logo colours show on dark sidebar */}
          <div className="w-9 h-9 bg-white rounded flex items-center justify-center flex-shrink-0 p-0.5">
            <FisheriesLogo className="w-full h-full" />
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
