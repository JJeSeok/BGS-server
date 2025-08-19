import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const PasswordReset = sequelize.define(
  'passwordReset',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    codeHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    salt: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    attemptsLeft: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetToken: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    resetExp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    ua: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    indexes: [
      { fields: ['email'] },
      { fields: ['expiresAt'] },
      { fields: ['resetToken'], unique: true },
    ],
  }
);

export async function create(info) {
  return PasswordReset.create(info);
}

export async function getCodeInfo(email) {
  return PasswordReset.findOne({
    where: { email, usedAt: null },
    order: [['createdAt', 'DESC']],
  });
}

export async function decreaseAttempt(pr) {
  return pr.update({ attemptsLeft: pr.attemptsLeft - 1 });
}

export async function setResetToken(pr, updateData) {
  return pr.update({ ...updateData });
}

export async function getResetToken(resetToken) {
  return PasswordReset.findOne({ where: { resetToken } });
}

export async function deleteToken(pr, deleteDate) {
  return pr.update({ ...deleteDate });
}
