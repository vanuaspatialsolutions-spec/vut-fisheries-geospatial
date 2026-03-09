const { getAdmin } = require('../config/firebaseAdmin');

/**
 * Verifies a Firebase ID token from the Authorization header.
 * Attaches the decoded token to req.firebaseUser.
 */
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing Firebase ID token.' });
  }

  const idToken = authHeader.split(' ')[1];
  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired Firebase token.' });
  }
};

/**
 * Must be used after verifyFirebaseToken.
 * Checks that the caller's Firestore user doc has role === 'admin'.
 */
const requireFirebaseAdmin = async (req, res, next) => {
  try {
    const admin = getAdmin();
    const userDoc = await admin.firestore().collection('users').doc(req.firebaseUser.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
  } catch {
    return res.status(500).json({ message: 'Failed to verify admin role.' });
  }
};

module.exports = { verifyFirebaseToken, requireFirebaseAdmin };
