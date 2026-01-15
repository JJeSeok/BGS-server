import { User } from '../data/user.js';

export async function isAdmin(req, res, next) {
  try {
    const me = await User.findByPk(req.userId, { attributes: ['id', 'role'] });
    if (!me || me.role !== 'admin') {
      return res.status(403).json({ message: '관리자만 접근할 수 있습니다.' });
    }
    next();
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '권한 확인 중 오류가 발생했습니다.' });
  }
}
