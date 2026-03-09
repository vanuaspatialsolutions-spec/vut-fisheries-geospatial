import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../../utils/messaging';
import {
  LogOut, Bell, MessageSquare, Paperclip,
  LayoutDashboard, Users, Anchor, Activity, Database, Settings, FolderOpen,
} from 'lucide-react';

const routeMeta = {
  '/dashboard':        { title: 'Dashboard',              desc: 'Real-time overview',          icon: LayoutDashboard },
  '/surveys':          { title: 'Community Surveys',       desc: 'CBFM survey records',         icon: Users           },
  '/surveys/new':      { title: 'New Survey',              desc: 'Community Surveys',           icon: Users           },
  '/marine':           { title: 'Marine Areas',            desc: 'LMMAs & protected zones',     icon: Anchor          },
  '/marine/new':       { title: 'New Marine Area',         desc: 'Marine Areas',                icon: Anchor          },
  '/monitoring':       { title: 'Biological Monitoring',   desc: 'Reef & ecosystem data',       icon: Activity        },
  '/monitoring/new':   { title: 'New Monitoring Record',   desc: 'Biological Monitoring',       icon: Activity        },
  '/datasets':         { title: 'Datasets',                desc: 'Files & geospatial data',     icon: Database        },
  '/datasets/upload':  { title: 'Upload Dataset',          desc: 'Datasets',                    icon: Database        },
  '/files':            { title: 'My Files',                desc: 'Personal file storage',       icon: FolderOpen      },
  '/messages':         { title: 'Messages',                desc: 'Chat with team members',      icon: MessageSquare   },
  '/admin':            { title: 'Admin Panel',             desc: 'User & content management',   icon: Settings        },
};

const roleBadge = {
  admin:             'bg-gray-100 text-gray-700',
  staff:             'bg-gray-100 text-gray-700',
  community_officer: 'bg-gray-100 text-gray-700',
};
const roleLabel = {
  admin:             'Admin',
  staff:             'Staff',
  community_officer: 'Officer',
};

function UserAvatar({ user }) {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
      {initials || '?'}
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const secs = Math.floor((Date.now() - d) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [notifications, setNotifications]   = useState([]);
  const [showNotifs, setShowNotifs]         = useState(false);
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  const meta = routeMeta[location.pathname]
    || Object.entries(routeMeta).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1]
    || { title: 'CBFM Platform', desc: '' };

  const RouteIcon = meta.icon;

  // ── real-time notifications ──────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user?.uid]);

  // ── close panel on outside click ─────────────────────────────────────────
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e) => {
      if (!bellRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  const handleNotifClick = async (notif) => {
    await markNotificationRead(user.uid, notif.id);
    setShowNotifs(false);
    if (notif.threadId) navigate(`/messages?thread=${notif.threadId}`);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(user.uid, notifications.map(n => n.id));
  };

  const unreadCount = notifications.length;

  return (
    <header className="h-12 flex-shrink-0 bg-white border-b border-gray-200 px-5 flex items-center justify-between">
      {/* Left — page title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {RouteIcon && (
          <RouteIcon size={14} className="text-gray-400 flex-shrink-0" strokeWidth={1.75} />
        )}
        <div className="min-w-0 flex items-baseline gap-2">
          <h1 className="text-sm font-semibold text-gray-800 tracking-tight leading-none">
            {meta.title}
          </h1>
          {meta.desc && (
            <span className="text-xs text-gray-400 hidden sm:inline">{meta.desc}</span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Notification bell */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setShowNotifs(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors relative"
            title="Notifications"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifs && (
            <div
              ref={panelRef}
              className="absolute right-0 top-9 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-800">
                  Notifications {unreadCount > 0 && <span className="text-gray-400 font-normal">({unreadCount} unread)</span>}
                </p>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                    <Bell size={22} className="opacity-30" />
                    <p className="text-xs">No new notifications</p>
                  </div>
                ) : notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${n.type === 'file_share' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                      {n.type === 'file_share' ? <Paperclip size={12} /> : <MessageSquare size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800">{n.fromName}</p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.text}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center gap-2">
          <UserAvatar user={user} />
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-medium text-gray-700 leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <span className={`text-[10px] px-1 py-0.5 rounded font-medium mt-0.5 inline-block ${roleBadge[user?.role] || 'bg-gray-100 text-gray-500'}`}>
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={13} />
        </button>
      </div>
    </header>
  );
}
