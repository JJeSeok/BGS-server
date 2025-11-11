import express from 'express';
import 'express-async-errors';
import * as restaurantController from '../controller/restaurant.js';
import * as reviewController from '../controller/review.js';
import { isAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /restaurants
router.get('/', restaurantController.getRestaurants);

// GET /restaurants/:id
router.get('/:id', restaurantController.getRestaurant);

// POST /restaurants
router.post('/', restaurantController.createRestaurant);

// PUT /restaurants/:id
router.put('/:id', restaurantController.updateRestaurant);

// DELETE /restaurants/:id
router.delete('/:id', restaurantController.deleteRestaurant);

// POST /restaurants/:id/reviews
router.post('/:id/reviews', isAuth, reviewController.createReview);

export default router;
