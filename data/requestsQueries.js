import { Op } from 'sequelize';
import { RestaurantRequest } from './restaurantRequest.js';
import { User } from './user.js';
import { Restaurant } from './restaurant.js';
import { sequelize } from '../db/database.js';

export async function findAdminRequests({
  status = 'pending',
  limit = 50,
  cursor,
} = {}) {
  const where = {};
  if (status) where.status = status;

  if (cursor) {
    where.createdAt = { [Op.lt]: new Date(cursor) };
  }

  const rows = await RestaurantRequest.findAll({
    where,
    include: [
      {
        model: User,
        as: 'requester',
        attributes: ['id', 'username', 'name', 'profile_image_url'],
        required: false,
      },
      {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username', 'name'],
        required: false,
      },
    ],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? sliced[sliced.length - 1].createdAt.toISOString()
    : null;

  return { rows: sliced, hasMore, nextCursor };
}

export async function approveRequest(requestId, adminUserId) {
  return sequelize.transaction(async (t) => {
    const reqRow = await RestaurantRequest.findOne({
      where: { id: requestId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!reqRow) {
      const err = new Error('NOT_FOUND');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (reqRow.status !== 'pending') {
      const err = new Error('NOT_PENDING');
      err.code = 'NOT_PENDING';
      throw err;
    }

    const restaurant = await Restaurant.create(
      {
        name: reqRow.name,
        category: reqRow.category,
        branch_info: reqRow.branch_info ?? null,
        main_image_url: reqRow.main_image_url || '/images/흠.png',
        sido: reqRow.sido,
        sigugun: reqRow.sigugun,
        dongmyun: reqRow.dongmyun,
        road_address: reqRow.road_address ?? null,
        jibun_address: reqRow.jibun_address ?? null,
        phone: reqRow.phone ?? null,
        description: reqRow.description ?? null,
        lat: reqRow.lat ?? null,
        lng: reqRow.lng ?? null,
        created_by: reqRow.requested_by ?? null,
      },
      { transaction: t }
    );

    reqRow.status = 'approved';
    reqRow.reviewed_by = adminUserId;
    reqRow.reviewed_at = new Date();
    reqRow.approved_restaurant_id = restaurant.id;

    await reqRow.save({ transaction: t });

    return { requestId: reqRow.id, restaurantId: restaurant.id };
  });
}

export async function rejectRequest(requestId, adminUserId, reason) {
  return sequelize.transaction(async (t) => {
    const reqRow = await RestaurantRequest.findOne({
      where: { id: requestId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!reqRow) {
      const err = new Error('NOT_FOUND');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (reqRow.status !== 'pending') {
      const err = new Error('NOT_PENDING');
      err.code = 'NOT_PENDING';
      throw err;
    }

    const imageUrl = reqRow.main_image_url;

    reqRow.status = 'rejected';
    reqRow.reviewed_by = adminUserId;
    reqRow.reviewed_at = new Date();
    reqRow.reject_reason = (reason ?? '').trim() || '사유 없음';
    reqRow.main_image_url = null;

    await reqRow.save({ transaction: t });

    return { requestId: reqRow.id, imageUrl };
  });
}
