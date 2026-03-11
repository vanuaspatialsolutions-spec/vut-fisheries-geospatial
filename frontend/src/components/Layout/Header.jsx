import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../../utils/messaging';
import {
  LogOut, Bell, MessageSquare, Paperclip, Menu,
  LayoutDashboard, Users, Anchor, Activity, Database, Settings, FolderOpen, UserCircle,
} from 'lucide-react';
import UserAvatar from '../UserAvatar';
import toast from 'react-hot-toast';

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
  '/profile':          { title: 'My Profile',             desc: 'Account & profile settings',  icon: UserCircle      },
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


function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const secs = Math.floor((Date.now() - d) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function Header({ onMenuClick }) {
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
  const prevNotifIdsRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, (incoming) => {
      // First load — record existing IDs without toasting
      if (prevNotifIdsRef.current === null) {
        prevNotifIdsRef.current = new Set(incoming.map(n => n.id));
        setNotifications(incoming);
        return;
      }
      // Find notifications that weren't in the previous snapshot
      const newOnes = incoming.filter(n => !prevNotifIdsRef.current.has(n.id));
      prevNotifIdsRef.current = new Set(incoming.map(n => n.id));
      setNotifications(incoming);
      // Show a pop-up for each new notification (no message content shown)
      newOnes.forEach(n => {
        const isFile = n.type === 'file_share';
        toast(
          `${isFile ? 'New attachment' : 'New message'} from ${n.fromName}`,
          {
            icon: isFile ? '📎' : '💬',
            style: {
              background: isFile ? '#1e3a5f' : '#0c4a6e',
              color: '#fff',
              borderRadius: '8px',
            },
          }
        );
      });
    });
    return () => {
      unsub();
      prevNotifIdsRef.current = null;
    };
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
    <header className="h-12 flex-shrink-0 px-3 sm:px-5 flex items-center justify-between"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.60)',
        boxShadow: '0 2px 16px rgba(0,27,70,0.10), 0 1px 4px rgba(0,27,70,0.07), inset 0 -1px 0 rgba(0,27,70,0.05)',
      }}>
      {/* Left — hamburger (mobile) + page title */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Open navigation"
        >
          <Menu size={17} />
        </button>
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
              className="absolute right-0 top-9 z-50 w-80 rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.90)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.65)',
                boxShadow: '0 16px 48px rgba(0,27,70,0.20), 0 4px 12px rgba(0,27,70,0.10)',
              }}
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

        <Link to="/profile" className="flex items-center gap-2 rounded hover:bg-gray-50 px-1 py-0.5 transition-colors" title="My Profile">
          <UserAvatar user={user} sizePx={28} />
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-medium text-gray-700 leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <span className={`text-[10px] px-1 py-0.5 rounded font-medium mt-0.5 inline-block ${roleBadge[user?.role] || 'bg-gray-100 text-gray-500'}`}>
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
        </Link>

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
