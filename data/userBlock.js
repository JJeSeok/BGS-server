import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../db/database.js';

export const UserBlock = sequelize.define(
  'user_block',
  {
    blocker_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    blocked_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  },
);

const LIMIT = 20;

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

export async function create(blocker_user_id, blocked_user_id) {
  return UserBlock.create({ blocker_user_id, blocked_user_id });
}

export async function remove(blocker_user_id, blocked_user_id) {
  return UserBlock.destroy({ where: { blocker_user_id, blocked_user_id } });
}

export async function existsBlock(blocker_user_id, blocked_user_id) {
  const row = await UserBlock.findOne({
    where: { blocker_user_id, blocked_user_id },
  });
  return !!row;
}

export async function getBlockedUserIds(blocker_user_id) {
  const rows = await UserBlock.findAll({
    attributes: ['blocked_user_id'],
    where: { blocker_user_id },
  });
  return rows.map((r) => r.blocked_user_id);
}

export async function getBlockedUsers(blocker_user_id, cursor) {
  const where = { blocker_user_id };
  const cursorObj = decodeCursor(cursor);

  if (cursorObj?.blockedAt && cursorObj?.id) {
    const blockedAt = new Date(cursorObj.blockedAt);
    const id = Number(cursorObj.id);

    if (!Number.isNaN(blockedAt.getTime()) && Number.isFinite(id)) {
      where[Op.or] = [
        { created_at: { [Op.lt]: blockedAt } },
        { created_at: blockedAt, blocked_user_id: { [Op.lt]: id } },
      ];
    }
  }

  const rows = await UserBlock.findAll({
    where,
    include: [
      {
        association: 'Blocked',
        attributes: ['id', 'name', 'profile_image_url'],
      },
    ],
    order: [
      ['created_at', 'DESC'],
      ['blocked_user_id', 'DESC'],
    ],
    limit: LIMIT + 1,
  });

  const hasMore = rows.length > LIMIT;
  const sliced = hasMore ? rows.slice(0, LIMIT) : rows;

  const last = sliced[sliced.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          blockedAt: last.created_at.toISOString(),
          id: last.blocked_user_id,
        })
      : null;

  return { rows: sliced, hasMore, nextCursor };
}
