import express from 'express';
import 'express-async-errors';
import * as adminRestaurantRequestController from '../controller/adminRestaurantRequest.js';
import * as adminReviewController from '../controller/adminReview.js';
import { isAuth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();

// GET /admin/reviews
router.get('/reviews', isAuth, isAdmin, adminReviewController.getAdminReviews);

// GET /admin/restaurant-requests
router.get(
  '/restaurant-requests',
  isAuth,
  isAdmin,
  adminRestaurantRequestController.getAdminRestaurantRequests
);

// POST /admin/restaurant-requests/:id/approve
router.post(
  '/restaurant-requests/:id/approve',
  isAuth,
  isAdmin,
  adminRestaurantRequestController.approveRestaurantRequest
);

// POST /admin/restaurant-requests/:id/reject
router.post(
  '/restaurant-requests/:id/reject',
  isAuth,
  isAdmin,
  adminRestaurantRequestController.rejectRestaurantRequest
);

export default router;
