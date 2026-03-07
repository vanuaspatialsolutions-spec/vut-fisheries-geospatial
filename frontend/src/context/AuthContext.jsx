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
  doc, getDoc, setDoc, collection, getDocs, serverTimestamp,
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
      if (snap.exists()) {
        profileData = snap.data();
        // Surface approval toast if admin just approved this account
        if (profileData.status === 'approved' && !profileData.approvalNotified) {
          profileData._showApprovalToast = true;
          await setDoc(doc(db, 'users', cred.user.uid), { approvalNotified: true }, { merge: true });
        }
      }
    } catch {
      // Firestore read failed — user is still authenticated
    }
    const profile = { uid: cred.user.uid, email: cred.user.email, ...profileData };
    setUser(profile);
    return profile;
  };

  const register = async ({ firstName, lastName, email, password, organization, province }) => {
    // First registered user becomes admin
    const usersSnap = await getDocs(collection(db, 'users'));
    const role = usersSnap.empty ? 'admin' : 'community_officer';

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });

    const profile = {
      firstName,
      lastName,
      email,
      role,
      organization: organization || '',
      province: province || '',
      isActive: true,
      status: 'approved',
      approvalNotified: true,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    setUser({ uid: cred.user.uid, ...profile });
    return { uid: cred.user.uid, ...profile };
  };

  const saveProfile = async (profileData) => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, 'users', uid), { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
    setUser(prev => ({ ...prev, ...profileData }));
  };

  const logout = () => signOut(auth).then(() => setUser(null));

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
