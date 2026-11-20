const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getStorage, getDownloadURL } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

let isConfigured = false;
let bucket = null;

/**
 * Initialize Firebase Admin SDK.
 * Supports:
 *   1. Service Account JSON file (config/serviceAccountKey.json or custom path)
 *   2. Environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 *
 * If credentials are missing or placeholders, it falls back to local storage
 * without throwing or crashing the server.
 */
function initFirebase() {
  try {
    const apps = getApps();
    if (apps.length > 0) {
      isConfigured = true;
      bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
      return;
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    const isBucketPlaceholder = !bucketName || bucketName.includes('your-project-id');

    // ── Option A: Load from Service Account JSON file ─────────────────────────
    const defaultJsonPath = path.join(__dirname, 'serviceAccountKey.json');
    const customJsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : defaultJsonPath;

    let serviceAccount = null;

    if (fs.existsSync(customJsonPath)) {
      try {
        const raw = fs.readFileSync(customJsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.project_id && !parsed.project_id.includes('your-project-id')) {
          serviceAccount = parsed;
        }
      } catch (err) {
        console.warn('⚠️ [Firebase] Could not parse serviceAccountKey.json:', err.message);
      }
    }

    // ── Option B: Load from individual environment variables ─────────────────
    if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
      const projId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (
        !projId.includes('your-project-id') &&
        !clientEmail.includes('your-service-account') &&
        privateKey &&
        !privateKey.includes('YOUR_PRIVATE_KEY_HERE')
      ) {
        // Fix escaped line breaks in private key
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }
        serviceAccount = {
          projectId: projId,
          clientEmail,
          privateKey,
        };
      }
    }

    // If valid credentials and bucket found, initialize
    if (serviceAccount && !isBucketPlaceholder) {
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: bucketName,
      });

      bucket = getStorage().bucket(bucketName);
      isConfigured = true;
      console.log(`🔥 [Firebase] Initialized with bucket: ${bucketName}`);
    } else {
      console.log('ℹ️  [Firebase] Credentials not configured yet. Uploads will be saved locally in /uploads until credentials are set in .env or config/serviceAccountKey.json.');
    }
  } catch (err) {
    console.warn('⚠️ [Firebase] Initialization failed:', err.message);
    isConfigured = false;
  }
}

// Auto-run init
initFirebase();

/**
 * Returns whether Firebase Storage is ready.
 */
function isFirebaseConfigured() {
  return isConfigured && bucket !== null;
}

/**
 * Upload an image file to Firebase Storage.
 * If Firebase is not configured, returns the local filename.
 *
 * @param {Express.Multer.File} file - Multer file object (from req.file)
 * @param {string} folder - 'singapore' or 'dear'
 * @returns {Promise<string>} Download URL if uploaded to Firebase, or local filename if fallback
 */
async function uploadToFirebase(file, folder = 'general') {
  if (!file) return null;

  // Fallback to local file if Firebase is not yet configured
  if (!isFirebaseConfigured()) {
    return file.filename;
  }

  try {
    const uniqueToken = crypto.randomUUID();
    const destination = `${folder}/${file.filename}`;
    const fileRef = bucket.file(destination);

    // Upload to Firebase Storage with public download token metadata
    await bucket.upload(file.path, {
      destination,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: uniqueToken,
        },
      },
    });

    // Try getDownloadURL() first, fallback to standard token URL
    let downloadUrl;
    try {
      downloadUrl = await getDownloadURL(fileRef);
    } catch (_err) {
      const bucketName = bucket.name;
      const encodedDest = encodeURIComponent(destination);
      downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedDest}?alt=media&token=${uniqueToken}`;
    }

    // Clean up local temp file after successful upload to Firebase
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (_e) {
      // Ignore cleanup error
    }

    console.log(`✅ [Firebase] Image uploaded to ${destination}`);
    return downloadUrl;
  } catch (err) {
    console.error('❌ [Firebase] Upload failed, falling back to local file:', err.message);
    // If Firebase upload fails, return local filename as safe fallback
    return file.filename;
  }
}

/**
 * Delete a file from Firebase Storage (or local storage if local filename).
 *
 * @param {string} urlOrFilename
 * @param {string} folder - 'singapore' or 'dear' (used only for local file deletion)
 */
async function deleteFromFirebase(urlOrFilename, folder = '') {
  if (!urlOrFilename) return;

  try {
    // If it's a Firebase Storage URL
    if (urlOrFilename.includes('firebasestorage.googleapis.com') || urlOrFilename.includes('storage.googleapis.com')) {
      if (!isFirebaseConfigured()) return;

      // Extract path between /o/ and ?
      const match = urlOrFilename.match(/\/o\/([^?]+)/);
      if (match && match[1]) {
        const decodedPath = decodeURIComponent(match[1]);
        const fileRef = bucket.file(decodedPath);
        await fileRef.delete().catch(() => {});
        console.log(`🗑️  [Firebase] Deleted ${decodedPath}`);
      }
      return;
    }

    // Otherwise, clean up local file if it exists
    if (folder) {
      const localPath = path.join(__dirname, '..', 'uploads', folder, path.basename(urlOrFilename));
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
  } catch (err) {
    console.warn('⚠️ [Firebase] Error during file deletion:', err.message);
  }
}

module.exports = {
  isFirebaseConfigured,
  uploadToFirebase,
  deleteFromFirebase,
};
