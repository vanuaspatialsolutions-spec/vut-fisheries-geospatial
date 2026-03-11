import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Folder, FolderOpen, FolderPlus, Upload, MoreHorizontal, Eye, Pencil,
  Share2, Trash2, MoveRight, ChevronRight, Home, LayoutGrid, List,
  File, FileText, FileImage, FileVideo, FileArchive, X, Download,
  Copy, Mail, Check, Send, Search, Users,
} from 'lucide-react';
import {
  createFolder, renameFolder, deleteFolderRecursive, moveFolder,
  getAllFolders, uploadFile, renameFile, deleteFile, moveFile,
  getFilesInFolder, getDescendantIds,
} from '../utils/fileManager';
import { getUsers } from '../utils/firestore';
import { getOrCreateThread, sendMessage } from '../utils/messaging';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFileIcon(contentType, name) {
  if (!contentType && !name) return File;
  const type = contentType || '';
  const ext  = (name || '').split('.').pop()?.toLowerCase();
  if (type.startsWith('image/')) return FileImage;
  if (type.startsWith('video/')) return FileVideo;
  if (type === 'application/pdf' || type.startsWith('text/') || ['txt','csv','json','geojson','kml','xml','md'].includes(ext)) return FileText;
  if (type.includes('zip') || type.includes('archive') || ['zip','gz','tar','rar','7z'].includes(ext)) return FileArchive;
  return File;
}

function getFolderPath(allFolders, folderId) {
  if (!folderId) return 'Root';
  const folderMap = Object.fromEntries(allFolders.map(f => [f.id, f]));
  const parts = [];
  let current = folderId;
  while (current) {
    const f = folderMap[current];
    if (!f) break;
    parts.unshift(f.name);
    current = f.parentId;
  }
  return 'Root / ' + parts.join(' / ');
}

// ── shared modal shell ────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({ file, onClose }) {
  const isImage = file.contentType?.startsWith('image/');
  const isPDF   = file.contentType === 'application/pdf';
  const isText  = file.contentType?.startsWith('text/') || (file.name || '').match(/\.(txt|csv|json|geojson|kml|xml|md)$/i);
  const [textContent, setTextContent] = useState(null);

  useEffect(() => {
    if (!isText) return;
    fetch(file.downloadURL)
      .then(r => r.text())
      .then(setTextContent)
      .catch(() => setTextContent('Unable to load preview for this file.'));
  }, [file.downloadURL, isText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <a
              href={file.downloadURL} download={file.name} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              <Download size={12} /> Download
            </a>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {isImage && (
            <img src={file.downloadURL} alt={file.name} className="max-w-full mx-auto rounded shadow" />
          )}
          {isPDF && (
            <iframe src={file.downloadURL} title={file.name} className="w-full h-[60vh] rounded border border-gray-200" />
          )}
          {isText && (
            textContent !== null
              ? <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-mono bg-gray-50 p-4 rounded border border-gray-100">{textContent}</pre>
              : <p className="text-sm text-gray-400 text-center py-12">Loading preview…</p>
          )}
          {!isImage && !isPDF && !isText && (
            <div className="text-center py-16">
              <File size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-500 mb-4">Preview not available for this file type.</p>
              <a
                href={file.downloadURL} download={file.name} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 btn-primary text-sm"
              >
                <Download size={14} /> Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── share modal ───────────────────────────────────────────────────────────────

function ShareModal({ file, onClose }) {
  const [email, setEmail]   = useState('');
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(file.downloadURL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sendEmail = () => {
    if (!email.trim()) { toast.error('Enter a recipient email address'); return; }
    const subject = encodeURIComponent(`Shared file: ${file.name}`);
    const body    = encodeURIComponent(
      `Hi,\n\nA file has been shared with you from the CBFM Fisheries Platform.\n\nFile: ${file.name}\nDownload link: ${file.downloadURL}\n\nRegards`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    toast.success('Email client opened');
    onClose();
  };

  return (
    <Modal title={`Share — ${file.name}`} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <label className="form-label">Shareable Link</label>
          <div className="flex gap-2 mt-1">
            <input value={file.downloadURL} readOnly className="form-input text-xs flex-1 bg-gray-50 text-gray-500 select-all" />
            <button
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors flex-shrink-0 ${copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        </div>
        <div>
          <label className="form-label">Share via Email</label>
          <div className="flex gap-2 mt-1">
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="recipient@example.com" className="form-input flex-1"
              onKeyDown={e => e.key === 'Enter' && sendEmail()}
            />
            <button onClick={sendEmail} className="flex items-center gap-1.5 px-3 btn-primary text-xs flex-shrink-0">
              <Mail size={12} /> Send
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Opens your email client with a pre-filled message containing the download link.</p>
        </div>
      </div>
    </Modal>
  );
}

// ── send to user modal ────────────────────────────────────────────────────────

function SendToUserModal({ file, currentUser, onClose, onSent }) {
  const [users, setUsers]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getUsers()
      .then(all => setUsers(all.filter(u => u.uid !== currentUser.uid && u.firstName)))
      .catch(() => toast.error('Could not load users'))
      .finally(() => setLoading(false));
  }, [currentUser.uid]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const handleSend = async (target) => {
    setSending(true);
    try {
      const myName = `${currentUser.firstName} ${currentUser.lastName}`;
      const targetName = `${target.firstName} ${target.lastName}`;
      const tid = await getOrCreateThread(currentUser.uid, myName, target.uid, targetName);
      await sendMessage(tid, currentUser.uid, myName, '', {
        name: file.name,
        size: file.size,
        contentType: file.contentType,
        downloadURL: file.downloadURL,
      });
      toast.success(`File sent to ${targetName}`);
      onSent(tid);
      onClose();
    } catch (err) {
      toast.error('Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`Send "${file.name}" to a user`} onClose={onClose}>
      <div className="space-y-3">
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
        <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
          {loading ? (
            <p className="text-center text-xs text-gray-400 py-8">Loading users…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">No users found</p>
          ) : filtered.map(u => (
            <button
              key={u.uid}
              onClick={() => handleSend(u)}
              disabled={sending}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
            >
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                {`${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-gray-400 truncate">{u.role?.replace('_', ' ')}</p>
              </div>
              <Send size={12} className="text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ── move modal ────────────────────────────────────────────────────────────────

function MoveModal({ item, itemType, allFolders, onMove, onClose }) {
  const [selected, setSelected] = useState(undefined);

  const excluded = new Set();
  if (itemType === 'folder') {
    excluded.add(item.id);
    getDescendantIds(allFolders, item.id).forEach(id => excluded.add(id));
    if (item.parentId !== undefined) excluded.add(item.parentId); // current location
  } else {
    if (item.folderId !== undefined) excluded.add(item.folderId); // current location
  }

  const targets = [
    ...(itemType === 'file' && item.folderId !== null ? [{ id: null, label: 'Root' }] : []),
    ...(itemType === 'folder' && item.parentId !== null ? [{ id: null, label: 'Root' }] : []),
    ...allFolders
      .filter(f => !excluded.has(f.id))
      .map(f => ({ id: f.id, label: getFolderPath(allFolders, f.id) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];

  return (
    <Modal title={`Move "${item.name}"`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-gray-500">Select a destination folder:</p>
        <div className="max-h-52 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-50">
          {targets.length === 0 ? (
            <p className="text-xs text-gray-400 p-3 text-center">No other folders available</p>
          ) : targets.map(t => (
            <button
              key={String(t.id)} onClick={() => setSelected(t.id)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${selected === t.id ? 'bg-ocean-50 text-ocean-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <FolderOpen size={13} className={selected === t.id ? 'text-ocean-500' : 'text-gray-400'} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
          <button
            onClick={() => selected !== undefined && onMove(selected)}
            disabled={selected === undefined}
            className="btn-primary text-sm px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Move Here
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── action dropdown ───────────────────────────────────────────────────────────

function ActionMenu({ actions, onClose }) {
  return (
    <div
      className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[150px]"
      onClick={e => e.stopPropagation()}
    >
      {actions.map(({ label, icon: Icon, onClick, danger }) => (
        <button
          key={label} onClick={() => { onClick(); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          <Icon size={12} /> {label}
        </button>
      ))}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uid = user?.uid;

  // Navigation state (stack of {id, name})
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const currentFolderId = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].id : null;

  // Data
  const [folders,    setFolders]    = useState([]);
  const [files,      setFiles]      = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [loading,    setLoading]    = useState(true);

  // View toggle
  const [view, setView] = useState('grid');

  // Open action menu id
  const [openMenuId, setOpenMenuId] = useState(null);

  // Upload
  const uploadInputRef  = useRef(null);
  const [uploadingFiles, setUploadingFiles] = useState([]); // [{name, progress}]

  // Modal states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [renameTarget,  setRenameTarget]  = useState(null); // {item, type}
  const [renameName,    setRenameName]    = useState('');
  const [deleteTarget,  setDeleteTarget]  = useState(null); // {item, type}
  const [moveTarget,    setMoveTarget]    = useState(null); // {item, type}
  const [previewTarget, setPreviewTarget] = useState(null); // file
  const [shareTarget,   setShareTarget]   = useState(null); // file
  const [sendTarget,    setSendTarget]    = useState(null); // file
  const [editTarget,    setEditTarget]    = useState(null); // file
  const [editName,      setEditName]      = useState('');
  const [replacing,     setReplacing]     = useState(false);
  const replaceInputRef = useRef(null);

  // ── load ────────────────────────────────────────────────────────────────────

  const loadContents = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [allF, currentFiles] = await Promise.all([
        getAllFolders(uid),
        getFilesInFolder(uid, currentFolderId),
      ]);
      setAllFolders(allF);
      setFolders(allF.filter(f => (f.parentId ?? null) === currentFolderId));
      setFiles(currentFiles);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContents(); }, [uid, currentFolderId]); // eslint-disable-line

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  // ── navigation ──────────────────────────────────────────────────────────────

  const openFolder      = (folder) => setBreadcrumbs(p => [...p, { id: folder.id, name: folder.name }]);
  const goToBreadcrumb  = (index)  => setBreadcrumbs(p => p.slice(0, index + 1));
  const goHome          = ()       => setBreadcrumbs([]);

  // ── folder operations ────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    const name = createFolderName.trim();
    if (!name) { toast.error('Enter a folder name'); return; }
    try {
      await createFolder(uid, name, currentFolderId);
      toast.success('Folder created');
      setCreateFolderOpen(false);
      setCreateFolderName('');
      loadContents();
    } catch { toast.error('Failed to create folder'); }
  };

  const handleRename = async () => {
    const name = renameName.trim();
    if (!name) { toast.error('Enter a name'); return; }
    try {
      if (renameTarget.type === 'folder') await renameFolder(uid, renameTarget.item.id, name);
      else await renameFile(uid, renameTarget.item.id, name);
      toast.success('Renamed');
      setRenameTarget(null);
      loadContents();
    } catch { toast.error('Failed to rename'); }
  };

  const handleDelete = async () => {
    try {
      if (deleteTarget.type === 'folder') await deleteFolderRecursive(uid, deleteTarget.item.id);
      else await deleteFile(uid, deleteTarget.item.id, deleteTarget.item.storagePath);
      toast.success('Deleted');
      setDeleteTarget(null);
      loadContents();
    } catch { toast.error('Failed to delete'); }
  };

  const handleMove = async (targetFolderId) => {
    try {
      if (moveTarget.type === 'folder') await moveFolder(uid, moveTarget.item.id, targetFolderId);
      else await moveFile(uid, moveTarget.item.id, targetFolderId);
      toast.success('Moved');
      setMoveTarget(null);
      loadContents();
    } catch { toast.error('Failed to move'); }
  };

  // ── file upload ──────────────────────────────────────────────────────────────

  const handleUploadFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    e.target.value = '';
    for (const file of picked) {
      setUploadingFiles(p => [...p, { name: file.name, progress: 0 }]);
      try {
        await uploadFile(uid, currentFolderId, file, (progress) => {
          setUploadingFiles(p => p.map(u => u.name === file.name ? { ...u, progress } : u));
        });
        toast.success(`${file.name} uploaded`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploadingFiles(p => p.filter(u => u.name !== file.name));
      }
    }
    loadContents();
  };

  // ── edit file ────────────────────────────────────────────────────────────────

  const handleEditSave = async () => {
    const name = editName.trim();
    if (!name) { toast.error('Enter a file name'); return; }
    try {
      await renameFile(uid, editTarget.id, name);
      toast.success('File name updated');
      setEditTarget(null);
      loadContents();
    } catch { toast.error('Failed to update file'); }
  };

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editTarget) return;
    e.target.value = '';
    setReplacing(true);
    try {
      const displayName = editTarget.name;
      const currentFid  = editTarget.folderId;
      await deleteFile(uid, editTarget.id, editTarget.storagePath);
      const newFile = await uploadFile(uid, currentFid, file, () => {});
      // Rename to original display name if it differs
      if (newFile.name !== displayName) {
        await renameFile(uid, newFile.id, displayName);
      }
      toast.success('File replaced');
      setEditTarget(null);
      loadContents();
    } catch { toast.error('Failed to replace file'); }
    setReplacing(false);
  };

  // ── action definitions ───────────────────────────────────────────────────────

  const folderActions = (folder) => [
    { label: 'Open',   icon: FolderOpen, onClick: () => openFolder(folder) },
    { label: 'Rename', icon: Pencil,     onClick: () => { setRenameTarget({ item: folder, type: 'folder' }); setRenameName(folder.name); } },
    { label: 'Move',   icon: MoveRight,  onClick: () => setMoveTarget({ item: folder, type: 'folder' }) },
    { label: 'Delete', icon: Trash2,     danger: true, onClick: () => setDeleteTarget({ item: folder, type: 'folder' }) },
  ];

  const fileActions = (file) => [
    { label: 'Preview',       icon: Eye,      onClick: () => setPreviewTarget(file) },
    { label: 'Edit',          icon: Pencil,   onClick: () => { setEditTarget(file); setEditName(file.name); } },
    { label: 'Share',         icon: Share2,   onClick: () => setShareTarget(file) },
    { label: 'Send to User',  icon: Send,     onClick: () => setSendTarget(file) },
    { label: 'Move',          icon: MoveRight, onClick: () => setMoveTarget({ item: file, type: 'file' }) },
    {
      label: 'Download', icon: Download, onClick: () => {
        const a = document.createElement('a'); a.href = file.downloadURL; a.download = file.name; a.click();
      },
    },
    { label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteTarget({ item: file, type: 'file' }) },
  ];

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── toolbar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white flex-shrink-0 gap-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
          <button onClick={goHome} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0">
            <Home size={12} />
            <span className="text-xs ml-0.5">My Files</span>
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1 min-w-0">
              <ChevronRight size={11} className="text-gray-300 flex-shrink-0" />
              <button
                onClick={() => goToBreadcrumb(i)}
                className={`text-xs truncate max-w-[70px] sm:max-w-[110px] md:max-w-[140px] transition-colors ${i === breadcrumbs.length - 1 ? 'text-gray-800 font-medium cursor-default' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setCreateFolderName(''); setCreateFolderOpen(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FolderPlus size={13} /> New Folder
          </button>
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs btn-primary"
          >
            <Upload size={13} /> Upload Files
          </button>
          <input ref={uploadInputRef} type="file" multiple className="hidden" onChange={handleUploadFiles} />
          <div className="w-px h-4 bg-gray-200" />
          <button
            onClick={() => setView('grid')}
            title="Grid view"
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${view === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => setView('list')}
            title="List view"
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${view === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            <List size={13} />
          </button>
        </div>
      </div>

      {/* ── upload progress ── */}
      {uploadingFiles.length > 0 && (
        <div className="px-5 py-2 bg-ocean-50 border-b border-ocean-100 flex-shrink-0 space-y-1.5">
          {uploadingFiles.map(u => (
            <div key={u.name} className="flex items-center gap-3">
              <span className="text-xs text-ocean-700 truncate max-w-xs">{u.name}</span>
              <div className="flex-1 h-1.5 bg-ocean-100 rounded-full overflow-hidden">
                <div className="h-full bg-ocean-500 rounded-full transition-all duration-200" style={{ width: `${u.progress}%` }} />
              </div>
              <span className="text-xs text-ocean-600 tabular-nums flex-shrink-0 w-8 text-right">{u.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── content area ── */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderOpen size={44} className="text-gray-200 mb-3" strokeWidth={1.25} />
            <p className="text-sm font-medium text-gray-400">This folder is empty</p>
            <p className="text-xs text-gray-300 mt-1">Create a folder or upload files to get started</p>
          </div>
        ) : view === 'grid' ? (

          /* ── grid ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {folders.map(folder => (
              <div key={folder.id} className="relative group">
                <button
                  onDoubleClick={() => openFolder(folder)}
                  className="w-full card p-3 text-left hover:border-ocean-200 hover:shadow-sm transition-all cursor-default"
                >
                  <Folder size={30} className="text-ocean-400 mb-2" strokeWidth={1.5} />
                  <p className="text-xs font-medium text-gray-700 truncate leading-snug">{folder.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Folder · double-click to open</p>
                </button>
                <div className="absolute top-1.5 right-1.5">
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === folder.id ? null : folder.id); }}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-white/80 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreHorizontal size={12} />
                  </button>
                  {openMenuId === folder.id && (
                    <ActionMenu actions={folderActions(folder)} onClose={() => setOpenMenuId(null)} />
                  )}
                </div>
              </div>
            ))}

            {files.map(file => {
              const FileIcon = getFileIcon(file.contentType, file.name);
              return (
                <div key={file.id} className="relative group">
                  <button
                    onDoubleClick={() => setPreviewTarget(file)}
                    className="w-full card p-3 text-left hover:border-ocean-200 hover:shadow-sm transition-all cursor-default"
                  >
                    <FileIcon size={30} className="text-gray-400 mb-2" strokeWidth={1.5} />
                    <p className="text-xs font-medium text-gray-700 truncate leading-snug">{file.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatSize(file.size)}</p>
                  </button>
                  <div className="absolute top-1.5 right-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === file.id ? null : file.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-white/80 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreHorizontal size={12} />
                    </button>
                    {openMenuId === file.id && (
                      <ActionMenu actions={fileActions(file)} onClose={() => setOpenMenuId(null)} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ── list ── */
          <div className="card overflow-hidden p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell w-24">Size</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell w-32">Modified</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {folders.map(folder => (
                  <tr key={folder.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-2.5">
                      <button onDoubleClick={() => openFolder(folder)} className="flex items-center gap-2 text-left w-full">
                        <Folder size={14} className="text-ocean-400 flex-shrink-0" strokeWidth={1.5} />
                        <span className="font-medium text-gray-700 hover:text-ocean-700 transition-colors">{folder.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">—</td>
                    <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{formatDate(folder.updatedAt)}</td>
                    <td className="px-4 py-2.5 relative text-right">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === folder.id ? null : folder.id); }}
                        className="w-6 h-6 inline-flex items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreHorizontal size={12} />
                      </button>
                      {openMenuId === folder.id && (
                        <ActionMenu actions={folderActions(folder)} onClose={() => setOpenMenuId(null)} />
                      )}
                    </td>
                  </tr>
                ))}
                {files.map(file => {
                  const FileIcon = getFileIcon(file.contentType, file.name);
                  return (
                    <tr key={file.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-2.5">
                        <button onDoubleClick={() => setPreviewTarget(file)} className="flex items-center gap-2 text-left w-full">
                          <FileIcon size={14} className="text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="font-medium text-gray-700">{file.name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{formatSize(file.size)}</td>
                      <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{formatDate(file.updatedAt)}</td>
                      <td className="px-4 py-2.5 relative text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === file.id ? null : file.id); }}
                          className="w-6 h-6 inline-flex items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreHorizontal size={12} />
                        </button>
                        {openMenuId === file.id && (
                          <ActionMenu actions={fileActions(file)} onClose={() => setOpenMenuId(null)} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════ MODALS ═══════════════════════ */}

      {/* Create Folder */}
      {createFolderOpen && (
        <Modal title="New Folder" onClose={() => setCreateFolderOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="form-label">Folder Name</label>
              <input
                autoFocus value={createFolderName} onChange={e => setCreateFolderName(e.target.value)}
                className="form-input mt-1" placeholder="e.g. Reports 2024"
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreateFolderOpen(false)} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
              <button onClick={handleCreateFolder} className="btn-primary text-sm px-3 py-1.5">Create</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rename */}
      {renameTarget && (
        <Modal title={`Rename ${renameTarget.type === 'folder' ? 'Folder' : 'File'}`} onClose={() => setRenameTarget(null)}>
          <div className="space-y-4">
            <div>
              <label className="form-label">New Name</label>
              <input
                autoFocus value={renameName} onChange={e => setRenameName(e.target.value)}
                className="form-input mt-1"
                onKeyDown={e => e.key === 'Enter' && handleRename()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenameTarget(null)} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
              <button onClick={handleRename} className="btn-primary text-sm px-3 py-1.5">Rename</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal title="Confirm Delete" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              {deleteTarget.type === 'folder' ? (
                <>Are you sure you want to delete the folder <strong className="text-gray-800">"{deleteTarget.item.name}"</strong>? All folders and files inside will be permanently deleted.</>
              ) : (
                <>Are you sure you want to delete <strong className="text-gray-800">"{deleteTarget.item.name}"</strong>? This cannot be undone.</>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
              <button onClick={handleDelete} className="btn-danger text-sm px-3 py-1.5">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Move */}
      {moveTarget && (
        <MoveModal
          item={moveTarget.item} itemType={moveTarget.type}
          allFolders={allFolders} onMove={handleMove} onClose={() => setMoveTarget(null)}
        />
      )}

      {/* Preview */}
      {previewTarget && <PreviewModal file={previewTarget} onClose={() => setPreviewTarget(null)} />}

      {/* Share */}
      {shareTarget && <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />}
      {sendTarget && (
        <SendToUserModal
          file={sendTarget}
          currentUser={user}
          onClose={() => setSendTarget(null)}
          onSent={(tid) => navigate(`/messages?thread=${tid}`)}
        />
      )}

      {/* Edit File (rename + replace content) */}
      {editTarget && (
        <Modal title={`Edit — ${editTarget.name}`} onClose={() => setEditTarget(null)}>
          <div className="space-y-5">
            <div>
              <label className="form-label">Display Name</label>
              <input
                autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                className="form-input mt-1"
                onKeyDown={e => e.key === 'Enter' && handleEditSave()}
              />
            </div>
            <div>
              <label className="form-label">Replace File Content</label>
              <button
                onClick={() => replaceInputRef.current?.click()}
                disabled={replacing}
                className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-ocean-300 hover:text-ocean-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={12} />
                {replacing ? 'Uploading replacement…' : 'Choose replacement file'}
              </button>
              <input ref={replaceInputRef} type="file" className="hidden" onChange={handleReplaceFile} />
              <p className="text-[10px] text-gray-400 mt-1.5">Uploading a replacement will permanently overwrite the current file.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
              <button onClick={handleEditSave} className="btn-primary text-sm px-3 py-1.5">Save Name</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
