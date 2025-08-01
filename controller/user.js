import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as userRepository from '../data/user.js';
import { config } from '../config.js';

export async function signup(req, res) {
  const {
    username,
    password,
    confirmPassword,
    name,
    birth,
    gender,
    email,
    phone,
  } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  const foundUsername = await userRepository.findByUsername(username);
  if (foundUsername) {
    return res.status(409).json({ message: `${username} already exists` });
  }
  const foundEmail = await userRepository.findByEmail(email);
  if (foundEmail) {
    return res.status(409).json({ message: `${email} already exists` });
  }
  const foundPhone = await userRepository.findByPhone(phone);
  if (foundPhone) {
    return res.status(409).json({ message: `${phone} already exists` });
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
    return res.status(401).json({ message: 'Invalid user or password' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid user or password' });
  }

  const token = createJwtToken(user.id);
  res.status(201).json({ token, username });
}

function createJwtToken(id) {
  return jwt.sign({ id }, config.jwt.secretKey, {
    expiresIn: config.jwt.expiresInSec,
  });
}

export async function me(req, res) {
  const user = await userRepository.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(200).json({ token: req.token, username: user.username }); // token을 사용하는지 username이 아닌 다른 정보가 필요한지 확인하기
}
