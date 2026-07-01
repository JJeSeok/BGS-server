import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import multer from 'multer';
import 'express-async-errors';
import restaurantsRouter from './router/restaurants.js';
import userRouter from './router/users.js';
import reviewsRouter from './router/reviews.js';
import restaurantRequestsRouter from './router/restaurantRequests.js';
import adminRouter from './router/admin.js';
import { sequelize } from './db/database.js';
import { scheduleCleanup } from './jobs/cleanupPasswordResets.js';
import { config } from './config.js';
import './data/association.js';

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors({ origin: config.cors.allowOrigin }));
app.use(morgan('tiny'));

app.use(
  '/uploads',
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
);

app.use(
  '/uploads',
  express.static(path.resolve(config.upload.dir), {
    maxAge: '7d',
    immutable: true,
  }),
);

app.use('/restaurants', restaurantsRouter);
app.use('/users', userRouter);
app.use('/reviews', reviewsRouter);
app.use('/restaurant-requests', restaurantRequestsRouter);
app.use('/admin', adminRouter);

app.use((req, res, next) => {
  res.sendStatus(404);
});

app.use((error, req, res, next) => {
  if (error.message === 'ONLY_IMAGE') {
    return res
      .status(400)
      .json({ message: '이미지 파일만 업로드할 수 있습니다.' });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ message: '이미지 파일은 최대 5MB까지 업로드할 수 있습니다.' });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res
        .status(400)
        .json({ message: '업로드 가능한 이미지 개수를 초과했습니다.' });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res
        .status(400)
        .json({ message: '허용되지 않은 파일 필드입니다.' });
    }

    return res
      .status(400)
      .json({ message: '파일 업로드 요청이 올바르지 않습니다.' });
  }

  console.error(error);
  return res.sendStatus(500);
});

scheduleCleanup();

sequelize.sync().then(() => {
  console.log(`Server is started... ${new Date()}`);
  app.listen(config.port);
});
