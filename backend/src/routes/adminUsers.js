const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyFirebaseToken, requireFirebaseAdmin } = require('../middleware/firebaseAuth');
const { getAdmin } = require('../config/firebaseAdmin');

const router = express.Router();

// All routes here require a valid Firebase admin token.
router.use(verifyFirebaseToken, requireFirebaseAdmin);

/**
 * POST /api/admin/users
 * Body: { email, password }
 * Creates (or retrieves existing) Firebase Auth user and sets password.
 * Returns { uid }.
 */
router.post(
  '/users',
  body('email').isEmail().withMessage('Invalid email address.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      const admin = getAdmin();
      let uid;
      try {
        // Try to create a new Auth user.
        const newUser = await admin.auth().createUser({ email, password });
        uid = newUser.uid;
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
          // Auth account already exists — look up the UID and update the password.
          const existing = await admin.auth().getUserByEmail(email);
          uid = existing.uid;
          await admin.auth().updateUser(uid, { password });
        } else {
          throw err;
        }
      }
      res.json({ uid });
    } catch (err) {
      res.status(500).json({ message: err.message || 'Failed to create user.' });
    }
  }
);

/**
 * POST /api/admin/users/:uid/password
 * Body: { password: string }
 * Sets a new password for the given Firebase Auth user.
 */
router.post(
  '/users/:uid/password',
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { uid } = req.params;
    const { password } = req.body;

    try {
      const admin = getAdmin();
      await admin.auth().updateUser(uid, { password });
      res.json({ message: 'Password updated successfully.' });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ message: 'User not found in Firebase Auth.' });
      }
      res.status(500).json({ message: err.message || 'Failed to update password.' });
    }
  }
);

module.exports = router;
