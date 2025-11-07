import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';
import { Review } from './review.js';
import { User } from './user.js';

const ReviewReaction = sequelize.define(
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

ReviewReaction.belongsTo(Review, { foreignKey: 'review_id' });
ReviewReaction.belongsTo(User, { foreignKey: 'user_id' });
