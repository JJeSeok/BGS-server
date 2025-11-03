import * as restaurantRepository from '../data/restaurant.js';
import * as restaurantPhotoRepository from '../data/restaurant_photo.js';

export async function getRestaurants(req, res) {
  const rows = await restaurantRepository.getAllRestaurants();
  const data = rows.map(toCardDto);
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
    photos,
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

  if (Array.isArray(photos)) {
    const rows = await createPhoto(restaurant.dataValues.id, photos);
    const url = await restaurantPhotoRepository.create(rows);
  }

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

function toCardDto(r) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    mainImageUrl: r.mainImageUrl ?? r.main_image_url,
    rating: {
      avg: Number(r.ratingAvg ?? r.rating_avg ?? 0),
      count: r.reviewCount ?? r.review_count ?? 0,
    },
    address: {
      sido: r.sido,
      sigugun: r.sigugun,
      dongmyun: r.dongmyun,
    },
  };
}

async function createPhoto(id, photos) {
  const maxOrder = await restaurantPhotoRepository.getMaxSortOrder(id);

  return photos.map((p, i) => ({
    restaurant_id: id,
    url: p,
    sort_order: maxOrder + 1 + i,
  }));
}
