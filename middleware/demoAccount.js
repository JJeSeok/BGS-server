import { config } from '../config.js';
import { safeUnlink } from '../utils/file.js';

const DEMO_ACCOUNT_MESSAGE =
  '데모 계정의 회원정보는 변경하거나 삭제할 수 없습니다.';

function sendDemoAccountError(res) {
  return res.status(403).json({ message: DEMO_ACCOUNT_MESSAGE });
}

export function preventDemoAccountMutation(req, res, next) {
  if (req.user?.username === config.demoAccount.username) {
    return sendDemoAccountError(res);
  }

  next();
}

export async function preventDemoAccountUpload(req, res, next) {
  if (req.user?.username !== config.demoAccount.username) {
    return next();
  }

  if (req.file?.path) {
    await safeUnlink(req.file.path);
  }

  return sendDemoAccountError(res);
}
