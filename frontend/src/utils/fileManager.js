import { db, storage } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, where, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

const foldersCol = (uid) => collection(db, 'userFiles', uid, 'folders');
const filesCol   = (uid) => collection(db, 'userFiles', uid, 'files');

// ── helpers ───────────────────────────────────────────────────────────────────

export function getDescendantIds(allFolders, parentId) {
  const children = allFolders.filter(f => f.parentId === parentId).map(f => f.id);
  return children.reduce((acc, id) => [...acc, id, ...getDescendantIds(allFolders, id)], []);
}

// ── folders ───────────────────────────────────────────────────────────────────

export async function createFolder(uid, name, parentId = null) {
  return addDoc(foldersCol(uid), {
    name, parentId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function renameFolder(uid, folderId, name) {
  return updateDoc(doc(foldersCol(uid), folderId), { name, updatedAt: serverTimestamp() });
}

export async function moveFolder(uid, folderId, newParentId) {
  return updateDoc(doc(foldersCol(uid), folderId), {
    parentId: newParentId, updatedAt: serverTimestamp(),
  });
}

export async function getAllFolders(uid) {
  const snap = await getDocs(foldersCol(uid));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteFolderRecursive(uid, folderId) {
  const allFolders = await getAllFolders(uid);
  const toDelete = [folderId, ...getDescendantIds(allFolders, folderId)];
  for (const fid of toDelete) {
    const filesSnap = await getDocs(query(filesCol(uid), where('folderId', '==', fid)));
    for (const fileDoc of filesSnap.docs) {
      try { await deleteObject(ref(storage, fileDoc.data().storagePath)); } catch { /* already deleted */ }
      await deleteDoc(fileDoc.ref);
    }
    await deleteDoc(doc(foldersCol(uid), fid));
  }
}

// ── files ─────────────────────────────────────────────────────────────────────

export function uploadFile(uid, folderId = null, file, onProgress) {
  const storagePath = `userFiles/${uid}/${folderId ?? 'root'}/${Date.now()}_${file.name}`;
  const task = uploadBytesResumable(ref(storage, storagePath), file);
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const downloadURL = await getDownloadURL(task.snapshot.ref);
        const docRef = await addDoc(filesCol(uid), {
          name: file.name,
          originalName: file.name,
          folderId: folderId ?? null,
          downloadURL,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          storagePath,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        resolve({ id: docRef.id, name: file.name, downloadURL, contentType: file.type, size: file.size, storagePath, folderId });
      },
    );
  });
}

export async function renameFile(uid, fileId, name) {
  return updateDoc(doc(filesCol(uid), fileId), { name, updatedAt: serverTimestamp() });
}

export async function moveFile(uid, fileId, newFolderId) {
  return updateDoc(doc(filesCol(uid), fileId), { folderId: newFolderId, updatedAt: serverTimestamp() });
}

export async function deleteFile(uid, fileId, storagePath) {
  try { await deleteObject(ref(storage, storagePath)); } catch { /* already deleted */ }
  await deleteDoc(doc(filesCol(uid), fileId));
}

export async function getFilesInFolder(uid, folderId = null) {
  const snap = await getDocs(query(filesCol(uid), where('folderId', '==', folderId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
