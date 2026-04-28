import { DataTypes, Op, QueryTypes } from 'sequelize';
import { sequelize } from '../db/database.js';
import { User } from './user.js';
import { Menu } from './menu.js';
import { calcAgeBandFromBirth, mapGenderToCohort } from '../utils/cohort.js';
import { RestaurantHour } from './restaurantHour.js';

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
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    parking_info: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    takeout: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    delivery: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    reservation: {
      type: DataTypes.BOOLEAN,
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
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    info_updated_at: {
      type: DataTypes.DATE,
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
const MAP_MARKER_RADIUS_KM = 2;
const MAP_MARKER_LIMIT = 100;
const M_GLOBAL = 20;
const M_COHORT = 15;
const W_POP = 0.05;
const W_COHORT_R = 0.15;
const W_COHORT_POP = 0.02;

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

function buildRecScoreSql({ withCohort }) {
  const baseBayes = `(
    (r.review_count / (r.review_count + :mGlobal)) * r.rating_avg
    + (:mGlobal / (r.review_count + :mGlobal)) * stats.global_avg
  )`;

  const basePop = `(LOG(1 + r.view_count) + 2 * LOG(1 + r.like_count)) * :wPop`;

  if (!withCohort) {
    return `ROUND((${baseBayes} + ${basePop}), 6)`;
  }

  const cohortAvg = `
    CASE WHEN cs.review_count > 0
      THEN (cs.rating_sum / cs.review_count) / 2
      ELSE NULL
    END
  `;

  const cohortBayes = `
    CASE WHEN cs.review_count > 0 THEN (
      (cs.review_count / (cs.review_count + :mCohort)) * (${cohortAvg})
      + (:mCohort / (cs.review_count + :mCohort)) * stats.global_avg
    ) ELSE stats.global_avg END
  `;

  const cohortBonus = `
    (GREATEST((${cohortBayes}) - stats.global_avg, 0) * :wCohortR)
    + (LOG(1 + COALESCE(cs.like_count, 0)) * :wCohortPop)
  `;

  return `ROUND((${baseBayes} + ${basePop} + ${cohortBonus}), 6)`;
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
  userId,
} = {}) {
  let sortKey = sort;
  if (sortKey === 'distance' && sido) sortKey = 'default';

  const sortSpec = resolveSort(sortKey);
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
  const isDistance = sortKey === 'distance';

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

  const needRec = sortSpecNeeds(sortSpec, 'rec_score');
  let joinSql = '';
  let recScoreRoundedSql = null;
  let selectRecSql = '';

  if (needRec) {
    replacements.mGlobal = M_GLOBAL;
    replacements.wPop = W_POP;

    let withCohort = false;

    if (userId) {
      const user = await User.findByPk(userId);
      const ageBand = calcAgeBandFromBirth(user?.birth);
      const gender = mapGenderToCohort(user?.gender);

      if (ageBand != null) {
        withCohort = true;
        replacements.ageBand = ageBand;
        replacements.gender = gender;

        replacements.mCohort = M_COHORT;
        replacements.wCohortR = W_COHORT_R;
        replacements.wCohortPop = W_COHORT_POP;

        joinSql = `
          LEFT JOIN restaurant_cohort_stats cs
            ON cs.restaurant_id = r.id
            AND cs.age_band = :ageBand
            AND cs.gender = :gender
        `;
      }
    }

    joinSql = `
      CROSS JOIN (SELECT AVG(rating_avg) AS global_avg FROM restaurants) AS stats
      ${joinSql}
    `;

    recScoreRoundedSql = buildRecScoreSql({ withCohort });
    selectRecSql = `, ${recScoreRoundedSql} AS rec_score`;
  }

  const cursorObj = decodeCursor(cursor);
  const keyset = buildKeysetWhere(sortSpec, cursorObj, replacements, {
    distanceRoundedSql,
    recScoreRoundedSql,
  });

  if (cursorObj && keyset.sql) where.push(keyset.sql);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await sequelize.query(
    `SELECT
      r.id, r.name, r.category, r.sido, r.sigugun, r.dongmyun, r.main_image_url, r.view_count, r.review_count, r.rating_avg, r.like_count
      ${selectDistanceSql}
      ${selectRecSql}
    FROM restaurants AS r
    ${joinSql}
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

export async function getMapRestaurants({ lat, lng }) {
  const userLat = Number(lat);
  const userLng = Number(lng);
  const box = buildBoundingBox({
    userLat,
    userLng,
    radiusKm: MAP_MARKER_RADIUS_KM,
  });
  const distanceSql = haversineKmExprRounded();

  return sequelize.query(
    `SELECT
      r.id,
      r.name,
      r.category,
      r.rating_avg,
      r.review_count,
      COALESCE(NULLIF(r.road_address, ''), NULLIF(r.jibun_address, '')) AS address,
      r.lat,
      r.lng,
      ${distanceSql} AS distance
    FROM restaurants AS r
    WHERE r.lat IS NOT NULL
      AND r.lng IS NOT NULL
      AND r.lat BETWEEN :minLat AND :maxLat
      AND r.lng BETWEEN :minLng AND :maxLng
      AND ${haversineKmExprRaw()} <= :radiusKm
    ORDER BY distance ASC, r.id ASC
    LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        userLat,
        userLng,
        radiusKm: MAP_MARKER_RADIUS_KM,
        limit: MAP_MARKER_LIMIT,
        minLat: box.minLat,
        maxLat: box.maxLat,
        minLng: box.minLng,
        maxLng: box.maxLng,
      },
    },
  );
}

export async function getRestaurantById(id) {
  return Restaurant.findByPk(id, {
    include: [
      {
        model: Menu,
        as: 'menus',
        attributes: ['id', 'name', 'price', 'sort_order'],
        separate: true,
        order: [
          ['sort_order', 'ASC'],
          ['id', 'ASC'],
        ],
      },
      {
        model: RestaurantHour,
        as: 'restaurantHours',
        attributes: [
          'day_of_week',
          'open_time',
          'close_time',
          'break_start_time',
          'break_end_time',
          'last_order_time',
          'is_closed',
          'is_24_hours',
        ],
        separate: true,
        order: [['day_of_week', 'ASC']],
      },
    ],
  });
}

export async function getRestaurantByIdForUpdate(id, transaction = undefined) {
  return Restaurant.findByPk(id, { transaction });
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

export async function increaseInViewCount(id) {
  return Restaurant.increment('view_count', { by: 1, where: { id } });
}

export async function increaseInLikeCount(id, { transaction } = {}) {
  return Restaurant.increment('like_count', {
    by: 1,
    where: { id },
    transaction,
  });
}

export async function decreaseInLikeCount(id, { transaction } = {}) {
  return Restaurant.increment('like_count', {
    by: -1,
    where: { id },
    transaction,
  });
}

export async function getVisitedRestaurants(userId, cursor) {
  const replacements = { userId, limit: LIMIT + 1 };
  const cursorObj = decodeCursor(cursor);

  let cursorSql = '';
  if (cursorObj?.lastVisitedAt && cursorObj?.id) {
    const lastVisitedAt = cursorObj.lastVisitedAt;
    const id = cursorObj.id;

    replacements.lastVisitedAt = lastVisitedAt;
    replacements.id = id;
    cursorSql = `
        WHERE (
          v.lastVisitedAt < :lastVisitedAt
          OR (v.lastVisitedAt = :lastVisitedAt AND r.id < :id)
        )
      `;
  }

  const rows = await sequelize.query(
    `SELECT
      r.id, r.name, r.main_image_url, r.road_address, r.jibun_address,
      r.sido, r.sigugun, r.dongmyun, v.lastVisitedAt
    FROM restaurants r
    INNER JOIN (
      SELECT restaurant_id, MAX(createdAt) AS lastVisitedAt
      FROM reviews
      WHERE user_id = :userId
      GROUP BY restaurant_id
    ) v ON v.restaurant_id = r.id
    ${cursorSql}
    ORDER BY v.lastVisitedAt DESC, r.id DESC
    LIMIT :limit`,
    { type: QueryTypes.SELECT, replacements },
  );

  const hasMore = rows.length > LIMIT;
  const sliced = hasMore ? rows.slice(0, LIMIT) : rows;

  const last = sliced[sliced.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ lastVisitedAt: last.lastVisitedAt, id: last.id })
      : null;

  return { rows: sliced, hasMore, nextCursor };
}

export async function getLikedRestaurants(userId, cursor) {
  const replacements = { userId, limit: LIMIT + 1 };
  const cursorObj = decodeCursor(cursor);

  let cursorSql = '';
  if (cursorObj?.likedAt && cursorObj?.id) {
    const likedAt = cursorObj.likedAt;
    const id = cursorObj.id;

    replacements.likedAt = likedAt;
    replacements.id = id;
    cursorSql = `
        AND (
          rl.createdAt < :likedAt
          OR (rl.createdAt = :likedAt AND r.id < :id)
        )
      `;
  }

  const rows = await sequelize.query(
    `SELECT
      r.id, r.name, r.main_image_url, r.road_address, r.jibun_address,
      r.sido, r.sigugun, r.dongmyun, rl.createdAt AS likedAt
    FROM restaurant_likes rl
    INNER JOIN restaurants r ON r.id = rl.restaurant_id
    WHERE rl.user_id = :userId
    ${cursorSql}
    ORDER BY rl.createdAt DESC, r.id DESC
    LIMIT :limit`,
    { type: QueryTypes.SELECT, replacements },
  );

  const hasMore = rows.length > LIMIT;
  const sliced = hasMore ? rows.slice(0, LIMIT) : rows;

  const last = sliced[sliced.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ likedAt: last.likedAt, id: last.id })
      : null;

  return { rows: sliced, hasMore, nextCursor };
}

export async function getMyRestaurants(userId) {
  return Restaurant.findAll({
    where: { owner_id: userId },
    attributes: [
      'id',
      'name',
      'branch_info',
      'category',
      'main_image_url',
      'road_address',
      'jibun_address',
      'parking_info',
      'takeout',
      'delivery',
      'reservation',
    ],
    order: [['id', 'DESC']],
  });
}
