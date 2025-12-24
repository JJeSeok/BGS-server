import { Restaurant } from './restaurant.js';
import { Review } from './review.js';
import { ReviewImage } from './reviewImage.js';

export async function deleteRestaurant(restaurantId) {
  const rows = await ReviewImage.findAll({
    include: [
      {
        model: Review,
        attributes: [],
        where: { restaurant_id: restaurantId },
        required: true,
      },
    ],
    attributes: ['url'],
    raw: true,
  });

  const deletedImageUrls = rows.map((r) => r.url).filter(Boolean);

  const deletedCount = await Restaurant.destroy({
    where: { id: restaurantId },
  });

  return {
    deleted: deletedCount > 0,
    deletedImageUrls: deletedCount > 0 ? deletedImageUrls : [],
  };
}
