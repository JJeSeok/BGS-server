import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

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
  },
  { timestamps: false }
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

export async function findById(id) {
  return User.findByPk(id);
}
