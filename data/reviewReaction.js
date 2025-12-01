import { DataTypes, Op, fn, col } from 'sequelize';
import { sequelize } from '../db/database.js';

export const ReviewReaction = sequelize.define(
  'review_reaction',
  {
    review_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('like', 'dislike'),
      allowNull: false,
    },
  },
  {
    indexes: [{ fields: ['review_id', 'type'] }],
  }
);

export async function findByReviewAndUser(review_id, user_id) {
  return ReviewReaction.findOne({ where: { review_id, user_id } });
}

export async function toggleReaction(review_id, user_id, type) {
  return sequelize.transaction(async (t) => {
    const existing = await ReviewReaction.findOne({
      where: { review_id, user_id },
      transaction: t,
    });

    if (!existing) {
      await ReviewReaction.create(
        { review_id, user_id, type },
        { transaction: t }
      );
      return { userReaction: type };
    }

    if (existing.type === type) {
      await existing.destroy({ transaction: t });
      return { userReaction: null };
    }

    existing.type = type;
    await existing.save({ transaction: t });
    return { userReaction: type };
  });
}

export async function getCountsByReviewId(review_id) {
  const [likeCount, dislikeCount] = await Promise.all([
    ReviewReaction.count({ where: { review_id, type: 'like' } }),
    ReviewReaction.count({ where: { review_id, type: 'dislike' } }),
  ]);

  return { likeCount, dislikeCount };
}

export async function getCountsForReviews(reviewIds) {
  if (!reviewIds.length) return {};

  const rows = await ReviewReaction.findAll({
    attributes: ['review_id', 'type', [fn('COUNT', col('*')), 'cnt']],
    where: { review_id: { [Op.in]: reviewIds } },
    group: ['review_id', 'type'],
    raw: true,
  });

  const map = {};
  for (const row of rows) {
    const id = row.review_id;
    if (!map[id]) {
      map[id] = { likeCount: 0, dislikeCount: 0 };
    }
    if (row.type === 'like') {
      map[id].likeCount = Number(row.cnt);
    } else if (row.type === 'dislike') {
      map[id].dislikeCount = Number(row.cnt);
    }
  }

  return map;
}

export async function getUserReactionsForReviews(reviewIds, user_id) {
  if (!reviewIds.length || !user_id) return {};

  const rows = await ReviewReaction.findAll({
    attributes: ['review_id', 'type'],
    where: { review_id: { [Op.in]: reviewIds }, user_id },
    raw: true,
  });

  const map = {};
  for (const row of rows) {
    map[row.review_id] = row.type;
  }

  return map;
}
