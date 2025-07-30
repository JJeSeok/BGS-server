import express from 'express';
import 'express-async-errors';
import * as userController from '../controller/user.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validator.js';
import { isAuth } from '../middleware/auth.js';

const router = express.Router();

const validateCredential = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('아이디를 입력하세요.')
    .isAlphanumeric()
    .withMessage('아이디는 영문자와 숫자만 사용 가능합니다.')
    .isLength({ min: 4, max: 20 })
    .withMessage('아이디는 4~20자여야 합니다.'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('비밀번호를 입력하세요.')
    .isLength({ min: 8 })
    .withMessage('비밀번호는 최소 8자 이상이어야 합니다.')
    .matches(/[a-z]/i)
    .withMessage('알파벳을 하나 이상 포함해야 합니다.')
    .matches(/\d/)
    .withMessage('숫자를 하나 이상 포함해야 합니다.')
    .matches(/[!@#$%^&*()_\-=+\\|[\]{};:'",.<>\/?]/)
    .withMessage('특수문자를 하나 이상 포함해야 합니다.'),
  validate,
];

const validateSignup = [
  ...validateCredential,
  body('name')
    .notEmpty()
    .withMessage('이름을 입력하세요.')
    .matches(/^[가-힣a-zA-Z]{2,}$/)
    .withMessage('이름은 한글 또는 영문 2자 이상이어야 합니다.'),
  body('birth')
    .notEmpty()
    .withMessage('생년월일을 입력하세요.')
    .isISO8601()
    .withMessage('생년월일을 제대로 입력해야 합니다.')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('생년월일은 미래일 수 없습니다.');
      }
      return true;
    }),
  body('gender').notEmpty().withMessage('성별을 선택하세요.'),
  body('email')
    .notEmpty()
    .withMessage('이메일을 입력하세요.')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
  body('phone')
    .notEmpty()
    .withMessage('전화번호를 입력하세요.')
    .isMobilePhone('ko-KR')
    .withMessage('올바른 휴대폰 번호 형식이 아닙니다.')
    .customSanitizer((value) => value.replace(/-/g, '')),
  validate,
];

// POST /users/signup
router.post('/signup', validateSignup, userController.signup);

// POST /users/login
router.post('/login', validateCredential, userController.login);

// GET /users/me
router.get('/me', isAuth, userController.me);

export default router;
