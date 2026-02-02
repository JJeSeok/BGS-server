import { Op } from 'sequelize';
import { sequelize } from '../db/database.js';
import { Review } from './review.js';
import { ReviewImage } from './reviewImage.js';
import { User } from './user.js';
import { calcAgeBandFromBirth, mapGenderToCohort } from '../utils/cohort.js';
import * as restaurantStats from './restaurantStats.js';
import * as cohortRepository from '../data/restaurantCohortStat.js';

const LIMIT = 5;
const ALLOWED = new Set(['good', 'ok', 'bad']);

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
  if (cursor) {
    where[Op.or] = [
      { createdAt: { [Op.lt]: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
    ];
  }
  if (category && ALLOWED.has(category)) {
    where.ratingCategory = category;
  }

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

export async function getAllByRestaurantId(restaurant_id, blockedUserIds) {
  const where = { restaurant_id };
  if (blockedUserIds.length > 0) {
    where.user_id = { [Op.notIn]: blockedUserIds };
  }

  return Review.findAll({
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
    order: [['createdAt', 'DESC']],
  });
}

export async function getAllByUserId(user_id) {
  const reviews = await Review.findAll({
    where: { user_id },
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
    order: [['createdAt', 'DESC']],
  });

  return reviews;
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
    const MAX_IMAGES = 30;

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

export async function deleteReviewWithImageUrls(reviewId, userId) {
  return sequelize.transaction(async (t) => {
    const review = await Review.findOne({
      where: { id: reviewId, user_id: userId },
      attributes: ['id', 'restaurant_id', 'rating'],
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
    const rating = review.rating;
    const deletedImageUrls = (review.images ?? []).map((img) => img.url);

    const deletedCount = await Review.destroy({
      where: { id: reviewId, user_id: userId },
      transaction: t,
    });

    if (deletedCount > 0) {
      await restaurantStats.decreaseReview({
        restaurantId,
        rating,
        transaction: t,
      });

      const user = await User.findByPk(userId, { transaction: t });
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
