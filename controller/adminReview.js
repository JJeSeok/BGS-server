import * as reviewQueries from '../data/reviewQueries.js';

export async function getAdminReviews(req, res) {
  const q = req.query.q ?? null;
  const cursor = req.query.cursor ?? null;

  try {
    const { rows, hasMore, nextCursor } =
      await reviewQueries.getAdminReviewsKeyset({ q, cursor });

    return res.status(200).json({
      meta: { hasMore, nextCursor },
      data: rows.map(toAdminReviewDTO),
    });
  } catch (err) {
    if (err.code === 'INVALID_CURSOR') {
      return res.status(400).json({ message: 'Invalid cursor.' });
    }

    console.error(err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch admin reviews.' });
  }
}

function toAdminReviewDTO(row) {
  return {
    id: row.id,
    content: row.content,
    rating: row.rating,
    createdAt: row.createdAt,
    user: {
      id: row.userId,
      username: row.username,
      name: row.userName,
    },
    restaurant: {
      id: row.restaurantId,
      name: row.restaurantName,
      address: row.restaurantAddress,
    },
    imageCount: Number(row.imageCount ?? 0),
    images: (row.images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      sortOrder: img.sortOrder,
    })),
    likeCount: Number(row.likeCount ?? 0),
    dislikeCount: Number(row.dislikeCount ?? 0),
  };
}
