import jwt from 'jsonwebtoken';
import * as userRepository from '../data/user.js';
import { config } from '../config.js';

export async function optionalAuth(req, res, next) {
  const authHeader = req.get('Authorization');
  if (!(authHeader && authHeader.startsWith('Bearer '))) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secretKey);
    const user = await userRepository.findById(decoded.id);
    if (user && user.status === 'active') {
      req.userId = user.id;
    }
  } catch (err) {}

  next();
}
