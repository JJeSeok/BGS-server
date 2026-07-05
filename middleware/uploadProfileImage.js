import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';

const uploadDir = path.join(path.resolve(config.upload.dir), 'profiles');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.jpg';
    const filename = `u${req.userId}_${Date.now()}${safeExt}`;
    cb(null, filename);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype?.startsWith('image/')) {
    return cb(new Error('ONLY_IMAGE'));
  }
  cb(null, true);
}

export const uploadProfileImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
