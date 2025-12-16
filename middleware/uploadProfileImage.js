import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
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
    return cb(new Error('이미지 파일만 업로드할 수 있어요.'));
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
