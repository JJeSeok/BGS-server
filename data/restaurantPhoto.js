import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const RestaurantPhoto = sequelize.define(
  'restaurant_photo',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    restaurant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sort_order: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    charset: 'utf8mb4',
    collate: 'utf8mb4_0900_ai_ci',
    indexes: [
      {
        name: 'idx_photos_rest_sort',
        unique: true,
        fields: ['restaurant_id', 'sort_order'],
      },
    ],
  }
);

export async function getRestaurantPhotos(id) {
  return RestaurantPhoto.findAll({
    where: { restaurant_id: id },
    attributes: ['id', 'url', 'sort_order'],
    order: [['sort_order', 'ASC']],
  });
}

export async function getMaxSortOrder(id) {
  return (
    RestaurantPhoto.max('sort_order', { where: { restaurant_id: id } }) || 0
  );
}

export async function create(rows) {
  return RestaurantPhoto.bulkCreate(rows);
}
