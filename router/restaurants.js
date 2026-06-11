import express from 'express';
import 'express-async-errors';
import * as restaurantController from '../controller/restaurant.js';
import { isAuth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { isRestaurantOwnerOrAdmin } from '../middleware/restaurantOwner.js';
import { uploadRestaurantImages } from '../middleware/uploadRestaurantImages.js';

const router = express.Router();

// GET /restaurants
router.get('/', optionalAuth, restaurantController.getRestaurants);

// GET /restaurants/map
router.get('/map', restaurantController.getMapRestaurants);

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
router.post('/', isAuth, isAdmin, restaurantController.createRestaurant);

// POST /restaurants/:id/likes
router.post('/:id/likes', isAuth, restaurantController.toggleRestaurantLike);

// DELETE /restaurants/:id/likes
router.delete('/:id/likes', isAuth, restaurantController.unlikeRestaurant);

// PUT /restaurants/:id
router.put('/:id', isAuth, isAdmin, restaurantController.updateRestaurant);

// DELETE /restaurants/:id
router.delete('/:id', isAuth, isAdmin, restaurantController.deleteRestaurant);

export default router;
