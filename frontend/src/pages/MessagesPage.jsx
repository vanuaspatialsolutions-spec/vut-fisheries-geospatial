import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getOrCreateThread, createGroupThread, sendMessage, subscribeToThreads,
  subscribeToMessages, markThreadRead, deleteMessage, deleteThread,
  uploadAttachment,
} from '../utils/messaging';
import { getUsers } from '../utils/firestore';
import { toast } from 'sonner';
import {
  Send, MessageSquare, Plus, X, Search, Users,
  Download, File, FileText, FileImage, Trash2, Paperclip, XCircle, CornerDownLeft,
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat-bubble';
import { ChatMessageList } from '@/components/ui/chat-message-list';
import { ChatInput } from '@/components/ui/chat-input';

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
      className="flex items-center gap-2 mt-1 px-3 py-2 bg-black/10 border border-white/20 rounded-xl text-xs hover:bg-black/20 transition-colors max-w-xs"
    >
      <Icon size={14} className="flex-shrink-0 opacity-80" />
      <span className="truncate flex-1">{attachment.name}</span>
      <Download size={11} className="flex-shrink-0 opacity-60" />
    </a>
  );
}

function NewConversationModal({ currentUser, onClose, onOpen }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('dm');
  const [selected, setSelected] = useState([]);
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare size={12} className="text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">New Message</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setMode('dm'); setSelected([]); }}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${mode === 'dm' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${mode === 'group' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
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

          {mode === 'group' && selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.map(s => (
                <span key={s.uid} className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-medium">
                  {s.name}
                  <button onClick={() => toggleSelect({ uid: s.uid })} className="text-primary/60 hover:text-primary">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors text-left disabled:opacity-60 ${isChosen ? 'bg-primary/5' : ''}`}
                >
                  {mode === 'group' && (
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isChosen ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {isChosen && <span className="text-white text-[9px] font-bold">✓</span>}
                    </div>
                  )}
                  <UserAvatar user={u} sizePx={28} />
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
              className="w-full py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {creating ? 'Creating…' : `Create Group (${selected.length + 1} members)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const uid = user?.uid;
  const myName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const myPosition = user?.position || null;
  const myPhotoURL = user?.photoURL || null;

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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDeleteMsg = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try { await deleteMessage(activeThreadId, msgId, uid); }
    catch (err) { toast.error('Could not delete: ' + err.message); }
  };

  const handleDeleteThread = async (threadId, e) => {
    e.stopPropagation();
    if (!window.confirm('Remove this conversation from your list?')) return;
    try {
      await deleteThread(threadId, uid);
      if (activeThreadId === threadId) { setActiveThreadId(null); setSearchParams({}); }
    } catch (err) { toast.error('Could not remove conversation: ' + err.message); }
  };

  const openThread = useCallback((tid) => {
    setActiveThreadId(tid);
    setSearchParams({ thread: tid });
  }, [setSearchParams]);

  const activeThread = threads.find(t => t.id === activeThreadId);
  const threadName = activeThread ? getThreadDisplayName(activeThread, uid) : '';
  const threadSubtitle = activeThread?.isGroup ? `${activeThread.participants?.length || 0} members` : '';
  const filteredThreads = threads.filter(t =>
    getThreadDisplayName(t, uid).toLowerCase().includes(threadSearch.toLowerCase())
  );
  const meAsUser = { firstName: user?.firstName, lastName: user?.lastName, photoURL: user?.photoURL };

  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ height: 'calc(100vh - 7.5rem)' }}>

      {/* ── Thread list ── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/40">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
              <MessageSquare size={11} className="text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Messages</h2>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
            title="New conversation"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="px-3 py-2.5 border-b border-gray-100 bg-white">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2 text-gray-400" />
            <input
              className="w-full text-xs pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 bg-gray-50 transition-colors"
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
              <button onClick={() => setShowNew(true)} className="text-xs text-primary hover:underline mt-1">Start one</button>
            </div>
          ) : filteredThreads.map(t => {
            const name = getThreadDisplayName(t, uid);
            const unread = t.unread?.[uid] || 0;
            const isActive = t.id === activeThreadId;
            return (
              <div
                key={t.id}
                className={`group relative flex items-start gap-3 px-3 py-3 cursor-pointer transition-all border-b border-gray-100/80
                  ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-white border-l-2 border-l-transparent'}`}
                onClick={() => openThread(t.id)}
              >
                <div className="relative w-8 h-8 flex-shrink-0 mt-0.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold ${isActive ? 'bg-primary' : 'bg-slate-600'}`}>
                    {t.isGroup ? <Users size={13} /> : getInitials(name)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-gray-900' : isActive ? 'font-medium text-primary' : 'font-medium text-gray-700'}`}>{name}</p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(t.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className={`text-[11px] truncate ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{t.lastMessage || 'No messages yet'}</p>
                    {unread > 0 && (
                      <span className="bg-primary text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 font-medium">{unread > 9 ? '9+' : unread}</span>
                    )}
                  </div>
                </div>
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
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-white">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-white to-slate-50/60">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold bg-primary flex-shrink-0">
              {activeThread?.isGroup ? <Users size={13} /> : getInitials(threadName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{threadName}</p>
              {threadSubtitle
                ? <p className="text-[10px] text-gray-400">{threadSubtitle}</p>
                : <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Online</p>
              }
            </div>
          </div>

          {/* Messages — 21st.dev ChatMessageList with auto-scroll */}
          <ChatMessageList className="flex-1 min-h-0 bg-slate-50/20" smooth>
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-12">No messages yet — say hello!</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderId === uid;
              const senderForAvatar = {
                firstName: msg.senderName?.split(' ')[0] || '',
                lastName: msg.senderName?.split(' ').slice(1).join(' ') || '',
                photoURL: msg.senderPhotoURL || null,
              };
              return (
                <ChatBubble key={msg.id} variant={isMine ? 'sent' : 'received'}>
                  {!isMine && <ChatBubbleAvatar user={senderForAvatar} />}
                  {isMine && <ChatBubbleAvatar user={meAsUser} />}

                  <div className={`flex flex-col max-w-[68%] ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && (
                      <div className="flex items-baseline gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-semibold text-gray-600">{msg.senderName}</span>
                        {msg.senderPosition && <span className="text-[10px] text-gray-400">{msg.senderPosition}</span>}
                      </div>
                    )}

                    <div className={`group/msg flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.deleted ? (
                        <ChatBubbleMessage variant={isMine ? 'sent' : 'received'} className="italic opacity-50 !bg-transparent border border-dashed border-gray-300 !text-gray-400">
                          Message deleted
                        </ChatBubbleMessage>
                      ) : (
                        <>
                          <div className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                            {msg.text && (
                              <ChatBubbleMessage variant={isMine ? 'sent' : 'received'}>
                                {msg.text}
                              </ChatBubbleMessage>
                            )}
                            {msg.attachment && <AttachmentCard attachment={msg.attachment} />}
                          </div>
                          {isMine && (
                            <button
                              onClick={() => handleDeleteMsg(msg.id)}
                              className="opacity-0 group-hover/msg:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 flex-shrink-0 mb-1"
                              title="Delete message"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </ChatBubble>
              );
            })}
          </ChatMessageList>

          {/* Pending file preview */}
          {pendingFile && (
            <div className="flex-shrink-0 px-4 pt-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-gray-700 w-fit max-w-xs">
                <Paperclip size={12} className="text-primary flex-shrink-0" />
                <span className="truncate">{pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><XCircle size={13} /></button>
              </div>
              {uploadProgress !== null && (
                <div className="mt-1.5 h-1 bg-gray-200 rounded-full w-48">
                  <div className="h-1 bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          )}

          {/* 21st.dev–styled ChatInput */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
            <div className="relative rounded-xl border border-gray-200 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all p-1">
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { if (e.target.files[0]) setPendingFile(e.target.files[0]); e.target.value = ''; }} />
              <ChatInput
                ref={textareaRef}
                className="min-h-[44px] max-h-[120px] resize-none rounded-lg border-0 p-3 shadow-none focus-visible:ring-0 text-sm leading-relaxed"
                placeholder="Type a message… (Enter to send)"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <div className="flex items-center justify-between px-2 pb-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Attach file"
                >
                  <Paperclip size={15} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={(!text.trim() && !pendingFile) || sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  {sending ? 'Sending…' : 'Send'}
                  <CornerDownLeft size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 bg-slate-50/30">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageSquare size={28} className="text-primary opacity-60" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">No conversation selected</p>
            <p className="text-xs text-gray-400 mt-1">Choose a conversation or start a new one</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 text-xs px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus size={12} /> New Message
          </button>
        </div>
      )}

      {showNew && (
        <NewConversationModal currentUser={user} onClose={() => setShowNew(false)} onOpen={openThread} />
      )}
    </div>
  );
}
