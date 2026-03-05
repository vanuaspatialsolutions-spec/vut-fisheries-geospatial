/**
 * Firestore service layer — replaces all Express API calls.
 * All reads/writes go directly to Firebase from the browser.
 */
import { db, storage, auth } from '../firebase';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, getBytes } from 'firebase/storage';

// ── helpers ────────────────────────────────────────────────────────────────

function docToObj(d) {
  return { id: d.id, ...d.data() };
}

function paginate(arr, page, pageSize) {
  const total = arr.length;
  return {
    data: arr.slice((page - 1) * pageSize, page * pageSize),
    pagination: { total, pages: Math.ceil(total / pageSize) || 1, page },
  };
}

// ── SURVEYS ────────────────────────────────────────────────────────────────

export async function getSurveys({ province, surveyType, search, page = 1, pageSize = 15 } = {}) {
  const snap = await getDocs(query(collection(db, 'surveys'), orderBy('createdAt', 'desc')));
  let list = snap.docs.map(docToObj);
  if (province) list = list.filter(s => s.province === province);
  if (surveyType) list = list.filter(s => s.surveyType === surveyType);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s =>
      s.community?.toLowerCase().includes(q) ||
      s.lmmaName?.toLowerCase().includes(q) ||
      s.province?.toLowerCase().includes(q)
    );
  }
  const { data, pagination } = paginate(list, page, pageSize);
  return { surveys: data, pagination };
}

export async function getSurvey(id) {
  const snap = await getDoc(doc(db, 'surveys', id));
  return snap.exists() ? docToObj(snap) : null;
}

export async function createSurvey(data) {
  return addDoc(collection(db, 'surveys'), {
    ...data,
    submittedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSurvey(id, data) {
  return updateDoc(doc(db, 'surveys', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteSurvey(id) {
  return deleteDoc(doc(db, 'surveys', id));
}

export async function getSurveyStats() {
  const snap = await getDocs(collection(db, 'surveys'));
  const list = snap.docs.map(d => d.data());
  const byProvince = {};
  list.forEach(s => {
    const p = s.province || 'Unknown';
    byProvince[p] = (byProvince[p] || 0) + 1;
  });
  return {
    total: list.length,
    byProvince: Object.entries(byProvince).map(([province, count]) => ({ province, count })),
  };
}

export async function getSurveysForMap() {
  const snap = await getDocs(collection(db, 'surveys'));
  return snap.docs.map(docToObj).filter(s => s.latitude && s.longitude);
}

// ── MARINE AREAS ───────────────────────────────────────────────────────────

export async function getMarineAreas({ province, areaType, managementStatus, search, page = 1, pageSize = 15 } = {}) {
  const snap = await getDocs(query(collection(db, 'marine_areas'), orderBy('createdAt', 'desc')));
  let list = snap.docs.map(docToObj);
  if (province) list = list.filter(a => a.province === province);
  if (areaType) list = list.filter(a => a.areaType === areaType);
  if (managementStatus) list = list.filter(a => a.managementStatus === managementStatus);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(a =>
      a.areaName?.toLowerCase().includes(q) ||
      a.community?.toLowerCase().includes(q)
    );
  }
  const { data, pagination } = paginate(list, page, pageSize);
  return { areas: data, pagination };
}

export async function createMarineArea(data) {
  return addDoc(collection(db, 'marine_areas'), {
    ...data,
    submittedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMarineArea(id, data) {
  return updateDoc(doc(db, 'marine_areas', id), { ...data, updatedAt: serverTimestamp() });
}

export async function getMarineStats() {
  const snap = await getDocs(collection(db, 'marine_areas'));
  const list = snap.docs.map(d => d.data());
  const byType = {};
  let totalAreaHa = 0;
  list.forEach(a => {
    const t = a.areaType || 'other';
    byType[t] = (byType[t] || 0) + 1;
    if (a.areaSizeHa) totalAreaHa += parseFloat(a.areaSizeHa) || 0;
  });
  return {
    total: list.length,
    totalAreaHa,
    byType: Object.entries(byType).map(([areaType, count]) => ({ areaType, count })),
  };
}

export async function getMarineGeoJSON({ province, areaType } = {}) {
  const snap = await getDocs(collection(db, 'marine_areas'));
  let list = snap.docs.map(d => d.data());
  if (province) list = list.filter(a => a.province === province);
  if (areaType) list = list.filter(a => a.areaType === areaType);
  const features = list
    .filter(a => a.geometry)
    .map(a => ({
      type: 'Feature',
      properties: {
        areaName: a.areaName,
        areaType: a.areaType,
        community: a.community,
        areaSizeHa: a.areaSizeHa,
        managementStatus: a.managementStatus,
        isCurrentlyOpen: a.isCurrentlyOpen,
      },
      geometry: a.geometry,
    }));
  return { type: 'FeatureCollection', features };
}

// ── MONITORING ─────────────────────────────────────────────────────────────

export async function getMonitoringRecords({ province, monitoringType, search, page = 1, pageSize = 15 } = {}) {
  const snap = await getDocs(query(collection(db, 'monitoring'), orderBy('createdAt', 'desc')));
  let list = snap.docs.map(docToObj);
  if (province) list = list.filter(r => r.province === province);
  if (monitoringType) list = list.filter(r => r.monitoringType === monitoringType);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(r =>
      r.siteName?.toLowerCase().includes(q) ||
      r.surveyName?.toLowerCase().includes(q)
    );
  }
  const { data, pagination } = paginate(list, page, pageSize);
  return { records: data, pagination };
}

export async function createMonitoring(data) {
  return addDoc(collection(db, 'monitoring'), {
    ...data,
    submittedBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMonitoring(id, data) {
  return updateDoc(doc(db, 'monitoring', id), { ...data, updatedAt: serverTimestamp() });
}

export async function getMonitoringStats() {
  const snap = await getDocs(collection(db, 'monitoring'));
  const list = snap.docs.map(d => d.data());
  const byType = {};
  let coralSum = 0, coralCount = 0;
  list.forEach(r => {
    const t = r.monitoringType || 'other';
    byType[t] = (byType[t] || 0) + 1;
    if (r.liveCoralCoverPct != null) { coralSum += r.liveCoralCoverPct; coralCount++; }
  });
  return {
    total: list.length,
    avgCoralCover: coralCount > 0 ? (coralSum / coralCount).toFixed(1) : null,
    byType: Object.entries(byType).map(([monitoringType, count]) => ({ monitoringType, count })),
  };
}

export async function getMonitoringForMap() {
  const snap = await getDocs(collection(db, 'monitoring'));
  return snap.docs.map(docToObj).filter(r => r.latitude && r.longitude);
}

// ── DATASETS ───────────────────────────────────────────────────────────────

export async function getDatasets({ status, dataType, province, search, page = 1, pageSize = 15 } = {}) {
  const snap = await getDocs(query(collection(db, 'datasets'), orderBy('createdAt', 'desc')));
  let list = snap.docs.map(docToObj);
  if (status) list = list.filter(d => d.status === status);
  if (dataType) list = list.filter(d => d.dataType === dataType);
  if (province) list = list.filter(d => d.province === province);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.community?.toLowerCase().includes(q)
    );
  }
  const { data, pagination } = paginate(list, page, pageSize);
  return { datasets: data, pagination };
}

export async function getDatasetStats() {
  const snap = await getDocs(collection(db, 'datasets'));
  const list = snap.docs.map(d => d.data());
  const byType = {};
  let published = 0;
  list.forEach(d => {
    if (d.status === 'published') published++;
    const t = d.dataType || 'other';
    byType[t] = (byType[t] || 0) + 1;
  });
  return {
    total: list.length,
    published,
    byType: Object.entries(byType).map(([dataType, count]) => ({ dataType, count })),
  };
}

export async function uploadDataset(file, metadata, onProgress) {
  if (!auth.currentUser) throw new Error('Must be signed in to upload datasets.');
  const path = `datasets/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  const ext = file.name.split('.').pop().toLowerCase();
  const fileFormat = ext === 'json' ? 'geojson' : ext;

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          const tags = metadata.tags
            ? metadata.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [];
          await addDoc(collection(db, 'datasets'), {
            ...metadata,
            tags,
            fileName: file.name,
            fileSize: file.size,
            filePath: path,
            downloadURL,
            fileFormat,
            status: 'draft',
            downloadCount: 0,
            uploadedBy: auth.currentUser.uid,
            uploaderName: `${auth.currentUser.displayName || ''}`.trim(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

export async function publishDataset(id) {
  return updateDoc(doc(db, 'datasets', id), {
    status: 'published',
    publishedAt: serverTimestamp(),
    publishedBy: auth.currentUser?.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function unpublishDataset(id) {
  return updateDoc(doc(db, 'datasets', id), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

export async function submitDatasetForReview(id) {
  return updateDoc(doc(db, 'datasets', id), {
    status: 'under_review',
    updatedAt: serverTimestamp(),
  });
}

export async function getPublishedGeoJSONDatasets() {
  const snap = await getDocs(collection(db, 'datasets'));
  return snap.docs
    .map(docToObj)
    .filter(d => d.status === 'published' && ['geojson', 'json'].includes(d.fileFormat?.toLowerCase()));
}

export async function getDatasetGeoJSON(dataset) {
  // 1. Try Storage SDK getBytes (handles auth + CORS via Firebase SDK).
  if (dataset.filePath) {
    try {
      const bytes = await getBytes(ref(storage, dataset.filePath));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (err) {
      console.warn('getBytes failed:', err.code, err.message);
    }

    // 2. Try fresh download URL from the SDK (token is regenerated using current auth).
    try {
      const freshUrl = await getDownloadURL(ref(storage, dataset.filePath));
      const res = await fetch(freshUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      console.warn('Fresh downloadURL fetch failed:', err.message);
    }
  }

  // 3. Last resort: use the stored download URL (token may be stale).
  if (!dataset.downloadURL) throw new Error('storage/no-url');
  const res = await fetch(dataset.downloadURL);
  if (!res.ok) throw new Error(`storage/http-${res.status}`);
  return res.json();
}

// ── USERS (ADMIN) ──────────────────────────────────────────────────────────

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(docToObj);
}

export async function updateUserProfile(uid, data) {
  return updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}
