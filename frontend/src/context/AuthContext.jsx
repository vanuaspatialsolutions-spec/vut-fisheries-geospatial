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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...(snap.exists() ? snap.data() : {}) });
        } catch {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
        }
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
      if (snap.exists()) profileData = snap.data();
    } catch {
      // Firestore read failed — user is still authenticated
    }

    // Block accounts that haven't been approved yet (backwards-compat: no status = approved)
    if (profileData.status === 'pending') {
      await signOut(auth);
      throw Object.assign(new Error('Your account is pending admin approval. You will be notified by email when approved.'), { code: 'auth/account-pending' });
    }
    if (profileData.status === 'rejected') {
      await signOut(auth);
      throw Object.assign(new Error('Your account registration was not approved. Please contact the administrator.'), { code: 'auth/account-rejected' });
    }

    // First login after admin approval — flag so the UI can show a welcome toast
    let showApprovalToast = false;
    if (profileData.status === 'approved' && profileData.approvalNotified === false) {
      try {
        await updateDoc(doc(db, 'users', cred.user.uid), { approvalNotified: true });
        profileData.approvalNotified = true;
        showApprovalToast = true;
      } catch { /* non-critical */ }
    }

    const profile = { uid: cred.user.uid, email: cred.user.email, ...profileData, _showApprovalToast: showApprovalToast };
    setUser(profile);
    return profile;
  };

  const register = async ({ firstName, lastName, email, password, organization, province }) => {
    // First registered user becomes admin (auto-approved); everyone else waits for approval.
    // getDocs requires auth in production rules, so we catch PERMISSION_DENIED and treat
    // it as "not the first user" (the real first-user case is only relevant on an empty DB
    // and should be done while Firestore is in test mode or before rules are locked down).
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
      approvalNotified: isFirst, // admin needs no notification
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);

    if (isFirst) {
      setUser({ uid: cred.user.uid, ...profile });
    } else {
      // Sign out immediately — non-admin users must wait for approval
      await signOut(auth);
    }
    return { uid: cred.user.uid, ...profile };
  };

  const logout = () => signOut(auth).then(() => setUser(null));

  const isAdmin = user?.role === 'admin';
  const isStaff = ['admin', 'staff'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
