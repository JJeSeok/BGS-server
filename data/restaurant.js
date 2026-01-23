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
    rating_sum: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    review_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    good_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    ok_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    bad_count: {
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
    lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    charset: 'utf8mb4',
    collate: 'utf8mb4_0900_ai_ci',
  },
);

const LIMIT = 20;

const SORT_MAP = {
  // 평점순
  rating: [
    ['rating_avg', 'DESC'],
    ['review_count', 'DESC'],
    ['like_count', 'DESC'],
    ['id', 'ASC'],
  ],
  views: [
    ['view_count', 'DESC'],
    ['like_count', 'DESC'],
    ['review_count', 'DESC'],
    ['id', 'ASC'],
  ],
  likes: [
    ['like_count', 'DESC'],
    ['review_count', 'DESC'],
    ['rating_avg', 'DESC'],
    ['id', 'ASC'],
  ],
  reviews: [
    ['review_count', 'DESC'],
    ['rating_avg', 'DESC'],
    ['like_count', 'DESC'],
    ['id', 'ASC'],
  ],
  // 거리순
  default: [['id', 'ASC']],
};

function resolveSort(sort) {
  if (!sort) return SORT_MAP.default;
  return SORT_MAP[sort] ?? SORT_MAP.default;
}

function buildOrderBy(sortSpec) {
  return sortSpec.map(([col, dir]) => `r.${col} ${dir}`).join(', ');
}

function encodeCursor(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const json = Buffer.from(String(cursor), 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildKeysetWhere(sortSpec, cursorObj, replacements) {
  if (!cursorObj) return { sql: '', ok: true };

  for (const [col] of sortSpec) {
    if (cursorObj[col] === undefined || cursorObj[col] === null) {
      return { sql: '', ok: false };
    }
  }

  const parts = [];

  for (let i = 0; i < sortSpec.length; i++) {
    const ands = [];

    for (let j = 0; j < i; j++) {
      const [prevCol] = sortSpec[j];
      const key = `c_eq_${prevCol}`;
      replacements[key] = cursorObj[prevCol];
      ands.push(`r.${prevCol} = :${key}`);
    }

    const [col, dir] = sortSpec[i];
    const op = dir === 'DESC' ? '<' : '>';
    const key = `c_cmp_${col}`;
    replacements[key] = cursorObj[col];
    ands.push(`r.${col} ${op} :${key}`);

    parts.push(`(${ands.join(' AND ')})`);
  }

  return { sql: `(${parts.join(' OR ')})`, ok: true };
}

export async function getAllRestaurants({ sort, sido, q, cursor } = {}) {
  const sortSpec = resolveSort(sort);
  const orderBy = buildOrderBy(sortSpec);

  const where = [];
  const replacements = { limit: LIMIT + 1 };

  if (sido && typeof sido === 'string') {
    where.push('r.sido = :sido');
    replacements.sido = sido;
  }

  const fields = ['r.name', 'r.category', 'r.sido', 'r.sigugun', 'r.dongmyun'];

  const tokens = String(q ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  tokens.forEach((t, idx) => {
    const key = `q${idx}`;
    replacements[key] = `%${t}%`;

    const orGroup = fields.map((f) => `${f} LIKE :${key}`).join(' OR ');
    where.push(`(${orGroup})`);
  });

  const cursorObj = decodeCursor(cursor);
  const keyset = buildKeysetWhere(sortSpec, cursorObj, replacements);

  if (cursorObj && keyset.sql) {
    where.push(keyset.sql);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await sequelize.query(
    `SELECT r.id, r.name, r.category, r.sido, r.sigugun, r.dongmyun, r.main_image_url, r.view_count, r.review_count, r.rating_avg, r.like_count
    FROM restaurants AS r
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT :limit`,
    { type: QueryTypes.SELECT, replacements },
  );

  const hasMore = rows.length > LIMIT;
  const sliced = hasMore ? rows.slice(0, LIMIT) : rows;

  const nextCursor = hasMore
    ? encodeCursor(
        Object.fromEntries(
          sortSpec.map(([col]) => [col, sliced[sliced.length - 1][col]]),
        ),
      )
    : null;

  return { rows: sliced, hasMore, nextCursor };
}

export async function getRestaurantById(id) {
  return Restaurant.findByPk(id);
}

export async function create(restaurant) {
  return Restaurant.create(restaurant).then((data) =>
    getRestaurantById(data.dataValues.id),
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
