import express from 'express';
import 'express-async-errors';
import * as restaurantController from '../controller/restaurant.js';

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

export default router;
