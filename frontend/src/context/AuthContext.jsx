import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp,
} from 'firebase/firestore';

const AuthContext = createContext(null);

// ── localStorage helpers ────────────────────────────────────────────────────
// Cache the user profile locally so role/name survive Firestore read failures
// (e.g. rules not deployed yet, network issue, cold-start latency).

function cacheProfile(uid, data) {
  try {
    const safe = { ...data };
    // serverTimestamp() objects aren't serialisable — drop them from cache
    delete safe.createdAt;
    delete safe.updatedAt;
    delete safe.approvedAt;
    delete safe.rejectedAt;
    localStorage.setItem(`cbfm_profile_${uid}`, JSON.stringify(safe));
  } catch { /* storage full or private-browsing — ignore */ }
}

function getCachedProfile(uid) {
  try {
    const s = localStorage.getItem(`cbfm_profile_${uid}`);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function clearCachedProfile(uid) {
  try { localStorage.removeItem(`cbfm_profile_${uid}`); } catch { /* ignore */ }
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profileData = null;

        // 1. Try Firestore first
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            profileData = snap.data();
            // Refresh the local cache with the latest Firestore data
            cacheProfile(firebaseUser.uid, profileData);
          }
        } catch {
          // Firestore read failed (rules not deployed, offline, etc.)
        }

        // 2. Fall back to localStorage cache if Firestore gave us nothing
        if (!profileData) {
          profileData = getCachedProfile(firebaseUser.uid);
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...(profileData || {}),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    let profileData = {};

    try {
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists()) {
        profileData = snap.data();
        // Always refresh the cache on a successful login
        cacheProfile(cred.user.uid, profileData);
      } else {
        // Document doesn't exist in Firestore — try the local cache
        const cached = getCachedProfile(cred.user.uid);
        if (cached) profileData = cached;
      }
    } catch {
      // Firestore unavailable — try cache
      const cached = getCachedProfile(cred.user.uid);
      if (cached) profileData = cached;
    }

    // Block accounts that haven't been approved (backwards-compat: no status = approved)
    if (profileData.status === 'pending') {
      await signOut(auth);
      throw Object.assign(
        new Error('Your account is pending admin approval. You will be notified when approved.'),
        { code: 'auth/account-pending' }
      );
    }
    if (profileData.status === 'rejected') {
      await signOut(auth);
      throw Object.assign(
        new Error('Your account registration was not approved. Please contact the administrator.'),
        { code: 'auth/account-rejected' }
      );
    }

    // First login after admin approval — flag so the UI can show a welcome toast
    let showApprovalToast = false;
    if (profileData.status === 'approved' && profileData.approvalNotified === false) {
      try {
        await updateDoc(doc(db, 'users', cred.user.uid), { approvalNotified: true });
        profileData.approvalNotified = true;
        showApprovalToast = true;
        cacheProfile(cred.user.uid, profileData);
      } catch { /* non-critical */ }
    }

    const profile = {
      uid: cred.user.uid,
      email: cred.user.email,
      ...profileData,
      _showApprovalToast: showApprovalToast,
    };
    setUser(profile);
    return profile;
  };

  const register = async ({ firstName, lastName, email, password, organization, province }) => {
    // First registered user becomes admin (auto-approved); everyone else waits for approval.
    // getDocs requires auth in production rules — catch PERMISSION_DENIED and treat as
    // "not the first user" (first-user registration should happen while DB is in test mode).
    let isFirst = false;
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      isFirst = usersSnap.empty;
    } catch {
      isFirst = false; // rules blocked unauthenticated read — assume not first user
    }
    const role = isFirst ? 'admin' : 'community_officer';

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });

    const profile = {
      firstName,
      lastName,
      email,
      role,
      organization: organization || '',
      province: province || '',
      isActive: isFirst,
      status: isFirst ? 'approved' : 'pending',
      approvalNotified: isFirst,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);

    // Cache without serverTimestamp fields
    cacheProfile(cred.user.uid, { firstName, lastName, email, role,
      organization: organization || '', province: province || '',
      isActive: isFirst, status: isFirst ? 'approved' : 'pending',
      approvalNotified: isFirst });

    if (isFirst) {
      setUser({ uid: cred.user.uid, ...profile });
    } else {
      await signOut(auth);
    }
    return { uid: cred.user.uid, ...profile };
  };

  // Allows an authenticated user to write/repair their own Firestore profile document.
  // Used by the "Complete Profile" prompt when the document is missing.
  const saveProfile = async (data) => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    const uid = auth.currentUser.uid;
    try {
      await setDoc(doc(db, 'users', uid), {
        ...data,
        email: auth.currentUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch {
      // Firestore write failed — still update localStorage and in-memory user
    }
    const updated = { uid, email: auth.currentUser.email, ...data };
    cacheProfile(uid, data);
    setUser(prev => ({ ...prev, ...updated }));
    return updated;
  };

  const logout = () => {
    if (auth.currentUser) clearCachedProfile(auth.currentUser.uid);
    return signOut(auth).then(() => setUser(null));
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = ['admin', 'staff'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, saveProfile, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
