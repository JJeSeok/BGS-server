import express from 'express';
import 'express-async-errors';
import * as restaurantController from '../controller/restaurant.js';
import { isAuth } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

// GET /restaurants
router.get('/', restaurantController.getRestaurants);

// GET /restaurants/:id
router.get('/:id', optionalAuth, restaurantController.getRestaurant);

// POST /restaurants
router.post('/', restaurantController.createRestaurant);

// POST /restaurants/:id/likes
router.post('/:id/likes', isAuth, restaurantController.toggleRestaurantLike);

// DELETE /restaurants/:id/likes
router.delete('/:id/likes', isAuth, restaurantController.unlikeRestaurant);

// PUT /restaurants/:id
router.put('/:id', restaurantController.updateRestaurant);

// DELETE /restaurants/:id
router.delete('/:id', restaurantController.deleteRestaurant);

export default router;
