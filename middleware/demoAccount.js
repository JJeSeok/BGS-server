import { config } from '../config.js';

export function preventDemoAccountMutation(req, res, next) {
  if (req.user?.username === config.demoAccount.username) {
    return res.status(403).json({
      message: '데모 계정의 회원정보는 변경하거나 삭제할 수 없습니다.',
    });
  }

  next();
}
