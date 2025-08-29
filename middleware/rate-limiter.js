import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export const pwdLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.limit,
  standardHeaders: 'draft-8',
  handler: (req, res, next, options) => {
    const retrySec =
      Math.ceil((req.rateLimit.resetTime - new Date()) / 1000) || 60;
    res.set('Retry-After', String(retrySec));
    return res.status(429).json({
      message: `요청이 너무 많습니다. ${retrySec}초 후 다시 시도해 주세요.`,
    });
  },
});
