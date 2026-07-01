import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../db/database.js';
import { Review } from './review.js';
import { ReviewImage } from './reviewImage.js';
import { User } from './user.js';
import { calcAgeBandFromBirth, mapGenderToCohort } from '../utils/cohort.js';
import * as restaurantStats from './restaurantStats.js';
import * as cohortRepository from '../data/restaurantCohortStat.js';

const LIMIT = 5;
const ADMIN_LIMIT = 50;
const ADMIN_IMAGE_LIMIT = 3;
const ALLOWED = new Set(['good', 'ok', 'bad']);

function applyKeysetCursorWhere(where, cursor) {
  if (!cursor) return;

  where[Op.or] = [
    { createdAt: { [Op.lt]: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
  ];
}

function parseAdminCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return null;

  const [createdAt, idStr] = cursor.split('|');
  if (!createdAt || !idStr) return null;

  const id = Number(idStr);

  if (!Number.isFinite(id)) return null;
  return { createdAt, id };
}

function parseRequiredAdminCursor(cursor) {
  const parsed = parseAdminCursor(cursor);
  if (!parsed) {
    const error = new Error('INVALID_CURSOR');
    error.code = 'INVALID_CURSOR';
    throw error;
  }

  return parsed;
}

async function getAdminReviewImages(reviewIds) {
  if (!reviewIds.length) return {};

  const rows = await ReviewImage.findAll({
    where: { review_id: { [Op.in]: reviewIds } },
    attributes: ['id', 'review_id', 'url', 'sort_order'],
    order: [
      ['review_id', 'ASC'],
      ['sort_order', 'ASC'],
      ['id', 'ASC'],
    ],
    raw: true,
  });

  const map = {};
  for (const row of rows) {
    const reviewId = row.review_id;
    if (!map[reviewId]) map[reviewId] = [];
    if (map[reviewId].length >= ADMIN_IMAGE_LIMIT) continue;

    map[reviewId].push({
      id: row.id,
      url: row.url,
      sortOrder: row.sort_order,
    });
  }

  return map;
}

async function runReviewKeyset(where) {
  const rows = await Review.findAll({
    where,
    include: [
      {
        model: ReviewImage,
        as: 'images',
        attributes: ['id', 'url', 'width', 'height', 'sort_order'],
        required: false,
        order: [['sort_order', 'ASC']],
        separate: true,
      },
      {
        model: User,
        attributes: ['id', 'name', 'profile_image_url'],
        required: true,
      },
    ],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: LIMIT + 1,
  });

  const hasMore = rows.length > LIMIT;
  const sliced = hasMore ? rows.slice(0, LIMIT) : rows;

  const last = sliced[sliced.length - 1];
  const nextCursor =
    hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null;

  return { rows: sliced, hasMore, nextCursor };
}

export async function getAllByRestaurantIdKeyset(
  restaurant_id,
  blockedUserIds,
  cursor,
  category,
) {
  const where = { restaurant_id };
  if (blockedUserIds.length > 0) {
    where.user_id = { [Op.notIn]: blockedUserIds };
  }
  applyKeysetCursorWhere(where, cursor);
  if (category && ALLOWED.has(category)) {
    where.ratingCategory = category;
  }

  return runReviewKeyset(where);
}

export async function getAllByUserIdKeyset(user_id, cursor) {
  const where = { user_id };
  applyKeysetCursorWhere(where, cursor);

  return runReviewKeyset(where);
}

export async function getOneWithImages(id) {
  const review = await Review.findOne({
    where: { id },
    include: [
      {
        model: ReviewImage,
        as: 'images',
        attributes: ['id', 'url', 'width', 'height', 'sort_order'],
        required: false,
        order: [['sort_order', 'ASC']],
        separate: true,
      },
      {
        model: User,
        attributes: ['id', 'name'],
        required: true,
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return review;
}

export async function getAdminReviewsKeyset({ q, cursor } = {}) {
  const where = [];
  const replacements = { limit: ADMIN_LIMIT + 1 };

  const cursorObj = cursor ? parseRequiredAdminCursor(cursor) : null;
  if (cursorObj) {
    where.push(`
      (
        r.createdAt < :cursorCreatedAt
        OR (r.createdAt = :cursorCreatedAt AND r.id < :cursorId)
      )
    `);
    replacements.cursorCreatedAt = cursorObj.createdAt;
    replacements.cursorId = cursorObj.id;
  }

  const keyword = String(q ?? '').trim();
  if (keyword) {
    where.push(`
      (
        r.content LIKE :keyword
        OR u.name LIKE :keyword
        OR res.name LIKE :keyword
      )
    `);
    replacements.keyword = `%${keyword}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await sequelize.query(
    `
    SELECT
      r.id,
      r.content,
      r.rating,
      r.createdAt,
      DATE_FORMAT(r.createdAt, '%Y-%m-%d %H:%i:%s') AS cursorCreatedAt,
      u.id AS userId,
      u.username AS username,
      u.name AS userName,
      res.id AS restaurantId,
      res.name AS restaurantName,
      COALESCE(NULLIF(res.road_address, ''), NULLIF(res.jibun_address, '')) AS restaurantAddress,
      (
        SELECT COUNT(*)
        FROM review_images ri
        WHERE ri.review_id = r.id
      ) AS imageCount,
      (
        SELECT COUNT(*)
        FROM review_reactions rr
        WHERE rr.review_id = r.id AND rr.type = 'like'
      ) AS likeCount,
      (
        SELECT COUNT(*)
        FROM review_reactions rr
        WHERE rr.review_id = r.id AND rr.type = 'dislike'
      ) AS dislikeCount
    FROM reviews r
    INNER JOIN users u ON u.id = r.user_id
    INNER JOIN restaurants res ON res.id = r.restaurant_id
    ${whereSql}
    ORDER BY r.createdAt DESC, r.id DESC
    LIMIT :limit
    `,
    { type: QueryTypes.SELECT, replacements },
  );

  const hasMore = rows.length > ADMIN_LIMIT;
  const sliced = hasMore ? rows.slice(0, ADMIN_LIMIT) : rows;

  const last = sliced[sliced.length - 1];
  const nextCursor =
    hasMore && last ? `${last.cursorCreatedAt}|${last.id}` : null;

  const reviewIds = sliced.map((row) => row.id);
  const imagesMap = await getAdminReviewImages(reviewIds);
  const rowsWithImages = sliced.map((row) => ({
    ...row,
    images: imagesMap[row.id] ?? [],
  }));

  return { rows: rowsWithImages, hasMore, nextCursor };
}

export async function updateReviewWithImages(reviewId, userId, payload, files) {
  return sequelize.transaction(async (t) => {
    const review = await Review.findOne({
      where: { id: reviewId, user_id: userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!review) return null;

    const oldRating = Number(review.rating);
    const newRating = Number(payload.rating);

    await review.update(
      { rating: newRating, content: payload.content.trim() },
      { transaction: t },
    );

    let deletedIds = payload.deletedImageIds || [];
    if (!Array.isArray(deletedIds)) {
      deletedIds = [deletedIds];
    }
    deletedIds = deletedIds.map(Number).filter(Boolean);

    let deletedImageUrls = [];

    if (deletedIds.length > 0) {
      const imagesToDelete = await ReviewImage.findAll({
        where: { id: deletedIds, review_id: reviewId },
        transaction: t,
      });

      deletedImageUrls = imagesToDelete.map((img) => img.url);

      await ReviewImage.destroy({
        where: { id: deletedIds, review_id: reviewId },
        transaction: t,
      });
    }

    const existingCount = await ReviewImage.count({
      where: { review_id: reviewId },
      transaction: t,
    });
    const newCount = (files || []).length;
    const MAX_IMAGES = 10;

    if (existingCount + newCount > MAX_IMAGES) {
      throw new Error('MAX_IMAGES_EXCEEDED');
    }

    const maxSort =
      (await ReviewImage.max('sort_order', {
        where: { review_id: reviewId },
        transaction: t,
      })) || 0;

    if (files && files.length > 0) {
      const images = files.map((file, index) => ({
        review_id: reviewId,
        url: `/uploads/reviews/${file.filename}`,
        sort_order: maxSort + index + 1,
      }));
      await ReviewImage.bulkCreate(images, { transaction: t });
    }

    if (oldRating !== newRating) {
      await restaurantStats.changeReviewRating({
        restaurantId: review.restaurant_id,
        oldRating,
        newRating,
        transaction: t,
      });

      const user = await User.findByPk(userId, { transaction: t });
      const ageBand = calcAgeBandFromBirth(user?.birth);
      const gender = mapGenderToCohort(user?.gender);
      const delta = newRating - oldRating;

      if (ageBand != null && delta !== 0) {
        await cohortRepository.cohortReviewStats(
          {
            restaurantId: review.restaurant_id,
            ageBand,
            gender,
            deltaCount: 0,
            deltaRating: delta,
          },
          { transaction: t },
        );
      }
    }

    return { review, deletedImageUrls };
  });
}

export async function deleteReviewWithImageUrls(reviewId, userId, isAdmin) {
  return sequelize.transaction(async (t) => {
    const where = isAdmin
      ? { id: reviewId }
      : { id: reviewId, user_id: userId };

    const review = await Review.findOne({
      where,
      attributes: ['id', 'restaurant_id', 'user_id', 'rating'],
      include: [
        {
          model: ReviewImage,
          as: 'images',
          attributes: ['url'],
          required: false,
        },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!review) {
      return {
        deleted: false,
        restaurantId: null,
        deletedImageUrls: [],
      };
    }

    const restaurantId = review.restaurant_id;
    const reviewAuthorId = review.user_id;
    const rating = review.rating;
    const deletedImageUrls = (review.images ?? []).map((img) => img.url);

    const deletedCount = await Review.destroy({
      where,
      transaction: t,
    });

    if (deletedCount > 0) {
      await restaurantStats.decreaseReview({
        restaurantId,
        rating,
        transaction: t,
      });

      const user = await User.findByPk(reviewAuthorId, { transaction: t });
      const ageBand = calcAgeBandFromBirth(user?.birth);
      const gender = mapGenderToCohort(user?.gender);

      if (ageBand != null) {
        await cohortRepository.cohortReviewStats(
          {
            restaurantId,
            ageBand,
            gender,
            deltaCount: -1,
            deltaRating: -rating,
          },
          { transaction: t },
        );
      }
    }

    return {
      deleted: deletedCount > 0,
      restaurantId,
      deletedImageUrls: deletedCount > 0 ? deletedImageUrls : [],
    };
  });
}
