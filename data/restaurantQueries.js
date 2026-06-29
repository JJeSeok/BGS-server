import * as restaurantRepository from './restaurant.js';
import * as restaurantLikeRepository from './restaurantLike.js';
import * as cohortRepository from './restaurantCohortStat.js';
import { Restaurant } from './restaurant.js';
import { RestaurantPhoto } from './restaurantPhoto.js';
import { RestaurantRequest } from './restaurantRequest.js';
import { Review } from './review.js';
import { ReviewImage } from './reviewImage.js';
import { User } from './user.js';
import { sequelize } from '../db/database.js';
import { calcAgeBandFromBirth, mapGenderToCohort } from '../utils/cohort.js';

export async function deleteRestaurant(restaurantId) {
  return sequelize.transaction(async (t) => {
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: ['main_image_url'],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!restaurant) {
      return {
        deleted: false,
        deletedReviewImageUrls: [],
        deletedRestaurantImageUrls: [],
      };
    }

    const reviewImageRows = await ReviewImage.findAll({
      include: [
        {
          model: Review,
          attributes: [],
          where: { restaurant_id: restaurantId },
          required: true,
        },
      ],
      attributes: ['url'],
      raw: true,
      transaction: t,
    });

    const restaurantPhotoRows = await RestaurantPhoto.findAll({
      where: { restaurant_id: restaurantId },
      attributes: ['url'],
      raw: true,
      transaction: t,
    });

    const deletedReviewImageUrls = reviewImageRows
      .map((r) => r.url)
      .filter(Boolean);
    const deletedRestaurantImageUrls = [
      restaurant.main_image_url,
      ...restaurantPhotoRows.map((r) => r.url),
    ].filter(Boolean);

    await RestaurantRequest.update(
      { restaurant_deleted: true },
      {
        where: { approved_restaurant_id: restaurantId },
        transaction: t,
      },
    );

    const deletedCount = await Restaurant.destroy({
      where: { id: restaurantId },
      transaction: t,
    });

    return {
      deleted: deletedCount > 0,
      deletedReviewImageUrls: deletedCount > 0 ? deletedReviewImageUrls : [],
      deletedRestaurantImageUrls:
        deletedCount > 0 ? deletedRestaurantImageUrls : [],
    };
  });
}

export async function toggleLike({ userId, restaurantId }) {
  return sequelize.transaction(async (t) => {
    const restaurant = await Restaurant.findByPk(restaurantId, {
      transaction: t,
    });
    if (!restaurant) {
      const err = new Error('식당을 찾을 수 없습니다.');
      err.status = 404;
      throw err;
    }

    const user = await User.findByPk(userId, { transaction: t });
    const ageBand = calcAgeBandFromBirth(user?.birth);
    const gender = mapGenderToCohort(user?.gender);

    const existing = await restaurantLikeRepository.findByRestaurantAndUser(
      userId,
      restaurantId,
      { transaction: t },
    );

    let isLiked, delta;
    if (existing) {
      await restaurantLikeRepository.remove(userId, restaurantId, {
        transaction: t,
      });
      await restaurantRepository.decreaseInLikeCount(restaurantId, {
        transaction: t,
      });
      isLiked = false;
      delta = -1;
    } else {
      if (restaurant.status === 'closed') {
        const err = new Error('폐업한 식당은 찜할 수 없습니다.');
        err.status = 409;
        throw err;
      }

      await restaurantLikeRepository.create(userId, restaurantId, {
        transaction: t,
      });
      await restaurantRepository.increaseInLikeCount(restaurantId, {
        transaction: t,
      });
      isLiked = true;
      delta = +1;
    }

    if (ageBand != null) {
      await cohortRepository.cohortLikeCount(
        { restaurantId, ageBand, gender, delta },
        { transaction: t },
      );
    }

    const updated = await restaurantRepository.getRestaurantById(restaurantId, {
      transaction: t,
    });
    return { likeCount: updated.like_count, isLiked };
  });
}
