import { DataTypes, QueryTypes } from 'sequelize';
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
  },
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
    },
  );
}

export async function remove(id, user_id, transaction) {
  const options = transaction ? { transaction } : {};
  return Review.findOne({ where: { id, user_id }, ...options }).then(
    (review) => {
      if (!review) return null;
      return review.destroy();
    },
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

export async function getRestaurantReviewStats(restaurant_id, blockedIds = []) {
  const hasBlocked = Array.isArray(blockedIds) && blockedIds.length > 0;

  const sql = `
    SELECT
      COUNT(*) AS totalCount,
      SUM(CASE WHEN r.ratingCategory = 'good' THEN 1 ELSE 0 END) AS goodCount,
      SUM(CASE WHEN r.ratingCategory = 'ok' THEN 1 ELSE 0 END) AS okCount,
      SUM(CASE WHEN r.ratingCategory = 'bad' THEN 1 ELSE 0 END) AS badCount
    FROM reviews r
    WHERE r.restaurant_id = :restaurant_id
    ${hasBlocked ? 'AND r.user_id NOT IN (:blockedIds)' : ''}
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: hasBlocked
      ? { restaurant_id, blockedIds }
      : { restaurant_id },
  });

  const row = rows?.[0] ?? {};

  const totalCount = Number(row.totalCount ?? 0);
  const ratingCounts = {
    good: Number(row.goodCount ?? 0),
    ok: Number(row.okCount ?? 0),
    bad: Number(row.badCount ?? 0),
  };

  return { totalCount, ratingCounts };
}
