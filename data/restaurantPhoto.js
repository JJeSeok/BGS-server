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
  },
);

export async function getRestaurantPhotos(
  restaurantId,
  transaction = undefined,
) {
  return RestaurantPhoto.findAll({
    where: { restaurant_id: restaurantId },
    order: [
      ['sort_order', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
  });
}

export async function getRestaurantPhotoByIds(
  photoIds,
  restaurantId,
  transaction = undefined,
) {
  return RestaurantPhoto.findAll({
    where: {
      id: photoIds,
      restaurant_id: restaurantId,
    },
    transaction,
  });
}

export async function deleteRestaurantPhotosByIds(
  photoIds,
  restaurantId,
  transaction = undefined,
) {
  return RestaurantPhoto.destroy({
    where: {
      id: photoIds,
      restaurant_id: restaurantId,
    },
    transaction,
  });
}

export async function getMaxSortOrder(restaurantId, transaction = undefined) {
  const row = await RestaurantPhoto.findOne({
    where: { restaurant_id: restaurantId },
    order: [['sort_order', 'DESC']],
    transaction,
  });

  return row?.sort_order ?? 0;
}

export async function create(rows, transaction = undefined) {
  return RestaurantPhoto.bulkCreate(rows, { transaction });
}

export async function countRestaurantPhotos(
  restaurantId,
  transaction = undefined,
) {
  return RestaurantPhoto.count({
    where: { restaurant_id: restaurantId },
    transaction,
  });
}

export async function countDeletablePhotos(
  restaurantId,
  deleteIds,
  transaction = undefined,
) {
  if (!Array.isArray(deleteIds) || deleteIds.length === 0) return 0;

  return RestaurantPhoto.count({
    where: {
      id: deleteIds,
      restaurant_id: restaurantId,
    },
    transaction,
  });
}
