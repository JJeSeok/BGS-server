import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const Menu = sequelize.define('menu', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  price: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  sort_order: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
});
