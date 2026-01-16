import * as requestQueries from '../data/requestsQueries.js';
import {
  getRestaurantRequestImageFilePath,
  safeUnlink,
} from '../utils/file.js';

export async function getAdminRestaurantRequests(req, res) {
  const status = req.query.status ?? 'pending';
  const cursor = req.query.cursor || null;
  const limit = 50;

  try {
    const { rows, hasMore, nextCursor } =
      await requestQueries.findAdminRequests({ status, limit, cursor });
    return res.status(200).json({
      meta: { hasMore, nextCursor },
      data: rows,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '관리자 요청 목록 조회 중 오류가 발생했습니다.' });
  }
}

export async function approveRestaurantRequest(req, res) {
  const requestId = Number(req.params.id);
  if (!Number.isFinite(requestId)) {
    return res.status(400).json({ message: '요청 id가 올바르지 않습니다.' });
  }

  try {
    const result = await requestQueries.approveRequest(requestId, req.userId);
    return res.status(200).json({ message: '승인되었습니다.', data: result });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ message: '요청을 찾을 수 없습니다.' });
    }
    if (err.code === 'NOT_PENDING') {
      return res.status(409).json({ message: '이미 처리된 요청입니다.' });
    }
    console.error(err);
    return res
      .status(500)
      .json({ message: '승인 처리 중 오류가 발생했습니다.' });
  }
}

export async function rejectRestaurantRequest(req, res) {
  const requestId = Number(req.params.id);
  if (!Number.isFinite(requestId)) {
    return res.status(400).json({ message: '요청 id가 올바르지 않습니다.' });
  }

  const reason = req.body?.reason;

  try {
    const result = await requestQueries.rejectRequest(
      requestId,
      req.userId,
      reason
    );

    const filePath = getRestaurantRequestImageFilePath(result.imageUrl);
    await safeUnlink(filePath);

    return res.status(200).json({ message: '반려되었습니다.', data: result });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ message: '요청을 찾을 수 없습니다.' });
    }
    if (err.code === 'NOT_PENDING') {
      return res.status(409).json({ message: '이미 처리된 요청입니다.' });
    }
    console.error(err);
    return res
      .status(500)
      .json({ message: '반려 처리 중 오류가 발생했습니다.' });
  }
}
