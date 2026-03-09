import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getOrCreateThread, createGroupThread, sendMessage, subscribeToThreads,
  subscribeToMessages, markThreadRead, deleteMessage, deleteThread,
  uploadAttachment,
} from '../utils/messaging';
import { getUsers } from '../utils/firestore';
import toast from 'react-hot-toast';
import {
  Send, MessageSquare, Plus, X, Search, Users,
  Download, File, FileText, FileImage, Trash2, Paperclip, XCircle,
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

// ── helpers ───────────────────────────────────────────────────────────────────

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

function getThreadDisplayName(t, uid) {
  if (t.isGroup) return t.name || 'Group Chat';
  return Object.entries(t.participantNames || {}).find(([k]) => k !== uid)?.[1] || 'Unknown';
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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

// ── New conversation modal (DM + Group) ───────────────────────────────────────

function NewConversationModal({ currentUser, onClose, onOpen }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('dm'); // 'dm' | 'group'
  const [selected, setSelected] = useState([]); // [{uid, name}] for group
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

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

  const toggleSelect = (u) => {
    const exists = selected.find(s => s.uid === u.uid);
    if (exists) setSelected(sel => sel.filter(s => s.uid !== u.uid));
    else setSelected(sel => [...sel, { uid: u.uid, name: `${u.firstName} ${u.lastName}` }]);
  };

  const handleDM = async (target) => {
    setCreating(true);
    try {
      const myName = `${currentUser.firstName} ${currentUser.lastName}`;
      const targetName = `${target.firstName} ${target.lastName}`;
      const tid = await getOrCreateThread(currentUser.uid, myName, target.uid, targetName);
      onOpen(tid);
      onClose();
    } catch (err) {
      toast.error('Could not open conversation: ' + (err.message || 'permission denied'));
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (selected.length < 1) { toast.error('Select at least one other member'); return; }
    if (!groupName.trim()) { toast.error('Enter a group name'); return; }
    setCreating(true);
    try {
      const myName = `${currentUser.firstName} ${currentUser.lastName}`;
      const tid = await createGroupThread(currentUser.uid, myName, selected, groupName.trim());
      onOpen(tid);
      onClose();
    } catch (err) {
      toast.error('Could not create group: ' + (err.message || 'permission denied'));
    } finally {
      setCreating(false);
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

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setMode('dm'); setSelected([]); }}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === 'dm' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${mode === 'group' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Users size={11} /> Group Chat
          </button>
        </div>

        <div className="p-4 space-y-3">
          {mode === 'group' && (
            <input
              className="form-input py-2 text-sm w-full"
              placeholder="Group name…"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              autoFocus
            />
          )}

          {/* Selected members chips (group mode) */}
          {mode === 'group' && selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.map(s => (
                <span key={s.uid} className="flex items-center gap-1 text-[11px] bg-gray-100 rounded-full px-2 py-0.5 text-gray-700">
                  {s.name}
                  <button onClick={() => toggleSelect({ uid: s.uid })} className="text-gray-400 hover:text-gray-700">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              className="form-input pl-8 py-2 text-sm w-full"
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus={mode === 'dm'}
            />
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
            {loading ? (
              <p className="text-center text-xs text-gray-400 py-8">Loading users…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">No users found</p>
            ) : filtered.map(u => {
              const isChosen = selected.some(s => s.uid === u.uid);
              return (
                <button
                  key={u.uid}
                  onClick={() => mode === 'dm' ? handleDM(u) : toggleSelect(u)}
                  disabled={creating}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-60 ${isChosen ? 'bg-gray-50' : ''}`}
                >
                  {mode === 'group' && (
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isChosen ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                      {isChosen && <span className="text-white text-[9px]">✓</span>}
                    </div>
                  )}
                  <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                    {`${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-400 truncate">{u.role?.replace('_', ' ')} · {u.email}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {mode === 'group' && (
            <button
              onClick={handleCreateGroup}
              disabled={creating || selected.length === 0 || !groupName.trim()}
              className="w-full py-2 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {creating ? 'Creating…' : `Create Group (${selected.length + 1} members)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
  // Attachment state
  const [pendingFile, setPendingFile] = useState(null); // File object
  const [uploadProgress, setUploadProgress] = useState(null); // 0-100 or null
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const uid = user?.uid;
  const myName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const myPosition  = user?.position  || null;
  const myPhotoURL  = user?.photoURL  || null;

  // ── subscriptions ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    return subscribeToThreads(uid, setThreads);
  }, [uid]);

  useEffect(() => {
    const t = searchParams.get('thread');
    if (t) setActiveThreadId(t);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!activeThreadId) { setMessages([]); return; }
    const unsub = subscribeToMessages(activeThreadId, setMessages);
    markThreadRead(activeThreadId, uid).catch(() => {});
    return unsub;
  }, [activeThreadId, uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingFile) || !activeThreadId) return;
    setSending(true);
    const savedText = trimmed;
    const savedFile = pendingFile;
    setText('');
    setPendingFile(null);
    try {
      let attachment = null;
      if (savedFile) {
        setUploadProgress(0);
        attachment = await uploadAttachment(activeThreadId, savedFile, setUploadProgress);
        setUploadProgress(null);
      }
      await sendMessage(activeThreadId, uid, myName, savedText, attachment, myPosition, myPhotoURL);
    } catch (err) {
      toast.error('Failed to send: ' + err.message);
      setText(savedText);
      setPendingFile(savedFile);
      setUploadProgress(null);
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

  // ── delete message ────────────────────────────────────────────────────────
  const handleDeleteMsg = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteMessage(activeThreadId, msgId, uid);
    } catch (err) {
      toast.error('Could not delete: ' + err.message);
    }
  };

  // ── delete (leave) conversation ───────────────────────────────────────────
  const handleDeleteThread = async (threadId, e) => {
    e.stopPropagation();
    if (!window.confirm('Remove this conversation from your list?')) return;
    try {
      await deleteThread(threadId, uid);
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setSearchParams({});
      }
    } catch (err) {
      toast.error('Could not remove conversation: ' + err.message);
    }
  };

  // ── open thread ───────────────────────────────────────────────────────────
  const openThread = useCallback((tid) => {
    setActiveThreadId(tid);
    setSearchParams({ thread: tid });
  }, [setSearchParams]);

  // ── active thread metadata ────────────────────────────────────────────────
  const activeThread = threads.find(t => t.id === activeThreadId);
  const threadName = activeThread ? getThreadDisplayName(activeThread, uid) : '';
  const threadSubtitle = activeThread?.isGroup
    ? `${activeThread.participants?.length || 0} members`
    : '';

  const filteredThreads = threads.filter(t =>
    getThreadDisplayName(t, uid).toLowerCase().includes(threadSearch.toLowerCase())
  );

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
              <button onClick={() => setShowNew(true)} className="text-xs text-gray-500 hover:text-gray-800 underline mt-1">
                Start one
              </button>
            </div>
          ) : filteredThreads.map(t => {
            const name = getThreadDisplayName(t, uid);
            const initials = getInitials(name);
            const unread = t.unread?.[uid] || 0;
            const isActive = t.id === activeThreadId;

            return (
              <div
                key={t.id}
                className={`group relative flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-gray-50 ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                onClick={() => openThread(t.id)}
              >
                {/* Avatar */}
                <div className="relative w-8 h-8 flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-[11px] font-semibold">
                    {t.isGroup ? <Users size={13} /> : initials}
                  </div>
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {name}
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

                {/* Delete (leave) button — shown on hover */}
                <button
                  onClick={(e) => handleDeleteThread(t.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                  title="Remove conversation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
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
              {activeThread?.isGroup ? <Users size={12} /> : getInitials(threadName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{threadName}</p>
              {threadSubtitle && <p className="text-[10px] text-gray-400">{threadSubtitle}</p>}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-12">No messages yet — say hello!</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderId === uid;
              // Build a minimal user-like object from the message for UserAvatar
              const senderForAvatar = {
                firstName:  msg.senderName?.split(' ')[0] || '',
                lastName:   msg.senderName?.split(' ').slice(1).join(' ') || '',
                photoURL:   msg.senderPhotoURL || null,
              };
              return (
                <div key={msg.id} className={`group flex ${isMine ? 'flex-col items-end' : 'flex-row items-end gap-2'}`}>
                  {/* Avatar for incoming messages */}
                  {!isMine && (
                    <UserAvatar user={senderForAvatar} sizePx={26} className="mb-4 flex-shrink-0" />
                  )}
                  <div className={`max-w-[68%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && (
                      <div className="flex items-baseline gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-medium text-gray-600">{msg.senderName}</span>
                        {msg.senderPosition && (
                          <span className="text-[10px] text-gray-400">{msg.senderPosition}</span>
                        )}
                      </div>
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
                              isMine ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                            }`}>
                              {msg.text}
                            </div>
                          )}
                          {msg.attachment && <AttachmentCard attachment={msg.attachment} />}
                        </>
                      )}
                      {isMine && !msg.deleted && (
                        <button
                          onClick={() => handleDeleteMsg(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500"
                          title="Delete message"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending file preview */}
          {pendingFile && (
            <div className="flex-shrink-0 px-4 pt-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 w-fit max-w-xs">
                <Paperclip size={12} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{pendingFile.name}</span>
                <button
                  onClick={() => setPendingFile(null)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <XCircle size={13} />
                </button>
              </div>
              {uploadProgress !== null && (
                <div className="mt-1 h-1 bg-gray-200 rounded-full w-48">
                  <div className="h-1 bg-gray-900 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
            <div className="flex items-end gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={e => { if (e.target.files[0]) setPendingFile(e.target.files[0]); e.target.value = ''; }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
                title="Attach file"
              >
                <Paperclip size={15} />
              </button>
              <textarea
                ref={textareaRef}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[40px] max-h-[120px]"
                placeholder="Type a message… (Enter to send)"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={(!text.trim() && !pendingFile) || sending}
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

      {showNew && (
        <NewConversationModal
          currentUser={user}
          onClose={() => setShowNew(false)}
          onOpen={openThread}
        />
      )}
    </div>
  );
}
