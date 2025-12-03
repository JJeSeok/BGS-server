import { sequelize } from '../db/database.js';
import * as reviewRepository from '../data/review.js';
import * as restaurantRepository from '../data/restaurant.js';
import * as reviewImageRepository from '../data/reviewImage.js';
import * as reviewQueries from '../data/reviewQueries.js';
import * as reviewReactionRepository from '../data/reviewReaction.js';

export async function getReviews(req, res) {
  const { restaurantId, userId } = req.query;
  if (!restaurantId && !userId) {
    return res.status(404).json({ message: '리뷰를 찾을 수 없습니다.' });
  }

  if (restaurantId) {
    const reviews = await reviewQueries.getAllByRestaurantId(restaurantId);
    if (!reviews || reviews.length === 0) {
      return res.status(404).json({ message: '리뷰를 찾을 수 없습니다.' });
    }

    const baseDtos = toReviewDTO(reviews);
    const reviewIds = baseDtos.map((r) => r.id);
    const [countsMap, userReactionsMap] = await Promise.all([
      reviewReactionRepository.getCountsForReviews(reviewIds),
      reviewReactionRepository.getUserReactionsForReviews(
        reviewIds,
        req.userId
      ),
    ]);

    const data = baseDtos.map((r) => {
      const counts = countsMap[r.id] ?? { likeCount: 0, dislikeCount: 0 };
      const userReaction = userReactionsMap[r.id] ?? null;

      return {
        ...r,
        likeCount: counts.likeCount,
        dislikeCount: counts.dislikeCount,
        userReaction,
      };
    });

    res.status(200).json(data);
  }
}

export async function getReview(req, res) {
  const reviewId = req.params.id;
  const review = await reviewQueries.getOneWithImages(reviewId);
  if (!review) {
    return res.status(404).json({ message: '리뷰를 찾을 수 없습니다.' });
  }

  const data = toReviewDTO([review])[0];
  res.status(200).json(data);
}

export async function createReview(req, res) {
  const userId = req.userId;
  const { restaurantId, rating, content } = req.body;
  const Rating = Number(rating);
  const restaurant = await restaurantRepository.getRestaurantById(restaurantId);

  if (!restaurant) {
    return res
      .status(404)
      .json({ message: `Restaurant id(${restaurantId}) not found` });
  }
  if (!validateRating(Rating)) {
    return res
      .status(400)
      .json({ message: '평점은 0~5점까지 0.5점 단위로 입력하세요.' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ message: '리뷰를 입력해주세요.' });
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

export async function updateReview(req, res) {
  const reviewId = req.params.id;
  const userId = req.userId;
  const { rating, content } = req.body;
  const Rating = Number(rating);

  if (!validateRating(Rating)) {
    return res
      .status(400)
      .json({ message: '평점은 0~5점까지 0.5점 단위로 입력하세요.' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ message: '리뷰를 입력해주세요.' });
  }

  try {
    const updated = await reviewQueries.updateReviewWithImages(
      reviewId,
      userId,
      {
        rating: Rating,
        content,
        deletedImageIds: req.body.deletedImageIds || [],
      },
      req.files || []
    );

    if (!updated) {
      return res
        .status(403)
        .json({ message: '리뷰를 수정할 권한이 없거나 존재하지 않습니다.' });
    }

    return res.sendStatus(204);
  } catch (err) {
    console.error(err);
    if (err.message === 'MAX_IMAGES_EXCEEDED') {
      return res
        .status(400)
        .json({ message: '이미지는 최대 30장까지 등록할 수 있습니다.' });
    }
    return res
      .status(500)
      .json({ message: '리뷰 수정 중 오류가 발생했습니다.' });
  }
}

export async function deleteReview(req, res) {
  const reviewId = req.params.id;
  const userId = req.userId;

  const review = await reviewRepository.remove(reviewId, userId);
  if (!review) {
    return res
      .status(403)
      .json({ message: '리뷰를 삭제할 권한이 없거나 존재하지 않습니다.' });
  }

  res.sendStatus(204);
}

export async function toggleReviewReaction(req, res) {
  const reviewId = req.params.id;
  const userId = req.userId;

  const { type } = req.body;

  if (!['like', 'dislike'].includes(type)) {
    return res
      .status(400)
      .json({ message: 'type은 like 또는 dislike 이어야 합니다.' });
  }

  try {
    const review = await reviewRepository.getReviewById(reviewId);
    if (!review) {
      return res.status(404).json({ message: '리뷰를 찾을 수 없습니다.' });
    }

    const { userReaction } = await reviewReactionRepository.toggleReaction(
      reviewId,
      userId,
      type
    );

    const { likeCount, dislikeCount } =
      await reviewReactionRepository.getCountsByReviewId(reviewId);

    res.status(200).json({
      reviewId: Number(reviewId),
      userReaction,
      likeCount,
      dislikeCount,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '리뷰 반응 저장 중 오류가 발생했습니다.' });
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

function toReviewDTO(reviews) {
  return reviews.map((r) => {
    return {
      id: r.id,
      restaurantId: r.restaurant_id,
      userId: r.user_id,
      userName: r.user.name,
      rating: r.rating,
      ratingCategory: r.ratingCategory,
      content: r.content,
      createdAt: r.createdAt,
      images: (r.images || []).map((img) => ({
        id: img.id,
        url: img.url,
        width: img.width,
        height: img.height,
        sortOrder: img.sort_order,
      })),
    };
  });
}
