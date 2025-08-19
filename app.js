import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import 'express-async-errors';
import restaurantsRouter from './router/restaurants.js';
import userRouter from './router/users.js';
import { sequelize } from './db/database.js';
import { scheduleCleanup } from './jobs/cleanupPasswordResets.js';
import { config } from './config.js';

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));

app.use('/restaurants', restaurantsRouter);
app.use('/users', userRouter);

app.use((req, res, next) => {
  res.sendStatus(404);
});

app.use((error, req, res, next) => {
  console.error(error);
  res.sendStatus(500);
});

scheduleCleanup();

sequelize.sync().then(() => {
  console.log(`Server is started... ${new Date()}`);
  app.listen(config.port);
});
