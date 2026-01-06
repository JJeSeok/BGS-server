import { col, DataTypes, fn } from 'sequelize';
import { sequelize } from '../db/database.js';

export const Review = sequelize.define(
  'review',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    restaurant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rating: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      validate: {
        min: 0,
        max: 10,
        isInt: true,
      },
    },
    ratingCategory: {
      type: DataTypes.ENUM('good', 'ok', 'bad'),
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    indexes: [
      { fields: ['restaurant_id', 'createdAt', 'id'] },
      { fields: ['restaurant_id', 'rating', 'createdAt', 'id'] },
      { fields: ['user_id', 'createdAt'] },
      { fields: ['restaurant_id', 'ratingCategory', 'createdAt', 'id'] },
    ],
  }
);

export async function getAllByRestaurantId(restaurant_id) {
  return Review.findAll({ where: { restaurant_id } });
}

export async function getAllByUserId(user_id) {
  return Review.findAll({ where: { user_id } });
}

export async function getReviewById(id) {
  return Review.findByPk(id);
}

export async function create(review, transaction) {
  const options = transaction ? { transaction } : {};
  return Review.create(review, options); //
}

export async function update(id, user_id, data, transaction) {
  const options = transaction ? { transaction } : {};
  return Review.findOne({ where: { id, user_id }, ...options }).then(
    (review) => {
      if (!review) return null;
      return review.update(data, options);
    }
  );
}

export async function remove(id, user_id, transaction) {
  const options = transaction ? { transaction } : {};
  return Review.findOne({ where: { id, user_id }, ...options }).then(
    (review) => {
      if (!review) return null;
      return review.destroy();
    }
  );
}

export async function findRestaurantIdsByUserId(user_id) {
  const rows = await Review.findAll({
    where: { user_id },
    attributes: ['restaurant_id'],
    raw: true,
  });
  return rows.map((r) => r.restaurant_id);
}

export async function getRestaurantReviewStats(restaurant_id) {
  const row = await Review.findOne({
    where: { restaurant_id },
    attributes: [
      [fn('COUNT', col('id')), 'totalCount'],
      [fn('AVG', col('rating')), 'avgRating'],
    ],
    raw: true,
  });

  const counts = await Review.findAll({
    where: { restaurant_id },
    attributes: ['ratingCategory', [fn('COUNT', col('id')), 'cnt']],
    group: ['ratingCategory'],
    raw: true,
  });

  const totalCount = Number(row?.totalCount || 0);
  let avgRating = Number(row?.avgRating || 0);
  if (avgRating) avgRating = Math.round(avgRating * 10) / 20;

  const map = { good: 0, ok: 0, bad: 0 };
  for (const r of counts) map[r.ratingCategory] = Number(r.cnt);

  return { totalCount, avgRating, ratingCounts: map };
}
