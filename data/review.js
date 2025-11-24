import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';
import { Restaurant } from './restaurant.js';
import { User } from './user.js';

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

Review.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Review.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

export async function getListReviews(restaurant_id) {
  return Review.findAll({ where: restaurant_id });
}

export async function getReviewById(id) {
  return Review.findByPk(id);
}

export async function create(review, transaction) {
  const options = transaction ? { transaction } : {};
  return Review.create(review, options); //
  //.then((data) => getReviewById(data.dataValues.id));
}
