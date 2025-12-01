import { Restaurant } from './restaurant.js';
import { RestaurantPhoto } from './restaurantPhoto.js';
import { Review } from './review.js';
import { User } from './user.js';
import { ReviewImage } from './reviewImage.js';
import { ReviewReaction } from './reviewReaction.js';

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
