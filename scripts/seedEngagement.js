import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../db/database.js';
import { User } from '../data/user.js';
import { Restaurant } from '../data/restaurant.js';
import { Review } from '../data/review.js';
import { ReviewImage } from '../data/reviewImage.js';
import { ReviewReaction } from '../data/reviewReaction.js';
import { RestaurantLike } from '../data/restaurantLike.js';
import { RestaurantCohortStat } from '../data/restaurantCohortStat.js';
import { restaurants } from './data/restaurants.js';
import { likes, reviews } from './data/engagement.js';

const seedUsernames = Array.from({ length: 8 }, (_, index) =>
  `seeduser${String(index + 1).padStart(2, '0')}`,
);

async function seed() {
  validateEngagementData();
  await sequelize.authenticate();

  const [userRows, restaurantRows] = await Promise.all([
    User.findAll({
      where: { username: { [Op.in]: seedUsernames } },
      attributes: ['id', 'username'],
      raw: true,
    }),
    Restaurant.findAll({
      where: {
        [Op.or]: restaurants.map(({ name, roadAddress }) => ({
          name,
          road_address: roadAddress,
        })),
      },
      attributes: ['id', 'name', 'road_address'],
      raw: true,
    }),
  ]);

  const userIds = new Map(userRows.map((user) => [user.username, user.id]));
  const restaurantIds = new Map(
    restaurantRows.map((restaurant) => [
      restaurantKey(restaurant.name, restaurant.road_address),
      restaurant.id,
    ]),
  );
  const idsBySeedKey = new Map(
    restaurants.map((restaurant) => [
      restaurant.seedKey,
      restaurantIds.get(restaurantKey(restaurant.name, restaurant.roadAddress)),
    ]),
  );

  const missingUsers = seedUsernames.filter((username) => !userIds.has(username));
  const missingRestaurants = restaurants
    .filter((restaurant) => !idsBySeedKey.get(restaurant.seedKey))
    .map((restaurant) => restaurant.seedKey);

  if (missingUsers.length || missingRestaurants.length) {
    throw new Error(
      [
        missingUsers.length ? `Missing users: ${missingUsers.join(', ')}` : null,
        missingRestaurants.length
          ? `Missing restaurants: ${missingRestaurants.join(', ')}`
          : null,
        'Run the user and restaurant seeds first.',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const userIdList = [...userIds.values()];
  const restaurantIdList = [...idsBySeedKey.values()];

  const result = await sequelize.transaction(async (transaction) => {
    const oldReviews = await Review.findAll({
      where: {
        user_id: { [Op.in]: userIdList },
        restaurant_id: { [Op.in]: restaurantIdList },
      },
      attributes: ['id'],
      raw: true,
      transaction,
    });
    const oldReviewIds = oldReviews.map((review) => review.id);

    if (oldReviewIds.length) {
      await ReviewReaction.destroy({
        where: { review_id: { [Op.in]: oldReviewIds } },
        transaction,
      });
      await ReviewImage.destroy({
        where: { review_id: { [Op.in]: oldReviewIds } },
        transaction,
      });
      await Review.destroy({
        where: { id: { [Op.in]: oldReviewIds } },
        transaction,
      });
    }

    await RestaurantLike.destroy({
      where: {
        user_id: { [Op.in]: userIdList },
        restaurant_id: { [Op.in]: restaurantIdList },
      },
      transaction,
    });

    const now = Date.now();
    const reviewRows = reviews.map(
      ([seedKey, username, rating, content], index) => {
        const createdAt = new Date(now - (reviews.length - index) * 86400000);
        return {
          restaurant_id: idsBySeedKey.get(seedKey),
          user_id: userIds.get(username),
          rating,
          content,
          createdAt,
          updatedAt: createdAt,
        };
      },
    );
    await Review.bulkCreate(reviewRows, {
      fields: [
        'restaurant_id',
        'user_id',
        'rating',
        'content',
        'createdAt',
        'updatedAt',
      ],
      transaction,
    });

    const likeRows = Object.entries(likes).flatMap(([username, seedKeys]) =>
      seedKeys.map((seedKey) => ({
        user_id: userIds.get(username),
        restaurant_id: idsBySeedKey.get(seedKey),
      })),
    );
    await RestaurantLike.bulkCreate(likeRows, { transaction });

    await rebuildRestaurantStats(restaurantIdList, transaction);
    await rebuildCohortStats(restaurantIdList, transaction);
    return { reviews: reviewRows.length, likes: likeRows.length };
  });

  console.log(
    `Engagement seed complete: ${result.reviews} reviews, ${result.likes} likes.`,
  );
}

async function rebuildCohortStats(restaurantIds, transaction) {
  await RestaurantCohortStat.destroy({
    where: { restaurant_id: { [Op.in]: restaurantIds } },
    transaction,
  });

  await sequelize.query(
    `
      INSERT INTO restaurant_cohort_stats
        (restaurant_id, age_band, gender, like_count, review_count, rating_sum, updatedAt)
      SELECT
        activity.restaurant_id,
        LEAST(60, GREATEST(10, FLOOR(TIMESTAMPDIFF(YEAR, u.birth, CURDATE()) / 10) * 10)) AS age_band,
        CASE u.gender WHEN 'male' THEN 'M' WHEN 'female' THEN 'F' ELSE 'U' END AS gender,
        SUM(activity.like_count) AS like_count,
        SUM(activity.review_count) AS review_count,
        SUM(activity.rating_sum) AS rating_sum,
        NOW() AS updatedAt
      FROM (
        SELECT restaurant_id, user_id, 1 AS like_count, 0 AS review_count, 0 AS rating_sum
        FROM restaurant_likes
        WHERE restaurant_id IN (:restaurantIds)
        UNION ALL
        SELECT restaurant_id, user_id, 0 AS like_count, 1 AS review_count, rating AS rating_sum
        FROM reviews
        WHERE restaurant_id IN (:restaurantIds)
      ) activity
      JOIN users u ON u.id = activity.user_id
      WHERE u.birth IS NOT NULL
      GROUP BY activity.restaurant_id, age_band, gender
    `,
    {
      replacements: { restaurantIds },
      type: QueryTypes.INSERT,
      transaction,
    },
  );
}

async function rebuildRestaurantStats(restaurantIds, transaction) {
  await sequelize.query(
    `
      UPDATE restaurants r
      LEFT JOIN (
        SELECT
          restaurant_id,
          COUNT(*) AS review_count,
          COALESCE(SUM(rating), 0) AS rating_sum,
          SUM(CASE WHEN rating >= 7 THEN 1 ELSE 0 END) AS good_count,
          SUM(CASE WHEN rating >= 3 AND rating < 7 THEN 1 ELSE 0 END) AS ok_count,
          SUM(CASE WHEN rating < 3 THEN 1 ELSE 0 END) AS bad_count
        FROM reviews
        WHERE restaurant_id IN (:restaurantIds)
        GROUP BY restaurant_id
      ) review_stats ON review_stats.restaurant_id = r.id
      LEFT JOIN (
        SELECT restaurant_id, COUNT(*) AS like_count
        FROM restaurant_likes
        WHERE restaurant_id IN (:restaurantIds)
        GROUP BY restaurant_id
      ) like_stats ON like_stats.restaurant_id = r.id
      SET
        r.review_count = COALESCE(review_stats.review_count, 0),
        r.rating_sum = COALESCE(review_stats.rating_sum, 0),
        r.rating_avg = CASE
          WHEN COALESCE(review_stats.review_count, 0) = 0 THEN 0.0
          ELSE ROUND((review_stats.rating_sum / review_stats.review_count) / 2, 1)
        END,
        r.good_count = COALESCE(review_stats.good_count, 0),
        r.ok_count = COALESCE(review_stats.ok_count, 0),
        r.bad_count = COALESCE(review_stats.bad_count, 0),
        r.like_count = COALESCE(like_stats.like_count, 0)
      WHERE r.id IN (:restaurantIds)
    `,
    {
      replacements: { restaurantIds },
      type: QueryTypes.UPDATE,
      transaction,
    },
  );
}

function validateEngagementData() {
  const restaurantKeys = new Set(restaurants.map(({ seedKey }) => seedKey));
  const reviewPairs = new Set();
  const likePairs = new Set();

  for (const [seedKey, username, rating, content] of reviews) {
    assertReference(seedKey, username, restaurantKeys);
    if (!Number.isInteger(rating) || rating < 0 || rating > 10) {
      throw new Error(`Invalid review rating: ${seedKey}/${username}`);
    }
    if (!String(content).trim()) {
      throw new Error(`Empty review content: ${seedKey}/${username}`);
    }
    const pair = `${seedKey}:${username}`;
    if (reviewPairs.has(pair)) throw new Error(`Duplicate review: ${pair}`);
    reviewPairs.add(pair);
  }

  for (const [username, seedKeys] of Object.entries(likes)) {
    for (const seedKey of seedKeys) {
      assertReference(seedKey, username, restaurantKeys);
      const pair = `${seedKey}:${username}`;
      if (likePairs.has(pair)) throw new Error(`Duplicate like: ${pair}`);
      likePairs.add(pair);
    }
  }
}

function assertReference(seedKey, username, restaurantKeys) {
  if (!restaurantKeys.has(seedKey)) {
    throw new Error(`Unknown restaurant seedKey: ${seedKey}`);
  }
  if (!seedUsernames.includes(username)) {
    throw new Error(`Unknown seed username: ${username}`);
  }
}

function restaurantKey(name, roadAddress) {
  return `${name}\u0000${roadAddress}`;
}

try {
  await seed();
} catch (error) {
  console.error('Engagement seed failed:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
