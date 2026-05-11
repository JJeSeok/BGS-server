import * as userRepository from '../data/user.js';

export async function getAdminUsers(req, res) {
  const q = req.query.q ?? null;
  const status = req.query.status ?? null;
  const cursor = req.query.cursor ?? null;

  try {
    const { rows, hasMore, nextCursor } = await userRepository.findAdminUsers({
      q,
      status,
      cursor,
    });

    return res.status(200).json({
      meta: { hasMore, nextCursor },
      data: rows.map((row) => toAdminUserDTO(row, req.userId)),
    });
  } catch (err) {
    if (err.code === 'INVALID_CURSOR') {
      return res.status(400).json({ message: 'Invalid cursor.' });
    }
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch admin users.' });
  }
}

export async function updateAdminUserStatus(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  const status = req.body?.status;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  if (userId === req.userId && status === 'suspended') {
    return res.status(409).json({ message: 'Cannot suspend yourself.' });
  }

  try {
    const user = await userRepository.updateStatus(userId, status);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ data: toAdminUserDTO(user, req.userId) });
  } catch (err) {
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    console.error(err);
    return res.status(500).json({ message: 'Failed to update user status.' });
  }
}

function toAdminUserDTO(user, meId) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    status: user.status,
    suspendedAt: user.suspended_at,
    isMe: user.id === meId,
  };
}
