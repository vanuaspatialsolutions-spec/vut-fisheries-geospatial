import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getOrCreateThread, sendMessage, subscribeToThreads,
  subscribeToMessages, markThreadRead, makeThreadId, deleteMessage,
} from '../utils/messaging';
import { getUsers } from '../utils/firestore';
import toast from 'react-hot-toast';
import {
  Send, Paperclip, MessageSquare, Plus, X, Search,
  Download, File, FileText, FileImage, Trash2,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function getFileIcon(contentType) {
  if (!contentType) return File;
  if (contentType.startsWith('image/')) return FileImage;
  if (contentType.startsWith('text/') || contentType === 'application/pdf') return FileText;
  return File;
}

function AttachmentCard({ attachment }) {
  const Icon = getFileIcon(attachment.contentType);
  return (
    <a
      href={attachment.downloadURL}
      download={attachment.name}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1.5 px-3 py-2 bg-white/70 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-white transition-colors max-w-xs"
    >
      <Icon size={14} className="text-gray-400 flex-shrink-0" />
      <span className="truncate flex-1">{attachment.name}</span>
      <Download size={11} className="text-gray-400 flex-shrink-0" />
    </a>
  );
}

// ── new conversation modal ────────────────────────────────────────────────────

function NewConversationModal({ currentUser, onClose, onOpen }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers()
      .then(all => setUsers(all.filter(u => u.uid !== currentUser.uid && u.firstName)))
      .catch(() => toast.error('Could not load users'))
      .finally(() => setLoading(false));
  }, [currentUser.uid]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const [selecting, setSelecting] = useState(false);

  const handleSelect = async (target) => {
    setSelecting(true);
    try {
      const myName = `${currentUser.firstName} ${currentUser.lastName}`;
      const targetName = `${target.firstName} ${target.lastName}`;
      const tid = await getOrCreateThread(currentUser.uid, myName, target.uid, targetName);
      onOpen(tid, target);
      onClose();
    } catch (err) {
      toast.error('Could not open conversation: ' + (err.message || 'permission denied'));
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">New Message</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              className="form-input pl-8 py-2 text-sm w-full"
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
            {loading ? (
              <p className="text-center text-xs text-gray-400 py-8">Loading users…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">No users found</p>
            ) : filtered.map(u => (
              <button
                key={u.uid}
                onClick={() => handleSelect(u)}
                disabled={selecting}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
              >
                <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                  {`${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-400 truncate">{u.role?.replace('_', ' ')} · {u.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(searchParams.get('thread') || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const uid = user?.uid;
  const myName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  // ── thread list subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToThreads(uid, setThreads);
    return () => unsub();
  }, [uid]);

  // ── open thread from URL param ──────────────────────────────────────────────
  useEffect(() => {
    const t = searchParams.get('thread');
    if (t) setActiveThreadId(t);
  }, []); // eslint-disable-line

  // ── message subscription for active thread ──────────────────────────────────
  useEffect(() => {
    if (!activeThreadId) { setMessages([]); return; }
    const unsub = subscribeToMessages(activeThreadId, setMessages);
    markThreadRead(activeThreadId, uid).catch(() => {});
    return () => unsub();
  }, [activeThreadId, uid]);

  // ── auto-scroll to latest message ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── send ─────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !activeThreadId) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(activeThreadId, uid, myName, trimmed);
    } catch (err) {
      toast.error('Failed to send: ' + err.message);
      setText(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── delete message ───────────────────────────────────────────────────────────
  const handleDelete = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteMessage(activeThreadId, msgId, uid);
    } catch (err) {
      toast.error('Could not delete: ' + err.message);
    }
  };

  // ── open thread ──────────────────────────────────────────────────────────────
  const openThread = useCallback((tid) => {
    setActiveThreadId(tid);
    setSearchParams({ thread: tid });
  }, [setSearchParams]);

  const openNewThread = (tid) => openThread(tid);

  // ── active thread data ───────────────────────────────────────────────────────
  const activeThread = threads.find(t => t.id === activeThreadId);
  const otherName = activeThread
    ? Object.entries(activeThread.participantNames || {}).find(([k]) => k !== uid)?.[1] || 'Unknown'
    : '';

  const filteredThreads = threads.filter(t => {
    const other = Object.entries(t.participantNames || {}).find(([k]) => k !== uid)?.[1] || '';
    return other.toLowerCase().includes(threadSearch.toLowerCase());
  });

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ maxHeight: 'calc(100vh - 6rem)' }}>

      {/* ── Thread list ── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Messages</h2>
          <button
            onClick={() => setShowNew(true)}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="New conversation"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-gray-50">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2 text-gray-400" />
            <input
              className="w-full text-xs pl-7 pr-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300 bg-gray-50"
              placeholder="Search conversations…"
              value={threadSearch}
              onChange={e => setThreadSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <MessageSquare size={28} className="opacity-30" />
              <p className="text-xs">No conversations yet</p>
              <button
                onClick={() => setShowNew(true)}
                className="text-xs text-gray-500 hover:text-gray-800 underline mt-1"
              >
                Start one
              </button>
            </div>
          ) : filteredThreads.map(t => {
            const other = Object.entries(t.participantNames || {}).find(([k]) => k !== uid)?.[1] || 'Unknown';
            const otherUid = t.participants?.find(p => p !== uid);
            const initials = other.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const unread = t.unread?.[uid] || 0;
            const isActive = t.id === activeThreadId;

            return (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b border-gray-50 ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 mt-0.5">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {other}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(t.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className={`text-[11px] truncate ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {t.lastMessage || 'No messages yet'}
                    </p>
                    {unread > 0 && (
                      <span className="bg-gray-900 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 font-medium">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Message thread ── */}
      {activeThreadId ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
              {otherName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-gray-800">{otherName}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-12">No messages yet — say hello!</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderId === uid;
              const time = formatTime(msg.createdAt);
              return (
                <div key={msg.id} className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMine && (
                      <span className="text-[10px] text-gray-400 mb-1 px-1">{msg.senderName}</span>
                    )}
                    <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.deleted ? (
                        <div className="px-3 py-2 rounded-2xl text-xs italic text-gray-400 bg-gray-100 border border-dashed border-gray-200">
                          Message deleted
                        </div>
                      ) : (
                        <>
                          {msg.text && (
                            <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                              isMine
                                ? 'bg-gray-900 text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                            }`}>
                              {msg.text}
                            </div>
                          )}
                          {msg.attachment && <AttachmentCard attachment={msg.attachment} />}
                        </>
                      )}
                      {isMine && !msg.deleted && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500"
                          title="Delete message"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">{time}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[40px] max-h-[120px]"
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40 flex-shrink-0"
                title="Send (Enter)"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
          <MessageSquare size={40} className="opacity-20" />
          <p className="text-sm">Select a conversation or start a new one</p>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          >
            <Plus size={12} /> New Message
          </button>
        </div>
      )}

      {/* New conversation modal */}
      {showNew && (
        <NewConversationModal
          currentUser={user}
          onClose={() => setShowNew(false)}
          onOpen={openNewThread}
        />
      )}
    </div>
  );
}
