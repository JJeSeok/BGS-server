import express from 'express';
import 'express-async-errors';
import * as requestController from '../controller/restaurantRequest.js';
import { isAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /restaurant-requests
router.post('/', isAuth, requestController.createRestaurantRequest);

// GET /restaurant-requests/me
router.get('/me', isAuth, requestController.getMyRestaurantRequests);

export default router;
