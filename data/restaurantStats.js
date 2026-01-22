import { QueryTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

function categoryFromRating(rating) {
  if (rating >= 7) return 'good';
  if (rating >= 3) return 'ok';
  return 'bad';
}

function categoryColumn(category) {
  if (category === 'good') return 'good_count';
  if (category === 'ok') return 'ok_count';
  return 'bad_count';
}

export async function increaseReview({ restaurantId, rating, transaction }) {
  const category = categoryFromRating(rating);
  const col = categoryColumn(category);

  await sequelize.query(
    `
    UPDATE restaurants
    SET
      review_count = (@newCount := review_count + 1),
      rating_sum = (@newSum := rating_sum + :rating),
      rating_avg = ROUND((@newSum / @newCount) / 2, 1),
      ${col} = ${col} + 1
    WHERE id = :restaurantId
    `,
    {
      type: QueryTypes.UPDATE,
      transaction,
      replacements: { restaurantId, rating },
    },
  );
}

export async function decreaseReview({ restaurantId, rating, transaction }) {
  const category = categoryFromRating(rating);
  const col = categoryColumn(category);

  await sequelize.query(
    `
    UPDATE restaurants
    SET
      review_count = (@newCount := CASE WHEN review_count <= 1 THEN 0 ELSE review_count - 1 END),
      rating_sum = (@newSum := CASE WHEN rating_sum < :rating THEN 0 ELSE rating_sum - :rating END),
      rating_avg = CASE WHEN review_count <= 1 THEN 0.0 ELSE ROUND((@newSum / @newCount) / 2, 1) END,
      ${col} = GREATEST(${col} - 1, 0)
    WHERE id = :restaurantId
    `,
    {
      type: QueryTypes.UPDATE,
      transaction,
      replacements: { restaurantId, rating },
    },
  );
}

export async function changeReviewRating({
  restaurantId,
  oldRating,
  newRating,
  transaction,
}) {
  const oldCat = categoryFromRating(oldRating);
  const oldCol = categoryColumn(oldCat);

  const newCat = categoryFromRating(newRating);
  const newCol = categoryColumn(newCat);

  const categorySql =
    oldCat === newCat
      ? ''
      : `, ${oldCol} = GREATEST(${oldCol} - 1, 0), ${newCol} = ${newCol} + 1`;

  await sequelize.query(
    `
    UPDATE restaurants
    SET
      rating_sum = (@newSum := rating_sum - :oldRating + :newRating),
      rating_avg = CASE WHEN review_count <=  0 THEN 0.0 ELSE ROUND((@newSum / review_count) / 2, 1) END
      ${categorySql}
    WHERE id = :restaurantId
    `,
    {
      type: QueryTypes.UPDATE,
      transaction,
      replacements: { restaurantId, oldRating, newRating },
    },
  );
}
