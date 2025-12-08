import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const RestaurantLike = sequelize.define(
  'restaurant_like',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    restaurant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    indexes: [{ unique: true, fields: ['user_id', 'restaurant_id'] }],
  }
);

export async function findByRestaurantAndUser(user_id, restaurant_id) {
  return RestaurantLike.findOne({ where: { user_id, restaurant_id } });
}

export async function remove(user_id, restaurant_id) {
  return RestaurantLike.findOne({ where: { user_id, restaurant_id } }) //
    .then((like) => like.destroy());
}

export async function create(user_id, restaurant_id) {
  return RestaurantLike.create({ user_id, restaurant_id });
}
