const AUTH_ERROR = { message: 'Authentication Error' };
const ADMIN_ERROR = { message: 'Admin access required' };

export function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json(AUTH_ERROR);
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json(ADMIN_ERROR);
  }

  next();
}
