import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const RestaurantHour = sequelize.define(
  'restaurant_hour',
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
    day_of_week: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      validate: {
        min: 0,
        max: 6,
      },
    },
    open_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    close_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    break_start_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    break_end_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    last_order_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    is_closed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_24_hours: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    indexes: [
      { fields: ['restaurant_id'] },
      { unique: true, fields: ['restaurant_id', 'day_of_week'] },
    ],
  },
);
