const multer = require('multer');
const path = require('path');
const fs = require('fs');

const makeStorage = (folder) => {
  const dir = path.join(__dirname, '..', 'uploads', folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, unique + path.extname(file.originalname));
    },
  });
};

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed (jpeg, jpg, png, webp, gif)'));
};

const uploadSingapore = multer({
  storage: makeStorage('singapore'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadDear = multer({
  storage: makeStorage('dear'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── External: dynamic folder based on lotteryType field in the form body ──────
// multer processes text fields before files, so req.body.lotteryType is
// available inside the destination callback.
const externalStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = req.body.lotteryType === 'dear' ? 'dear' : 'singapore';
    const dir = path.join(__dirname, '..', 'uploads', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const uploadExternal = multer({
  storage: externalStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB for external
});

module.exports = { uploadSingapore, uploadDear, uploadExternal };

