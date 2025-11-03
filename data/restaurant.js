import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const Restaurant = sequelize.define(
  'restaurant',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    branch_info: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    main_image_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sido: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    sigugun: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    dongmyun: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    road_address: {
      type: DataTypes.STRING(40),
    },
    jibun_address: {
      type: DataTypes.STRING(40),
    },
    // openingTime: {
    //   type: DataTypes.TIME,
    //   allowNull: false,
    // },
    // closingTime: {
    //   type: DataTypes.TIME,
    //   allowNull: false,
    // },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    rating_avg: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: false,
      defaultValue: 0.0,
    },
    rating_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    review_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    like_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    view_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
    },
  },
  {
    charset: 'utf8mb4',
    collate: 'utf8mb4_0900_ai_ci',
  }
);

const ATTRS = [
  'id',
  'name',
  'category',
  'sido',
  'sigugun',
  'dongmyun',
  ['main_image_url', 'mainImageUrl'],
  ['rating_avg', 'ratingAvg'],
  ['review_count', 'reviewCount'],
];

export async function getAllRestaurants() {
  return Restaurant.findAll({ attributes: ATTRS, raw: true });
}

export async function getRestaurantById(id) {
  return Restaurant.findByPk(id);
}

export async function create(
  name,
  category,
  branch_info,
  main_image_url,
  sido,
  sigugun,
  dongmyun,
  road_address,
  jibun_address,
  phone,
  description
) {
  return Restaurant.create({
    name,
    category,
    branch_info,
    main_image_url,
    sido,
    sigugun,
    dongmyun,
    road_address,
    jibun_address,
    phone,
    description,
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
