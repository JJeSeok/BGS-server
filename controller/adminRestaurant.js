import * as restaurantRepository from '../data/restaurant.js';
import * as restaurantPhotoRepository from '../data/restaurantPhoto.js';
import * as restaurantQueries from '../data/restaurantQueries.js';
import {
  getRestaurantImageFilePath,
  safeUnlinkMany,
  safeUnlinkManyByUrls,
} from '../utils/file.js';

export async function getAdminRestaurants(req, res) {
  const q = req.query.q ?? null;
  const status = req.query.status ?? null;
  const sido = req.query.sido ?? null;
  const cursor = req.query.cursor ?? null;

  try {
    const { rows, hasMore, nextCursor } =
      await restaurantRepository.findAdminRestaurants({
        q,
        status,
        sido,
        cursor,
      });

    return res.status(200).json({
      meta: { hasMore, nextCursor },
      data: rows.map(toAdminRestaurantDTO),
    });
  } catch (err) {
    if (err.code === 'INVALID_CURSOR') {
      return res.status(400).json({ message: 'Invalid cursor.' });
    }
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    if (err.code === 'INVALID_QUERY') {
      return res
        .status(400)
        .json({ message: 'Search query must be 100 characters or fewer.' });
    }

    console.error(err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch admin restaurants.' });
  }
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
    await restaurantPhotoRepository.create(rows);
  }

  return res.status(201).json(restaurant);
}

export async function updateRestaurant(req, res) {
  const restaurantId = req.params.id;
  const updateData = req.body;
  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);

  if (!restaurant) {
    return res.sendStatus(404);
  }

  const updated = await restaurantRepository.update(restaurantId, updateData);
  return res.status(200).json(updated);
}

export async function updateRestaurantStatus(req, res) {
  const restaurantId = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return res.status(400).json({ message: '레스토랑 id가 올바르지 않습니다.' });
  }

  if (!['active', 'closed'].includes(status)) {
    return res.status(400).json({ message: '상태값이 올바르지 않습니다.' });
  }

  const restaurant = await restaurantRepository.updateStatus(
    restaurantId,
    status,
  );

  if (!restaurant) {
    return res.status(404).json({ message: '식당이 존재하지 않습니다.' });
  }

  return res.status(200).json({
    id: restaurant.id,
    status: restaurant.status,
    closedAt: restaurant.closed_at,
  });
}

export async function deleteRestaurant(req, res) {
  const restaurantId = req.params.id;

  try {
    const { deleted, deletedReviewImageUrls, deletedRestaurantImageUrls } =
      await restaurantQueries.deleteRestaurant(restaurantId);

    if (!deleted) {
      return res.status(404).json({ message: '식당이 존재하지 않습니다.' });
    }

    await safeUnlinkManyByUrls(deletedReviewImageUrls);

    const restaurantImagePaths = deletedRestaurantImageUrls
      .map((url) => getRestaurantImageFilePath(url))
      .filter(Boolean);
    await safeUnlinkMany(restaurantImagePaths);

    return res.sendStatus(204);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '식당 삭제 중 오류가 발생했습니다.' });
  }
}

async function createPhoto(restaurantId, photos) {
  const maxOrder =
    await restaurantPhotoRepository.getMaxSortOrder(restaurantId);

  return photos.map((url, index) => ({
    restaurant_id: restaurantId,
    url,
    sort_order: maxOrder + 1 + index,
  }));
}

function toAdminRestaurantDTO(row) {
  return {
    id: row.id,
    name: row.name,
    branchInfo: row.branchInfo,
    category: row.category,
    mainImageUrl: row.mainImageUrl,
    address: {
      road: row.roadAddress,
      jibun: row.jibunAddress,
      sido: row.sido,
      sigugun: row.sigugun,
      dongmyun: row.dongmyun,
    },
    status: row.status,
    reviewCount: Number(row.reviewCount ?? 0),
    likeCount: Number(row.likeCount ?? 0),
    createdAt: row.createdAt,
    closedAt: row.closedAt,
    owner: row.ownerId
      ? {
          id: row.ownerId,
          username: row.ownerUsername,
          name: row.ownerName,
        }
      : null,
  };
}
