import express from 'express';
import 'express-async-errors';
import * as adminRequestController from '../controller/adminRestaurantRequest.js';
import { isAuth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();

// GET /admin/restaurant-requests
router.get(
  '/restaurant-requests',
  isAuth,
  isAdmin,
  adminRequestController.getAdminRestaurantRequests
);

// POST /admin/restaurant-requests/:id/approve
router.post(
  '/restaurant-requests/:id/approve',
  isAuth,
  isAdmin,
  adminRequestController.approveRestaurantRequest
);

// POST /admin/restaurant-requests/:id/reject
router.post(
  '/restaurant-requests/:id/reject',
  isAuth,
  isAdmin,
  adminRequestController.rejectRestaurantRequest
);

export default router;
