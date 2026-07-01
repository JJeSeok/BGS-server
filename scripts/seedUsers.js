import bcrypt from 'bcrypt';
import { sequelize } from '../db/database.js';
import { User } from '../data/user.js';
import { config } from '../config.js';

const adminPassword = requireSeedEnv('SEED_ADMIN_PASSWORD');
const demoPassword = requireSeedEnv('SEED_DEMO_PASSWORD');
const cohortPassword = createUnusedPassword();

const seedUsers = [
  {
    username: 'portfolioadmin',
    password: adminPassword,
    name: '관리자',
    birth: '1990-03-12',
    gender: 'male',
    email: 'portfolio.admin@example.com',
    phone: '01080000001',
    role: 'admin',
  },
  {
    username: 'demouser',
    password: demoPassword,
    name: '데모 사용자',
    birth: '2001-05-18',
    gender: 'female',
    email: 'demo.user@example.com',
    phone: '01080000002',
    role: 'user',
  },
  {
    username: 'seeduser01',
    password: cohortPassword,
    name: '김서연',
    birth: '2003-02-14',
    gender: 'female',
    email: 'seed.user01@example.com',
    phone: '01080000003',
    role: 'user',
  },
  {
    username: 'seeduser02',
    password: cohortPassword,
    name: '이민준',
    birth: '2000-08-21',
    gender: 'male',
    email: 'seed.user02@example.com',
    phone: '01080000004',
    role: 'user',
  },
  {
    username: 'seeduser03',
    password: cohortPassword,
    name: '박지우',
    birth: '1995-11-09',
    gender: 'male',
    email: 'seed.user03@example.com',
    phone: '01080000005',
    role: 'user',
  },
  {
    username: 'seeduser04',
    password: cohortPassword,
    name: '최도윤',
    birth: '1992-06-03',
    gender: 'female',
    email: 'seed.user04@example.com',
    phone: '01080000006',
    role: 'user',
  },
  {
    username: 'seeduser05',
    password: cohortPassword,
    name: '정하은',
    birth: '1987-04-25',
    gender: 'female',
    email: 'seed.user05@example.com',
    phone: '01080000007',
    role: 'user',
  },
  {
    username: 'seeduser06',
    password: cohortPassword,
    name: '강현우',
    birth: '1983-09-17',
    gender: 'male',
    email: 'seed.user06@example.com',
    phone: '01080000008',
    role: 'user',
  },
  {
    username: 'seeduser07',
    password: cohortPassword,
    name: '윤수빈',
    birth: '1976-12-07',
    gender: 'female',
    email: 'seed.user07@example.com',
    phone: '01080000009',
    role: 'user',
  },
  {
    username: 'seeduser08',
    password: cohortPassword,
    name: '한성민',
    birth: '1967-01-30',
    gender: 'male',
    email: 'seed.user08@example.com',
    phone: '01080000010',
    role: 'user',
  },
];

async function seed() {
  await sequelize.authenticate();

  const passwordHashes = new Map();
  for (const password of new Set(seedUsers.map((user) => user.password))) {
    passwordHashes.set(
      password,
      await bcrypt.hash(password, config.bcrypt.saltRounds),
    );
  }

  const result = await sequelize.transaction(async (transaction) => {
    let created = 0;
    let updated = 0;

    for (const seedUser of seedUsers) {
      const values = {
        ...seedUser,
        password: passwordHashes.get(seedUser.password),
        status: 'active',
        suspended_at: null,
        profile_image_url: null,
      };

      const existing = await User.findOne({
        where: { username: seedUser.username },
        transaction,
      });

      if (existing) {
        await existing.update(values, { transaction });
        updated += 1;
      } else {
        await User.create(values, { transaction });
        created += 1;
      }
    }

    return { created, updated };
  });

  console.log(
    `User seed complete: ${result.created} created, ${result.updated} updated.`,
  );
  console.log('Demo username: demouser');
}

function requireSeedEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required to run the user seed.`);
  }
  if (value.length < 8) {
    throw new Error(`${key} must be at least 8 characters.`);
  }
  return value;
}

function createUnusedPassword() {
  return `SeedOnly-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

try {
  await seed();
} catch (error) {
  console.error('User seed failed:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
