import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function optionalAuth(req, res, next) {
  const authHeader = req.get('Authorization');
  if (!(authHeader && authHeader.startsWith('Bearer '))) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secretKey);
    req.userId = decoded.id;
  } catch (err) {}

  next();
}
