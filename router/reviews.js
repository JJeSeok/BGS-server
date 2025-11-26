import express from 'express';
import 'express-async-errors';
import * as reviewController from '../controller/review.js';
import { isAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// POST /reviews
router.post(
  '/',
  isAuth,
  upload.array('images', 30),
  reviewController.createReview
);

export default router;
