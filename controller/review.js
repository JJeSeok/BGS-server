import { sequelize } from '../db/database.js';
import * as reviewRepository from '../data/review.js';
import * as reviewImageRepository from '../data/reviewImage.js';
import * as restaurantRepository from '../data/restaurant.js';

export async function createReview(req, res) {
  const userId = req.userId;
  const { restaurantId, rating, content } = req.body;
  const Rating = Number(rating);
  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);

  if (!restaurant) {
    res
      .status(404)
      .json({ message: `Restaurant id(${restaurantId}) not found` });
  }
  if (!validateRating(Rating)) {
    res
      .status(400)
      .json({ message: '평점은 0~5점까지 0.5점 단위로 입력하세요.' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ message: '리뷰를 입력해주세요.' });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const review = await reviewRepository.create(
        {
          restaurant_id: restaurantId,
          user_id: userId,
          rating: Rating,
          content: content.trim(),
        },
        t
      );

      if (req.files && req.files.length > 0) {
        const images = req.files.map((file, index) => ({
          review_id: review.id,
          url: `/uploads/reviews/${file.filename}`,
          sort_order: index + 1,
        }));
        await reviewImageRepository.create(images, t);
      }

      return review;
    });

    return res.status(201).json({
      id: result.id,
      restaurantId: result.restaurant_id,
      rating: result.rating,
      content: result.content,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '리뷰 저장 중 오류가 발생했습니다.' });
  }
}

function validateRating(Rating) {
  return (
    typeof Rating === 'number' &&
    Number.isInteger(Rating) &&
    Rating >= 0 &&
    Rating <= 10
  );
}
