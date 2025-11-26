import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const ReviewImage = sequelize.define(
  'review_image',
  {
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
  },
  {
    indexes: [{ fields: ['review_id', 'sort_order'] }],
  }
);

export async function getAllByReviewId(review_id) {
  return ReviewImage.findAll({
    where: { review_id },
    order: [['sort_order', 'ASC']],
  });
}

export async function create(images, transaction) {
  const options = transaction ? { transaction } : {};
  return ReviewImage.bulkCreate(images, options);
}
