import { Restaurant } from './restaurant.js';
import { RestaurantPhoto } from './restaurantPhoto.js';
import { Review } from './review.js';
import { User } from './user.js';
import { ReviewImage } from './reviewImage.js';
import { ReviewReaction } from './reviewReaction.js';
import { RestaurantLike } from './restaurantLike.js';
import { UserBlock } from './userBlock.js';
import { RestaurantRequest } from './restaurantRequest.js';
import { RestaurantCohortStat } from './restaurantCohortStat.js';

RestaurantPhoto.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Restaurant.hasMany(RestaurantPhoto, { foreignKey: 'restaurant_id' });

Review.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Restaurant.hasMany(Review, { foreignKey: 'restaurant_id' });

Review.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(Review, { foreignKey: 'user_id' });

ReviewImage.belongsTo(Review, {
  foreignKey: 'review_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Review.hasMany(ReviewImage, { foreignKey: 'review_id', as: 'images' });

ReviewReaction.belongsTo(Review, {
  foreignKey: 'review_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Review.hasMany(ReviewReaction, { foreignKey: 'review_id' });

ReviewReaction.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(ReviewReaction, { foreignKey: 'user_id' });

RestaurantLike.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(RestaurantLike, { foreignKey: 'user_id' });

RestaurantLike.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Restaurant.hasMany(RestaurantLike, { foreignKey: 'restaurant_id' });

UserBlock.belongsTo(User, {
  as: 'Blocker',
  foreignKey: 'blocker_user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
UserBlock.belongsTo(User, {
  as: 'Blocked',
  foreignKey: 'blocked_user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

User.hasMany(UserBlock, { as: 'Blocking', foreignKey: 'blocker_user_id' });
User.hasMany(UserBlock, { as: 'BlockedBy', foreignKey: 'blocked_user_id' });

RestaurantRequest.belongsTo(User, {
  foreignKey: 'requested_by',
  as: 'requester',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
RestaurantRequest.belongsTo(User, {
  foreignKey: 'reviewed_by',
  as: 'reviewer',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

RestaurantCohortStat.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Restaurant.hasMany(RestaurantCohortStat, { foreignKey: 'restaurant_id' });
