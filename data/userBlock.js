import { DataTypes } from 'sequelize';
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
  }
);

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

export async function getBlockedUsers(blocker_user_id) {
  return UserBlock.findAll({
    where: { blocker_user_id },
    include: [
      {
        association: 'Blocked',
        attributes: ['id', 'name', 'profile_image_url'],
      },
    ],
    order: [['created_at', 'DESC']],
  });
}
