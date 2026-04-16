import express from 'express';
import 'express-async-errors';
import * as restaurantController from '../controller/restaurant.js';
import { isAuth } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { isRestaurantOwnerOrAdmin } from '../middleware/restaurantOwner.js';
import { uploadRestaurantImages } from '../middleware/uploadRestaurantImages.js';

const router = express.Router();

// GET /restaurants
router.get('/', optionalAuth, restaurantController.getRestaurants);

// GET /restaurants/owner/:id/edit
router.get(
  '/owner/:id/edit',
  isAuth,
  isRestaurantOwnerOrAdmin,
  restaurantController.getRestaurantForEdit,
);

// PATCH /restaurants/owner/:id
router.patch(
  '/owner/:id',
  isAuth,
  isRestaurantOwnerOrAdmin,
  uploadRestaurantImages,
  restaurantController.updateRestaurantForOwner,
);

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
