import * as reviewRepository from '../data/review.js';
import * as restaurantRepository from '../data/restaurant.js';

export async function createReview(req, res) {
  const restaurantId = req.params.id;
  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);
  const userId = req.userId;
  const { rating, content, photos } = req.body;

  if (!restaurant) {
    res
      .status(404)
      .json({ message: `Restaurant id(${restaurantId}) not found` });
  }
  if (!validateRating(rating)) {
    res
      .status(400)
      .json({ message: '평점은 0~5점까지 0.5점 단위로 입력하세요.' });
  }
  if (typeof content !== 'string' && content.trim().length === 0) {
    res.status(400).json({ message: '리뷰를 입력해주세요.' });
  }
  if (photos && !Array.isArray(photos)) {
    res.status(400).json({ message: 'photos must be an array of urls' });
  }

  const review = await reviewRepository.create({
    restaurant_id: restaurantId,
    user_id: userId,
    rating,
    content: content.trim(),
  });

  res.status(201).json(review);
}

function validateRating(rating) {
  return (
    typeof rating === 'number' &&
    Number.isInteger(rating) &&
    rating >= 0 &&
    rating <= 10
  );
}
