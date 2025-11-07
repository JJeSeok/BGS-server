import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';
import { Review } from './review.js';

const ReviewImage = sequelize.define('review_image', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  review_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sort_order: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
});

ReviewImage.belongsTo(Review, { foreignKey: 'review_id' });
