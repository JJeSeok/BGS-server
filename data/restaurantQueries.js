import * as restaurantRepository from './restaurant.js';
import * as restaurantLikeRepository from './restaurantLike.js';
import * as cohortRepository from './restaurantCohortStat.js';
import { Restaurant } from './restaurant.js';
import { Review } from './review.js';
import { ReviewImage } from './reviewImage.js';
import { User } from './user.js';
import { sequelize } from '../db/database.js';
import { calcAgeBandFromBirth, mapGenderToCohort } from '../utils/cohort.js';

export async function deleteRestaurant(restaurantId) {
  const rows = await ReviewImage.findAll({
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
  });

  const deletedImageUrls = rows.map((r) => r.url).filter(Boolean);

  const deletedCount = await Restaurant.destroy({
    where: { id: restaurantId },
  });

  return {
    deleted: deletedCount > 0,
    deletedImageUrls: deletedCount > 0 ? deletedImageUrls : [],
  };
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
