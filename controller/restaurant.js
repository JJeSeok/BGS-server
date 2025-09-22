import * as restaurantRepository from '../data/restaurant.js';

export async function getRestaurants(req, res) {
  const data = await restaurantRepository.getAllRestaurants();
  res.status(200).json(data);
}

export async function getRestaurant(req, res) {
  const restaurantId = req.params.id;
  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);

  if (restaurant) res.status(200).json(restaurant);
  else
    res
      .status(404)
      .json({ message: `Restaurant id(${restaurantId}) not found` });
}

export async function createRestaurant(req, res) {
  const {
    name,
    category,
    branch_info,
    main_image_url,
    sido,
    sigugun,
    dongmyun,
    road_address,
    jibun_address,
    phone,
    description,
  } = req.body;
  const restaurant = await restaurantRepository.create(
    name,
    category,
    branch_info,
    main_image_url,
    sido,
    sigugun,
    dongmyun,
    road_address,
    jibun_address,
    phone,
    description
  );

  res.status(201).json(restaurant);
}

export async function updateRestaurant(req, res) {
  const restaurantId = req.params.id;
  const updateData = req.body;
  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);
  if (!restaurant) {
    return res.sendStatus(404);
  }

  const updated = await restaurantRepository.update(restaurantId, updateData);
  res.status(200).json(updated);
}

export async function deleteRestaurant(req, res) {
  const restaurantId = req.params.id;
  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);
  if (!restaurant) {
    return res.sendStatus(404);
  }

  await restaurantRepository.remove(restaurantId);
  res.sendStatus(204);
}
