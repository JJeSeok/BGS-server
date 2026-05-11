import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../db/database.js';

const ADMIN_LIMIT = 50;
const USER_STATUS = new Set(['active', 'suspended']);

export const User = sequelize.define(
  'user',
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
      unique: true,
      validate: {
        notEmpty: {
          msg: '아이디를 입력하세요.',
        },
        isAlphanumeric: {
          msg: '아이디는 영문자와 숫자만 사용 가능합니다.',
        },
        len: {
          args: [4, 20],
          msg: '아이디는 4~20자여야 합니다.',
        },
      },
    },
    password: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    birth: {
      type: DataTypes.DATEONLY(128),
      allowNull: false,
      validate: {
        isDate: {
          msg: '생년월일을 제대로 입력해야 합니다.',
        },
      },
    },
    gender: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: '올바른 이메일 형식이 아닙니다.',
        },
      },
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
    },
    profile_image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    },
    suspended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { timestamps: false },
);

export async function create(user) {
  return User.create(user).then((data) => data.dataValues.id);
}

export async function findByUsername(username) {
  return User.findOne({ where: { username } });
}

export async function findByEmail(email) {
  return User.findOne({ where: { email } });
}

export async function findByPhone(phone) {
  return User.findOne({ where: { phone } });
}

export async function findById(id, { transaction } = {}) {
  return User.findByPk(id, { transaction });
}

export async function updatePassword(user, password) {
  return user.update(password);
}

export async function update(id, updateData) {
  return User.findByPk(id).then((user) => user.update(updateData));
}

export async function findAdminUsers({ q, status, cursor } = {}) {
  const where = {};

  const keyword = String(q ?? '').trim();
  if (keyword) {
    where[Op.or] = [
      { username: { [Op.like]: `%${keyword}%` } },
      { name: { [Op.like]: `%${keyword}%` } },
    ];
  }

  if (status) {
    if (!USER_STATUS.has(status)) {
      const error = new Error('INVALID_STATUS');
      error.code = 'INVALID_STATUS';
      throw error;
    }
    where.status = status;
  }

  if (cursor) {
    const id = Number(cursor);
    if (!Number.isInteger(id) || id <= 0) {
      const error = new Error('INVALID_CURSOR');
      error.code = 'INVALID_CURSOR';
      throw error;
    }
    where.id = { [Op.lt]: id };
  }

  const rows = await User.findAll({
    where,
    attributes: ['id', 'username', 'name', 'status', 'suspended_at'],
    order: [['id', 'DESC']],
    limit: ADMIN_LIMIT + 1,
  });

  const hasMore = rows.length > ADMIN_LIMIT;
  const sliced = hasMore ? rows.slice(0, ADMIN_LIMIT) : rows;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last ? String(last.id) : null;

  return { rows: sliced, hasMore, nextCursor };
}

export async function updateStatus(id, status) {
  if (!USER_STATUS.has(status)) {
    const error = new Error('INVALID_STATUS');
    error.code = 'INVALID_STATUS';
    throw error;
  }

  const user = await User.findByPk(id);
  if (!user) return null;

  return user.update({
    status,
    suspended_at: status === 'suspended' ? new Date() : null,
  });
}
