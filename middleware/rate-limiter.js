import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export const pwdLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.limit,
  standardHeaders: 'draft-8',
});
