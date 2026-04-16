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

function normalizeHourPayload(hour) {
  return {
    is_closed: Boolean(hour.isClosed),
    open_time: hour.openTime || null,
    close_time: hour.closeTime || null,
    break_start_time: hour.breakStart || null,
    break_end_time: hour.breakEnd || null,
    last_order_time: hour.lastOrder || null,
    is_24_hours: Boolean(hour.is24Hours),
  };
}

export async function updateRestaurantHours(
  restaurantId,
  businessHours = [],
  transaction = undefined,
) {
  if (!Array.isArray(businessHours)) return;

  for (const hour of businessHours) {
    const existing = await RestaurantHour.findOne({
      where: {
        restaurant_id: restaurantId,
        day_of_week: hour.dayOfWeek,
      },
      transaction,
    });

    const values = normalizeHourPayload(hour);

    if (existing) {
      await existing.update(values, { transaction });
      continue;
    }

    await RestaurantHour.create(
      {
        restaurant_id: restaurantId,
        day_of_week: hour.dayOfWeek,
        ...values,
      },
      { transaction },
    );
  }
}
