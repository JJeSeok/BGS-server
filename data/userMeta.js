import { QueryTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export async function getReviewMetaByUserId(userId) {
  const sql = `
    SELECT
      COUNT(DISTINCT r.id) AS totalCount,
      COALESCE(SUM(CASE WHEN rr.type = 'like' THEN 1 ELSE 0 END), 0) AS totalLikeCount,
      COALESCE(SUM(CASE WHEN rr.type = 'dislike' THEN 1 ELSE 0 END), 0) AS totalDislikeCount
    FROM reviews r
    LEFT JOIN review_reactions rr ON rr.review_id = r.id
    WHERE r.user_id = :userId
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { userId },
  });

  const row = rows?.[0] ?? {};

  return {
    totalCount: Number(row.totalCount ?? 0),
    totalLikeCount: Number(row.totalLikeCount ?? 0),
    totalDislikeCount: Number(row.totalDislikeCount ?? 0),
  };
}

export async function getVisitedRestaurantMetaByUserId(userId) {
  const sql = `
    SELECT COUNT(DISTINCT restaurant_id) AS totalCount
    FROM reviews
    WHERE user_id = :userId
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { userId },
  });

  const row = rows?.[0] ?? {};

  return {
    totalCount: Number(row.totalCount ?? 0),
  };
}
