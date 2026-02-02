import { DataTypes, QueryTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const RestaurantCohortStat = sequelize.define(
  'restaurant_cohort_stat',
  {
    restaurant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
    age_band: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      validate: {
        min: 10,
        max: 60,
      },
    },
    gender: {
      type: DataTypes.ENUM('M', 'F', 'U'),
      allowNull: false,
      defaultValue: 'U',
      primaryKey: true,
    },
    like_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    review_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    rating_sum: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    charset: 'utf8mb4',
    collate: 'utf8mb4_0900_ai_ci',
    timestamps: true,
    createdAt: false,
    updatedAt: true,
    indexes: [
      {
        name: 'idx_rcs_cohort',
        fields: ['age_band', 'gender', 'restaurant_id'],
      },
    ],
  },
);

export async function cohortLikeCount(
  { restaurantId, ageBand, gender, delta },
  { transaction } = {},
) {
  const initialLike = delta > 0 ? delta : 0;

  await sequelize.query(
    `
    INSERT INTO restaurant_cohort_stats (restaurant_id, age_band, gender, like_count, review_count, rating_sum, updatedAt)
    VALUES (:restaurantId, :ageBand, :gender, :initialLike, 0, 0, NOW())
    ON DUPLICATE KEY UPDATE like_count = GREATEST(like_count + :delta, 0)
    `,
    {
      type: QueryTypes.INSERT,
      replacements: { restaurantId, ageBand, gender, delta, initialLike },
      transaction,
    },
  );
}
