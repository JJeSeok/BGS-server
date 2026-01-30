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
    indexes: [
      { name: 'idx_restaurants_lat_lng', fields: ['lat', 'lng'] },
      { name: 'idx_restaurant_sido', fields: ['sido'] },
    ],
  },
);

const LIMIT = 20;
const DEFAULT_RADIUS_KM = 5;
const MYLOCATION_RADIUS_KM = 10;
const BAYES_M = 20;
const POP_WEIGHT = 0.05;

const SORT_MAP = {
  default: [
    ['rec_score', 'DESC'],
    ['review_count', 'DESC'],
    ['like_count', 'DESC'],
    ['id', 'ASC'],
  ],
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
  distance: [
    ['distance_km', 'ASC'],
    ['id', 'ASC'],
  ],
};

function resolveSort(sort) {
  if (!sort) return SORT_MAP.default;
  return SORT_MAP[sort] ?? SORT_MAP.default;
}

function colSql(col, { distanceRoundedSql, recScoreRoundedSql } = {}) {
  if (col === 'distance_km') return distanceRoundedSql;
  if (col === 'rec_score') return recScoreRoundedSql;
  return `r.${col}`;
}

function buildOrderBy(sortSpec) {
  return sortSpec
    .map(([col, dir]) => {
      if (col === 'distance_km') return `distance_km ${dir}`;
      if (col === 'rec_score') return `rec_score ${dir}`;
      return `r.${col} ${dir}`;
    })
    .join(', ');
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

function haversineKmExprRaw() {
  return `(6371 * 2 * ASIN(SQRT(
    POW(SIN((RADIANS(r.lat) - RADIANS(:userLat)) / 2), 2)
    + COS(RADIANS(:userLat)) * COS(RADIANS(r.lat))
    * POW(SIN((RADIANS(r.lng) - RADIANS(:userLng)) / 2), 2)
  )))`;
}

function haversineKmExprRounded() {
  return `ROUND(${haversineKmExprRaw()}, 6)`;
}

function buildBoundingBox({ userLat, userLng, radiusKm }) {
  const kmPerDegLat = 111.045;
  const latRad = (userLat * Math.PI) / 180;
  const kmPerDegLng = kmPerDegLat * Math.cos(latRad);

  const safeKmPerDegLng = Math.max(kmPerDegLng, 0.000001);

  const deltaLat = radiusKm / kmPerDegLat;
  const deltaLng = radiusKm / safeKmPerDegLng;

  return {
    minLat: userLat - deltaLat,
    maxLat: userLat + deltaLat,
    minLng: userLng - deltaLng,
    maxLng: userLng + deltaLng,
  };
}

function bayesScoreExprRaw() {
  return `(
  (r.review_count / (r.review_count + :bayes_m)) * r.rating_avg
  + (:bayes_m / (r.review_count + :bayes_m)) * stats.global_avg
  )`;
}

function bayesScoreExprRounded() {
  return `ROUND(${bayesScoreExprRaw()}, 6)`;
}

function popExprRaw() {
  return `(LOG(1 + r.view_count) + 2 * LOG(1 + r.like_count))`;
}

function recScoreExprRaw({ bayesRoundedSql }) {
  return `(${bayesRoundedSql} + (:pop_weight * ${popExprRaw()}))`;
}

function recScoreExprRounded({ bayesRoundedSql }) {
  return `ROUND(${recScoreExprRaw({ bayesRoundedSql })}, 6)`;
}

function buildKeysetWhere(
  sortSpec,
  cursorObj,
  replacements,
  { distanceRoundedSql, recScoreRoundedSql } = {},
) {
  if (!cursorObj) return { sql: '', ok: true };

  for (const [col] of sortSpec) {
    if (cursorObj[col] === undefined || cursorObj[col] === null) {
      return { sql: '', ok: false };
    }
    if (col === 'distance_km' && !Number.isFinite(Number(cursorObj[col]))) {
      return { sql: '', ok: false };
    }
    if (col === 'rec_score' && !Number.isFinite(Number(cursorObj[col]))) {
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
      ands.push(
        `${colSql(prevCol, { distanceRoundedSql, recScoreRoundedSql })} = :${key}`,
      );
    }

    const [col, dir] = sortSpec[i];
    const op = dir === 'DESC' ? '<' : '>';
    const key = `c_cmp_${col}`;
    replacements[key] = cursorObj[col];
    ands.push(
      `${colSql(col, { distanceRoundedSql, recScoreRoundedSql })} ${op} :${key}`,
    );

    parts.push(`(${ands.join(' AND ')})`);
  }

  return { sql: `(${parts.join(' OR ')})`, ok: true };
}

function sortSpecNeeds(sortSpec, colName) {
  return sortSpec.some(([c]) => c === colName);
}

export async function getAllRestaurants({
  sort,
  sido,
  q,
  cursor,
  lat,
  lng,
} = {}) {
  let sortKey = sort;
  if (sortKey === 'distance' && sido) sortKey = 'default';

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

  const hasQuery = tokens.length > 0;
  const isDistance = sort === 'distance';

  const userLat = Number(lat);
  const userLng = Number(lng);
  const hasUserLoc = Number.isFinite(userLat) && Number.isFinite(userLng);

  let applyRadius = false;
  let radiusKm = null;

  if (isDistance) {
    if (!hasUserLoc) {
      throw new Error('distance sort requires valid lat/lng');
    }

    applyRadius = true;
    radiusKm = DEFAULT_RADIUS_KM;
  } else {
    if (hasUserLoc && !hasQuery && !sido) {
      applyRadius = true;
      radiusKm = MYLOCATION_RADIUS_KM;
    }
  }

  let selectDistanceSql = '';
  let distanceRawSql = null;
  let distanceRoundedSql = null;

  if (applyRadius) {
    replacements.userLat = userLat;
    replacements.userLng = userLng;
    replacements.radiusKm = radiusKm;

    const box = buildBoundingBox({ userLat, userLng, radiusKm });
    replacements.minLat = box.minLat;
    replacements.maxLat = box.maxLat;
    replacements.minLng = box.minLng;
    replacements.maxLng = box.maxLng;

    distanceRawSql = haversineKmExprRaw();
    distanceRoundedSql = haversineKmExprRounded();

    where.push('r.lat IS NOT NULL');
    where.push('r.lng IS NOT NULL');
    where.push('r.lat BETWEEN :minLat AND :maxLat');
    where.push('r.lng BETWEEN :minLng AND :maxLng');

    where.push(`${distanceRawSql} <= :radiusKm`);

    if (isDistance) {
      selectDistanceSql = `, ${distanceRoundedSql} AS distance_km`;
    }
  }

  const needRecScore = sortSpecNeeds(sortSpec, 'rec_score');
  let bayesRoundedSql = null;
  let selectBayesSql = ''; // 추천순 구현 끝나면 삭제
  let recScoreRoundedSql = null;
  let selectRecSql = '';

  if (needRecScore) {
    replacements.bayes_m = BAYES_M;
    replacements.pop_weight = POP_WEIGHT;

    bayesRoundedSql = bayesScoreExprRounded();
    selectBayesSql = `, ${bayesRoundedSql} AS bayes_score`; // 추천순 구현 끝나면 삭제

    recScoreRoundedSql = recScoreExprRounded({ bayesRoundedSql });
    selectRecSql = `, ${recScoreRoundedSql} AS rec_score`;
  }

  const cursorObj = decodeCursor(cursor);
  const keyset = buildKeysetWhere(sortSpec, cursorObj, replacements, {
    distanceRoundedSql,
    recScoreRoundedSql,
  });

  if (cursorObj && keyset.sql) {
    where.push(keyset.sql);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const statsJoin = needRecScore
    ? `CROSS JOIN (SELECT AVG(rating_avg) AS global_avg FROM restaurants) AS stats`
    : '';

  // 추천순 구현 끝나면 selectBayesSql 삭제
  const rows = await sequelize.query(
    `SELECT
      r.id, r.name, r.category, r.sido, r.sigugun, r.dongmyun, r.main_image_url, r.view_count, r.review_count, r.rating_avg, r.like_count
      ${selectDistanceSql}
      ${selectBayesSql}
      ${selectRecSql}
    FROM restaurants AS r
    ${statsJoin}
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
