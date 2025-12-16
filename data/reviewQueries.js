import { sequelize } from '../db/database.js';
import { Review } from './review.js';
import { ReviewImage } from './reviewImage.js';
import { User } from './user.js';

export async function getAllByRestaurantId(restaurant_id) {
  const reviews = await Review.findAll({
    where: { restaurant_id },
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
    });
    if (!review) return null;

    await review.update(
      { rating: payload.rating, content: payload.content.trim() },
      { transaction: t }
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

    return { review, deletedImageUrls };
  });
}
