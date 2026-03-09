const admin = require('firebase-admin');

let initialized = false;

function getAdmin() {
  if (!initialized) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    });
    initialized = true;
  }
  return admin;
}

module.exports = { getAdmin };
