import crypto from 'crypto';

export const genCode = () => String(crypto.randomInt(100000, 1000000));
export const genSalt = () => crypto.randomBytes(8).toString('hex');
export const hashCode = (code, salt) =>
  crypto.createHmac('sha256', salt).update(code).digest('hex');
