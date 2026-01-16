import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads/requests'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, base + '-' + unique + ext);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype?.startsWith('image/')) {
    return cb(new Error('ONLY_IMAGE'));
  }
  cb(null, true);
}

export const uploadRestaurantRequestImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single('mainImage');
