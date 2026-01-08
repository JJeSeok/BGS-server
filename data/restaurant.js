import { DataTypes, Op, QueryTypes } from 'sequelize';
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

const SORT_MAP = {
  // 평점순
  rating: 'ratingAvg DESC, reviewCount DESC, likeCount DESC, r.id ASC',
  views: 'r.view_count DESC, likeCount DESC, reviewCount DESC, r.id ASC',
  likes: 'likeCount DESC, reviewCount DESC, ratingAvg DESC, r.id ASC',
  reviews: 'reviewCount DESC, ratingAvg DESC, likeCount DESC, r.id ASC',
  // 거리순
  default: 'r.id ASC',
};

function resolveOrderBy(sort) {
  if (!sort) return SORT_MAP.default;
  return SORT_MAP[sort] ?? SORT_MAP.default;
}

export async function getAllRestaurants({ sort, sido } = {}) {
  const orderBy = resolveOrderBy(sort);
  const where = [];
  const replacements = {};

  if (sido && typeof sido === 'string') {
    where.push('r.sido = :sido');
    replacements.sido = sido;
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await sequelize.query(
    `SELECT r.id, r.name, r.category, r.sido, r.sigugun, r.dongmyun, r.main_image_url AS mainImageUrl, r.view_count AS viewCount, COALESCE(s.reviewCount, 0) AS reviewCount, COALESCE(s.avgRating, 0) AS ratingAvg, COALESCE(l.likeCount, 0) AS likeCount
    FROM restaurants AS r LEFT JOIN (SELECT restaurant_id, COUNT(*) AS reviewCount, AVG(rating) AS avgRating FROM reviews GROUP BY restaurant_id) AS s ON r.id = s.restaurant_id LEFT JOIN (SELECT restaurant_id, COUNT(*) AS likeCount FROM restaurant_likes GROUP BY restaurant_id) AS l ON r.id = l.restaurant_id
    ${whereSql}
    ORDER BY ${orderBy}`,
    { type: QueryTypes.SELECT, replacements }
  );

  return rows;
}

export async function getRestaurantById(id) {
  return Restaurant.findByPk(id);
}

export async function create(restaurant) {
  return Restaurant.create(restaurant).then((data) =>
    getRestaurantById(data.dataValues.id)
  );
}

export async function update(id, updateData) {
  return Restaurant.findByPk(id) //
    .then((restaurant) => restaurant.update(updateData));
}

export async function remove(id) {
  return Restaurant.findByPk(id) //
    .then((restaurant) => restaurant.destroy());
}

export async function increaseInViewCount(id) {
  return Restaurant.increment('view_count', { by: 1, where: { id } });
}

export async function increaseInLikeCount(id) {
  return Restaurant.increment('like_count', { by: 1, where: { id } });
}

export async function decreaseInLikeCount(id) {
  return Restaurant.increment('like_count', { by: -1, where: { id } });
}

export async function findByIds(ids) {
  return Restaurant.findAll({
    where: { id: { [Op.in]: ids } },
  });
}
