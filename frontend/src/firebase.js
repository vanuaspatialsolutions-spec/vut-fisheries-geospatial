import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCvILd2UmzLllcVOtX0hIDulP5AsYloQu8",
  authDomain: "cbfm-fisheries.firebaseapp.com",
  projectId: "cbfm-fisheries",
  storageBucket: "cbfm-fisheries.firebasestorage.app",
  messagingSenderId: "525262262728",
  appId: "1:525262262728:web:f53264fa3376133304b0fd",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Secondary app used exclusively for admin-creates-user flow.
// Using a separate app instance prevents Firebase from signing out the
// currently logged-in admin when createUserWithEmailAndPassword is called.
const secondaryApp = initializeApp(firebaseConfig, 'secondary');
export const secondaryAuth = getAuth(secondaryApp);

export default app;
