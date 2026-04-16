import { Restaurant } from '../data/restaurant.js';
import { User } from '../data/user.js';

export async function isRestaurantOwnerOrAdmin(req, res, next) {
  try {
    const restaurantId = Number(req.params.id);
    if (!Number.isFinite(restaurantId)) {
      return res
        .status(400)
        .json({ message: '레스토랑 id가 올바르지 않습니다.' });
    }

    const me = await User.findByPk(req.userId, { attributes: ['id', 'role'] });
    if (!me) {
      return res.status(401).json({ message: 'Authentication Error' });
    }
    if (me.role === 'admin') return next();

    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: ['id', 'owner_id'],
    });
    if (!restaurant) {
      return res.status(404).json({ message: '식당을 찾을 수 없습니다.' });
    }
    if (restaurant.owner_id !== req.userId) {
      return res.status(403).json({ message: '수정 권한이 없습니다.' });
    }

    next();
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '권한 확인 중 오류가 발생했습니다.' });
  }
}
