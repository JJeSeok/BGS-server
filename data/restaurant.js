import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

const Restaurant = sequelize.define('restaurant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  openingTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  closingTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
});

export async function getAllRestaurants() {
  return Restaurant.findAll();
}

export async function getRestaurantById(id) {
  return Restaurant.findByPk(id);
}

export async function create(name, openingTime, closingTime, phone, type) {
  return Restaurant.create({
    name,
    openingTime,
    closingTime,
    phone,
    type,
  }).then((data) => getRestaurantById(data.dataValues.id));
}

export async function update(id, updateData) {
  return Restaurant.findByPk(id) //
    .then((restaurant) => restaurant.update(updateData));
}

export async function remove(id) {
  return Restaurant.findByPk(id) //
    .then((restaurant) => restaurant.destroy());
}
