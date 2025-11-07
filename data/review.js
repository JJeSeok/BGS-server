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
      allowNull: false,
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
