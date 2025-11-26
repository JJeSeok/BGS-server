import { Review } from './review.js';
import { ReviewImage } from './reviewImage.js';
import { User } from './user.js';

export async function getAllByRestaurantId(restaurant_id) {
  const reviews = await Review.findAll({
    where: { restaurant_id },
    include: [
      {
        model: ReviewImage,
        as: 'images',
        attributes: ['id', 'url', 'width', 'height', 'sort_order'],
        required: false,
        order: [['sort_order', 'ASC']],
        separate: true,
      },
      {
        model: User,
        attributes: ['id', 'name'],
        required: true,
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return reviews;
}
