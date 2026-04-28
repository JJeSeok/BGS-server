import * as restaurantRepository from '../data/restaurant.js';
import * as restaurantPhotoRepository from '../data/restaurantPhoto.js';
import * as restaurantLikeRepository from '../data/restaurantLike.js';
import * as restaurantQueries from '../data/restaurantQueries.js';
import * as menuRepository from '../data/menu.js';
import * as restaurantHourRepository from '../data/restaurantHour.js';
import {
  getRestaurantImageFilePath,
  safeUnlink,
  safeUnlinkMany,
  safeUnlinkManyByUrls,
} from '../utils/file.js';
import { getRestaurantTodayInfo } from '../utils/restaurant.js';
import { sequelize } from '../db/database.js';

const MAX_SUB_IMAGE_COUNT = 5;

function parseCoordinate(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export async function getRestaurants(req, res) {
  const { sort, sido, q, lat, lng } = req.query;
  const cursor = req.query.cursor ?? null;

  try {
    const { rows, hasMore, nextCursor } =
      await restaurantRepository.getAllRestaurants({
        sort,
        sido,
        q,
        cursor,
        lat,
        lng,
        userId: req.userId ?? null,
      });
    const data = rows.map(toCardDto);
    return res.status(200).json({ meta: { hasMore, nextCursor }, data });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '레스토랑 목록 조회 중 오류가 발생했습니다.' });
  }
}

export async function getMapRestaurants(req, res) {
  const lat = parseCoordinate(req.query.lat);
  const lng = parseCoordinate(req.query.lng);

  if (lat === null || lng === null) {
    return res.status(400).json({ message: 'Valid lat and lng are required.' });
  }

  const restaurants = await restaurantRepository.getMapRestaurants({ lat, lng });
  return res.status(200).json(restaurants.map(toMapMarkerDto));
}

export async function getRestaurant(req, res) {
  const restaurantId = req.params.id;
  const userId = req.userId;

  let isLiked = false;
  if (userId) {
    const like = await restaurantLikeRepository.findByRestaurantAndUser(
      userId,
      restaurantId,
    );
    isLiked = !!like;
  }

  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);

  if (restaurant) {
    const data = restaurant.toJSON();

    data.todayBusiness = getRestaurantTodayInfo(data.restaurantHours);

    const photos =
      await restaurantPhotoRepository.getRestaurantPhotos(restaurantId);
    await restaurantRepository.increaseInViewCount(restaurantId);
    res.status(200).json({ restaurant: data, photos, isLiked });
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

export async function getRestaurantForEdit(req, res) {
  const restaurantId = Number(req.params.id);

  if (!Number.isFinite(restaurantId)) {
    return res
      .status(400)
      .json({ message: '레스토랑 id가 올바르지 않습니다.' });
  }

  try {
    const restaurant =
      await restaurantRepository.getRestaurantById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: '레스토랑을 찾을 수 없습니다.' });
    }

    const photos =
      await restaurantPhotoRepository.getRestaurantPhotos(restaurantId);

    const data = restaurant.toJSON();

    return res.status(200).json({ data: toEditDto(data, photos) });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '레스토랑 편집 정보 조회 중 오류가 발생했습니다.' });
  }
}

export async function updateRestaurantForOwner(req, res) {
  const restaurantId = Number(req.params.id);

  if (!Number.isFinite(restaurantId)) {
    return res
      .status(400)
      .json({ message: '레스토랑 id가 올바르지 않습니다.' });
  }

  let parsedMenus = [];
  let parsedBusinessHours = [];
  let parsedDeleteSubImageIds = [];

  try {
    parsedMenus = req.body.menus ? JSON.parse(req.body.menus) : [];
    parsedBusinessHours = req.body.businessHours
      ? JSON.parse(req.body.businessHours)
      : [];
    parsedDeleteSubImageIds = req.body.deleteSubImageIds
      ? JSON.parse(req.body.deleteSubImageIds)
      : [];
  } catch (err) {
    return res
      .status(400)
      .json({ message: 'JSON 필드 형식이 올바르지 않습니다.' });
  }

  const uploadedMainImage = req.files?.mainImage?.[0] ?? null;
  const uploadedSubImages = req.files?.subImages ?? [];

  const newMainImageUrl = uploadedMainImage
    ? `/uploads/restaurants/${uploadedMainImage.filename}`
    : null;
  const newSubImageRows = uploadedSubImages.map((file) => ({
    url: `/uploads/restaurants/${file.filename}`,
  }));

  if (newSubImageRows.length > MAX_SUB_IMAGE_COUNT) {
    return res.status(400).json({
      message: `추가 이미지는 최대 ${MAX_SUB_IMAGE_COUNT}장까지 업로드할 수 있습니다.`,
    });
  }

  const uploadedFileUrlsForRollback = [
    ...(newMainImageUrl ? [newMainImageUrl] : []),
    ...newSubImageRows.map((row) => row.url),
  ];

  let oldMainImageUrlToDelete = null;
  let deletedSubImageUrls = [];

  const parseBoolean = (value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;

    const normalized = String(value).trim().toLowerCase();

    if (normalized === 'true') return true;
    if (normalized === 'false') return false;

    const err = new Error('편의 정보 값이 올바르지 않습니다.');
    err.status = 400;
    throw err;
  };

  try {
    const result = await sequelize.transaction(async (t) => {
      const restaurant = await restaurantRepository.getRestaurantByIdForUpdate(
        restaurantId,
        t,
      );
      if (!restaurant) {
        const err = new Error('NOT_FOUND');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const parsedTakeout = parseBoolean(req.body.takeout);
      const parsedDelivery = parseBoolean(req.body.delivery);
      const parsedReservation = parseBoolean(req.body.reservation);

      const existingSubImageCount =
        await restaurantPhotoRepository.countRestaurantPhotos(restaurantId, t);

      const deletableSubImageCount =
        await restaurantPhotoRepository.countDeletablePhotos(
          restaurantId,
          parsedDeleteSubImageIds,
          t,
        );

      const finalSubImageCount =
        existingSubImageCount - deletableSubImageCount + newSubImageRows.length;

      if (finalSubImageCount > MAX_SUB_IMAGE_COUNT) {
        const err = new Error('IMAGE_COUNT_ERROR');
        err.code = 'IMAGE_COUNT_ERROR';
        throw err;
      }

      const updateValues = {
        name: req.body.name?.trim() || restaurant.name,
        category: req.body.category?.trim() || restaurant.category,
        branch_info: req.body.branch_info?.trim() || null,
        phone: req.body.phone?.trim() || null,
        description: req.body.description?.trim() || null,
        parking_info: req.body.parking_info?.trim() || null,
        takeout:
          parsedTakeout === undefined ? restaurant.takeout : parsedTakeout,
        delivery:
          parsedDelivery === undefined ? restaurant.delivery : parsedDelivery,
        reservation:
          parsedReservation === undefined
            ? restaurant.reservation
            : parsedReservation,
        sido: req.body.sido?.trim() || restaurant.sido,
        sigugun: req.body.sigugun?.trim() || restaurant.sigugun,
        dongmyun: req.body.dongmyun?.trim() || restaurant.dongmyun,
        road_address: req.body.road_address?.trim() || null,
        jibun_address: req.body.jibun_address?.trim() || null,
        lat: req.body.lat ? Number(req.body.lat) : null,
        lng: req.body.lng ? Number(req.body.lng) : null,
        info_updated_at: new Date(),
      };

      if (newMainImageUrl) {
        if (
          restaurant.main_image_url &&
          restaurant.main_image_url.startsWith('/uploads/restaurants/')
        ) {
          oldMainImageUrlToDelete = restaurant.main_image_url;
        }

        updateValues.main_image_url = newMainImageUrl;
      }

      await restaurant.update(updateValues, { transaction: t });

      if (
        Array.isArray(parsedDeleteSubImageIds) &&
        parsedDeleteSubImageIds.length > 0
      ) {
        const targetPhotos =
          await restaurantPhotoRepository.getRestaurantPhotoByIds(
            parsedDeleteSubImageIds,
            restaurantId,
            t,
          );

        deletedSubImageUrls = targetPhotos.map((photo) => photo.url);

        await restaurantPhotoRepository.deleteRestaurantPhotosByIds(
          parsedDeleteSubImageIds,
          restaurantId,
          t,
        );
      }

      if (newSubImageRows.length > 0) {
        const currentMaxSortOrder =
          await restaurantPhotoRepository.getMaxSortOrder(restaurantId, t);

        const rowsToCreate = newSubImageRows.map((row, index) => ({
          restaurant_id: restaurantId,
          url: row.url,
          sort_order: currentMaxSortOrder + index + 1,
        }));

        await restaurantPhotoRepository.create(rowsToCreate, t);
      }

      await menuRepository.syncRestaurantMenus(restaurantId, parsedMenus, t);
      await restaurantHourRepository.updateRestaurantHours(
        restaurantId,
        parsedBusinessHours,
        t,
      );

      return { id: restaurantId };
    });

    if (oldMainImageUrlToDelete) {
      await safeUnlink(getRestaurantImageFilePath(oldMainImageUrlToDelete));
    }

    if (deletedSubImageUrls.length > 0) {
      const deletePaths = deletedSubImageUrls
        .map((url) => getRestaurantImageFilePath(url))
        .filter(Boolean);

      await safeUnlinkMany(deletePaths);
    }

    return res
      .status(200)
      .json({ message: '레스토랑 정보가 수정되었습니다.', data: result });
  } catch (err) {
    const rollbackPaths = uploadedFileUrlsForRollback
      .map((url) => getRestaurantImageFilePath(url))
      .filter(Boolean);

    await safeUnlinkMany(rollbackPaths);

    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ message: '레스토랑을 찾을 수 없습니다.' });
    }

    if (err.code === 'IMAGE_COUNT_ERROR') {
      return res.status(400).json({
        message: `추가 이미지는 최대 ${MAX_SUB_IMAGE_COUNT}장까지 업로드할 수 있습니다.`,
      });
    }

    console.error(err);
    return res
      .status(500)
      .json({ message: '레스토랑 수정 중 오류가 발생했습니다.' });
  }
}

function toCardDto(r) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    mainImageUrl: r.main_image_url,
    rating: {
      avg: Number(r.rating_avg),
      count: r.review_count,
    },
    address: {
      sido: r.sido,
      sigugun: r.sigugun,
      dongmyun: r.dongmyun,
    },
  };
}

function toMapMarkerDto(r) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    rating_avg: Number(r.rating_avg),
    review_count: r.review_count,
    address: r.address,
    lat: Number(r.lat),
    lng: Number(r.lng),
    distance: Number(r.distance),
  };
}

function toEditDto(restaurant, photos) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    category: restaurant.category,
    branch_info: restaurant.branch_info,
    phone: restaurant.phone,
    description: restaurant.description,

    parking_info: restaurant.parking_info,
    takeout: restaurant.takeout,
    delivery: restaurant.delivery,
    reservation: restaurant.reservation,

    sido: restaurant.sido,
    sigugun: restaurant.sigugun,
    dongmyun: restaurant.dongmyun,
    road_address: restaurant.road_address,
    jibun_address: restaurant.jibun_address,
    lat: restaurant.lat,
    lng: restaurant.lng,

    mainImageUrl: restaurant.main_image_url,

    subImages: Array.isArray(photos)
      ? photos.map((photo) => ({
          id: photo.id,
          imageUrl: photo.url,
          sortOrder: photo.sort_order,
        }))
      : [],

    businessHours: Array.isArray(restaurant.restaurantHours)
      ? restaurant.restaurantHours.map((hour) => ({
          dayOfWeek: hour.day_of_week,
          isClosed: Boolean(hour.is_closed),
          openTime: hour.open_time,
          closeTime: hour.close_time,
          breakStart: hour.break_start_time,
          breakEnd: hour.break_end_time,
          lastOrder: hour.last_order_time,
          is24Hours: Boolean(hour.is_24_hours),
        }))
      : [],

    menus: Array.isArray(restaurant.menus)
      ? restaurant.menus.map((menu) => ({
          id: menu.id,
          name: menu.name,
          price: menu.price,
          sortOrder: menu.sort_order,
        }))
      : [],
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
    const result = await restaurantQueries.toggleLike({ userId, restaurantId });
    return res.json(result);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    const message =
      status === 404
        ? err.message
        : '레스토랑 반응 저장 중 오류가 발생했습니다.';
    return res.status(status).json({ message });
  }
}

export async function unlikeRestaurant(req, res) {
  const restaurantId = req.params.id;
  const userId = req.userId;

  try {
    const restaurant =
      await restaurantRepository.getRestaurantById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: '식당을 찾을 수 없습니다.' });
    }

    const existing = await restaurantLikeRepository.findByRestaurantAndUser(
      userId,
      restaurantId,
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
