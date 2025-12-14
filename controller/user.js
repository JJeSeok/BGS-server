import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as userRepository from '../data/user.js';
import * as pwResetRepository from '../data/passwordReset.js';
import * as reviewRepository from '../data/review.js';
import * as restaurantRepository from '../data/restaurant.js';
import { genCode, genSalt, hashCode } from '../utils/otp.js';
import { sendMail } from '../utils/mailer.js';
import { config } from '../config.js';

export async function signup(req, res) {
  const { username, password, name, birth, gender, email, phone } = req.body;

  const foundUsername = await userRepository.findByUsername(username);
  if (foundUsername) {
    return res
      .status(409)
      .json({ field: 'username', message: '아이디가 이미 존재합니다.' });
  }
  const foundEmail = await userRepository.findByEmail(email);
  if (foundEmail) {
    return res
      .status(409)
      .json({ field: 'email', message: '이메일이 이미 존재합니다.' });
  }
  const foundPhone = await userRepository.findByPhone(phone);
  if (foundPhone) {
    return res
      .status(409)
      .json({ field: 'phone', message: '전화번호가 이미 존재합니다.' });
  }

  const hashed = await bcrypt.hash(password, config.bcrypt.saltRounds);
  const userId = await userRepository.create({
    username,
    password: hashed,
    name,
    birth: new Date(birth),
    gender,
    email,
    phone,
  });

  const token = createJwtToken(userId);
  res.status(201).json({ token, username });
}

export async function login(req, res) {
  const { username, password } = req.body;
  const user = await userRepository.findByUsername(username);
  if (!user) {
    return res
      .status(401)
      .json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res
      .status(401)
      .json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = createJwtToken(user.id);
  res.status(201).json({ token, username });
}

export function logout(req, res) {
  res.sendStatus(204);
}

function createJwtToken(id) {
  return jwt.sign({ id }, config.jwt.secretKey, {
    expiresIn: config.jwt.expiresInSec,
  });
}

export async function forgotId_phone(req, res) {
  const { name, phone } = req.body;
  const user = await userRepository.findByPhone(phone);
  if (!user || user.name !== name) {
    return res
      .status(401)
      .json({ message: '가입 시 입력하신 회원 정보가 맞는지 확인해 주세요.' });
  }

  res.status(200).json({ username: user.username });
}

export async function forgotId_email(req, res) {
  const { name, email } = req.body;
  const user = await userRepository.findByEmail(email);
  if (!user || user.name !== name) {
    return res
      .status(401)
      .json({ message: '가입 시 입력하신 회원 정보가 맞는지 확인해 주세요.' });
  }

  res.status(200).json({ username: user.username });
}

export async function forgotPasswordRequest(req, res) {
  const { username, email } = req.body;
  const user = await userRepository.findByEmail(email);
  if (!user || user.username !== username) {
    return res
      .status(401)
      .json({ message: '가입 시 입력하신 회원 정보가 맞는지 확인해 주세요.' });
  }

  const code = genCode();
  const salt = genSalt();
  const codeHash = hashCode(code, salt);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pwResetRepository.create({
    username,
    email,
    codeHash,
    salt,
    expiresAt,
    attemptsLeft: 5,
    ip: req.ip,
    ua: req.headers['user-agent'],
  });

  await sendMail({
    to: email,
    subject: `[${config.mailer.appName}] 비밀번호 재설정 인증코드`,
    text: `${config.mailer.appName} 인증코드: ${code} (10분 이내 입력)`,
    html: `<p>인증코드: <b>${code}</b></p> <p>(10분 이내 입력하세요.)</p>`,
  });

  return res
    .status(200)
    .json({ message: '이메일을 보냈어요. 인증코드를 확인하세요.' });
}

export async function forgotPasswordVerify(req, res) {
  const { email, code } = req.body;
  const pr = await pwResetRepository.getCodeInfo(email);
  if (!pr || pr.expiresAt < new Date() || pr.attemptsLeft <= 0) {
    return res.status(400).json({ message: '코드가 유효하지 않습니다.' });
  }

  if (hashCode(code, pr.salt) !== pr.codeHash) {
    await pwResetRepository.decreaseAttempt(pr);
    return res.status(400).json({ message: '코드가 유효하지 않습니다.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExp = new Date(Date.now() + 15 * 60 * 1000);
  await pwResetRepository.setResetToken(pr, {
    usedAt: new Date(),
    resetToken,
    resetExp,
  });

  return res.json({ resetToken });
}

export async function forgotPasswordReset(req, res) {
  const { resetToken, newPassword } = req.body;
  const pr = await pwResetRepository.getResetToken(resetToken);
  if (!pr || pr.resetExp < new Date()) {
    return res.status(400).json({
      message: '재설정에 실패했습니다. 코드가 만료되었을 수 있습니다.',
    });
  }

  const user = await userRepository.findByUsername(pr.username);
  const isValidPassword = await bcrypt.compare(newPassword, user.password);
  if (isValidPassword) {
    return res
      .status(400)
      .json({ message: '이전 비밀번호를 그대로 사용할 수 없습니다.' });
  }

  const hashed = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await userRepository.updatePassword(user, { password: hashed });
  await pwResetRepository.deleteToken(pr, { resetToken: null, resetExp: null });

  return res.status(200).json({ message: '비밀번호가 재설정되었습니다.' });
}

export async function me(req, res) {
  const user = await userRepository.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(200).json({ id: user.id, username: user.username });
}

export async function getMyProfile(req, res) {
  const user = await userRepository.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json(user);
}

export async function checkMyPassword(req, res) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
  }

  const user = await userRepository.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
  }

  return res.sendStatus(200);
}

export async function updateMyProfile(req, res) {
  const { currentPassword, newPassword, name, email, phone, gender, birth } =
    req.body;
  if (!currentPassword) {
    return res.status(400).json({ message: '현재 비밀번호가 필요합니다.' });
  }

  const user = await userRepository.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (gender) updateData.gender = gender;
  if (birth) updateData.birth = birth;

  if (newPassword) {
    updateData.password = await bcrypt.hash(
      newPassword,
      config.bcrypt.saltRounds
    );
  }

  const updated = await userRepository.update(req.userId, updateData);

  res.status(200).json({
    id: updated.id,
    username: updated.username,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    gender: updated.gender,
    birth: updated.birth,
  });
}

export async function getVisitedRestaurants(req, res) {
  const user = await userRepository.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const restaurantIds = await reviewRepository.findRestaurantIdsByUserId(
    req.userId
  );

  const uniqueIds = [...new Set(restaurantIds)];
  if (uniqueIds.length === 0) return res.status(200).json([]);

  const restaurants = await restaurantRepository.findByIds(uniqueIds);
  const data = restaurants.map((r) => ({
    id: r.id,
    name: r.name,
    mainImageUrl: r.main_image_url,
    address: {
      road: r.road_address,
      jibun: r.jibun_address,
      sido: r.sido,
      sigugun: r.sigugun,
      dongmyun: r.dongmyun,
    },
  }));

  res.status(200).json(data);
}
