import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_REVIEWS_DIR = path.join(__dirname, '..', 'uploads', 'reviews');
const UPLOADS_PROFILES_DIR = path.join(__dirname, '..', 'uploads', 'profiles');
const UPLOADS_REQUESTS_DIR = path.join(__dirname, '..', 'uploads', 'requests');
const UPLOADS_RESTAURANTS_DIR = path.join(
  __dirname,
  '..',
  'uploads',
  'restaurants',
);

export function getReviewImageFilePath(url) {
  const prefix = '/uploads/reviews/';
  if (!url.startsWith(prefix)) return null;

  const filename = url.slice(prefix.length);
  return path.join(UPLOADS_REVIEWS_DIR, filename);
}

export function getProfileImageFilePath(url) {
  const prefix = '/uploads/profiles/';
  if (!url.startsWith(prefix)) return null;

  const filename = url.slice(prefix.length);
  return path.join(UPLOADS_PROFILES_DIR, filename);
}

export function getRestaurantRequestImageFilePath(url) {
  const prefix = '/uploads/requests/';
  if (!url.startsWith(prefix)) return null;

  const filename = url.slice(prefix.length);
  return path.join(UPLOADS_REQUESTS_DIR, filename);
}

export function getRestaurantImageFilePath(url) {
  const prefix = '/uploads/restaurants/';
  if (!url.startsWith(prefix)) return null;

  const filename = url.slice(prefix.length);
  return path.join(UPLOADS_RESTAURANTS_DIR, filename);
}

export function buildRestaurantImageUrl(filename) {
  return `/uploads/restaurants/${filename}`;
}

export async function ensureRestaurantUploadsDir() {
  await fs.mkdir(UPLOADS_RESTAURANTS_DIR, { recursive: true });
}

export async function copyRequestImageToRestaurant(requestImageUrl) {
  const sourcePath = getRestaurantRequestImageFilePath(requestImageUrl);
  if (!sourcePath) return null;

  await ensureRestaurantUploadsDir();

  const filename = path.basename(sourcePath);
  const destPath = path.join(UPLOADS_RESTAURANTS_DIR, filename);

  await fs.copyFile(sourcePath, destPath);

  return {
    newImageUrl: buildRestaurantImageUrl(filename),
    sourcePath,
    destPath,
  };
}

export async function safeUnlink(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('이미지 파일 삭제 실패:', filePath, err);
    }
  }
}

export async function safeUnlinkMany(filePaths = []) {
  await Promise.allSettled(filePaths.filter(Boolean).map((p) => safeUnlink(p)));
}

export async function safeUnlinkManyByUrls(urls = []) {
  const paths = urls.map(getReviewImageFilePath).filter(Boolean);
  await safeUnlinkMany(paths);
}
