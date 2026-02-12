import express from 'express';
import 'express-async-errors';
import * as reviewController from '../controller/review.js';
import { isAuth } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// GET /reviews?restaurantId=:restaurantId
// GET /reviews?userId=:userId
router.get('/', optionalAuth, reviewController.getReviews);

// GET /reviews/meta?restaurantId=:restaurantId
router.get('/meta', optionalAuth, reviewController.getReviewMeta);

// GET /reviews/:id
router.get('/:id', reviewController.getReview);

// POST /reviews
router.post(
  '/',
  isAuth,
  upload.array('images', 30),
  reviewController.createReview,
);

// POST /reviews/:id/reactions
router.post('/:id/reactions', isAuth, reviewController.toggleReviewReaction);

// PUT /reviews/:id
router.put(
  '/:id',
  isAuth,
  upload.array('images', 30),
  reviewController.updateReview,
);

// DELETE /reviews/:id
router.delete('/:id', isAuth, reviewController.deleteReview);

export default router;
