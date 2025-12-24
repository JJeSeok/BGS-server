import * as restaurantRepository from '../data/restaurant.js';
import * as restaurantPhotoRepository from '../data/restaurantPhoto.js';
import * as restaurantLikeRepository from '../data/restaurantLike.js';
import * as restaurantQueries from '../data/restaurantQueries.js';
import { safeUnlinkManyByUrls } from '../utils/file.js';

export async function getRestaurants(req, res) {
  const rows = await restaurantRepository.getAllRestaurants();
  const data = rows.map(toCardDto);
  res.status(200).json(data);
}

export async function getRestaurant(req, res) {
  const restaurantId = req.params.id;
  const userId = req.userId;

  let isLiked = false;
  if (userId) {
    const like = await restaurantLikeRepository.findByRestaurantAndUser(
      userId,
      restaurantId
    );
    isLiked = !!like;
  }

  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);

  if (restaurant) {
    const photos = await restaurantPhotoRepository.getRestaurantPhotos(
      restaurantId
    );
    await restaurantRepository.increaseInViewCount(restaurantId);
    res.status(200).json({ restaurant, photos, isLiked });
  } else
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
  const restaurant = await restaurantRepository.create({
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
  });

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

  try {
    const { deleted, deletedImageUrls } =
      await restaurantQueries.deleteRestaurant(restaurantId);

    if (!deleted) {
      return res.status(404).json({ message: '식당이 존재하지 않습니다.' });
    }

    await safeUnlinkManyByUrls(deletedImageUrls);

    return res.sendStatus(204);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '식당 삭제 중 오류가 발생했습니다.' });
  }
}

function toCardDto(r) {
  const rawAvg = Number(r.ratingAvg ?? r.rating_avg ?? 0);
  const avg = Number.isNaN(rawAvg) ? 0 : Math.round(rawAvg * 10) / 20;

  return {
    id: r.id,
    name: r.name,
    category: r.category,
    mainImageUrl: r.mainImageUrl ?? r.main_image_url,
    rating: {
      avg,
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

export async function toggleRestaurantLike(req, res) {
  const restaurantId = req.params.id;
  const userId = req.userId;

  try {
    const restaurant = await restaurantRepository.getRestaurantById(
      restaurantId
    );
    if (!restaurant) {
      return res.status(404).json({ message: '식당을 찾을 수 없습니다.' });
    }

    const existing = await restaurantLikeRepository.findByRestaurantAndUser(
      userId,
      restaurantId
    );

    let isLiked;
    if (existing) {
      await restaurantLikeRepository.remove(userId, restaurantId);
      await restaurantRepository.decreaseInLikeCount(restaurantId);
      isLiked = false;
    } else {
      await restaurantLikeRepository.create(userId, restaurantId);
      await restaurantRepository.increaseInLikeCount(restaurantId);
      isLiked = true;
    }

    const updated = await restaurantRepository.getRestaurantById(restaurantId);
    return res.json({ likeCount: updated.like_count, isLiked });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '레스토랑 반응 저장 중 오류가 발생했습니다.' });
  }
}

export async function unlikeRestaurant(req, res) {
  const restaurantId = req.params.id;
  const userId = req.userId;

  try {
    const restaurant = await restaurantRepository.getRestaurantById(
      restaurantId
    );
    if (!restaurant) {
      return res.status(404).json({ message: '식당을 찾을 수 없습니다.' });
    }

    const existing = await restaurantLikeRepository.findByRestaurantAndUser(
      userId,
      restaurantId
    );
    if (existing) {
      await restaurantLikeRepository.remove(userId, restaurantId);
      await restaurantRepository.decreaseInLikeCount(restaurantId);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '찜 해제 중 오류가 발생했습니다.' });
  }
}
