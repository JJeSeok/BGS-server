import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from '../db/database.js';
import { Restaurant } from '../data/restaurant.js';
import { RestaurantPhoto } from '../data/restaurantPhoto.js';
import { Menu } from '../data/menu.js';
import { RestaurantHour } from '../data/restaurantHour.js';
import { User } from '../data/user.js';
import { config } from '../config.js';
import { hourPresets, restaurants } from './data/restaurants.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.join(scriptDir, 'seed-assets', 'restaurants');
const uploadDir = path.join(path.resolve(config.upload.dir), 'restaurants');

async function seed() {
  validateRestaurantData();
  await ensureAssetsExist();
  await sequelize.authenticate();
  await fs.mkdir(uploadDir, { recursive: true });

  const usernames = [
    'portfolioadmin',
    ...restaurants.map((restaurant) => restaurant.ownerUsername).filter(Boolean),
  ];
  const users = await User.findAll({
    where: { username: [...new Set(usernames)] },
    attributes: ['id', 'username'],
    raw: true,
  });
  const userIds = new Map(users.map((user) => [user.username, user.id]));

  if (!userIds.has('portfolioadmin')) {
    throw new Error('Run npm run seed:users before seeding restaurants.');
  }

  const missingOwners = usernames.filter((username) => !userIds.has(username));
  if (missingOwners.length > 0) {
    throw new Error(`Missing seed users: ${[...new Set(missingOwners)].join(', ')}`);
  }

  await copyAssets();

  const result = await sequelize.transaction(async (transaction) => {
    let created = 0;
    let updated = 0;

    for (const data of restaurants) {
      const urls = buildImageUrls(data);
      const values = {
        name: data.name,
        category: data.category,
        branch_info: data.branchInfo,
        main_image_url: urls.mainImageUrl,
        sido: data.sido,
        sigugun: data.sigugun,
        dongmyun: data.dongmyun,
        road_address: data.roadAddress,
        jibun_address: data.jibunAddress,
        phone: data.phone,
        parking_info: data.parkingInfo,
        takeout: data.takeout,
        delivery: data.delivery,
        reservation: data.reservation,
        description: data.description,
        lat: data.lat,
        lng: data.lng,
        owner_id: data.ownerUsername ? userIds.get(data.ownerUsername) : null,
        created_by: userIds.get('portfolioadmin'),
        status: data.status,
        closed_at: data.status === 'closed' ? new Date() : null,
        info_updated_at: new Date(),
      };

      const [restaurant, wasCreated] = await Restaurant.findOrCreate({
        where: {
          name: data.name,
          road_address: data.roadAddress,
        },
        defaults: values,
        transaction,
      });

      if (wasCreated) {
        created += 1;
      } else {
        await restaurant.update(values, { transaction });
        updated += 1;
      }

      await replaceRestaurantDetails(restaurant.id, data, urls, transaction);
    }

    return { created, updated };
  });

  console.log(
    `Restaurant seed complete: ${result.created} created, ${result.updated} updated.`,
  );
}

async function replaceRestaurantDetails(restaurantId, data, urls, transaction) {
  await RestaurantPhoto.destroy({
    where: { restaurant_id: restaurantId },
    transaction,
  });
  await Menu.destroy({
    where: { restaurant_id: restaurantId },
    transaction,
  });
  await RestaurantHour.destroy({
    where: { restaurant_id: restaurantId },
    transaction,
  });

  if (urls.subImageUrls.length > 0) {
    await RestaurantPhoto.bulkCreate(
      urls.subImageUrls.map((url, index) => ({
        restaurant_id: restaurantId,
        url,
        sort_order: index + 1,
      })),
      { transaction },
    );
  }

  await Menu.bulkCreate(
    data.menus.map(([name, price], index) => ({
      restaurant_id: restaurantId,
      name,
      price,
      sort_order: index + 1,
    })),
    { transaction },
  );

  await RestaurantHour.bulkCreate(buildHours(restaurantId, data.hourPreset), {
    transaction,
  });
}

function buildHours(restaurantId, presetName) {
  const preset = hourPresets[presetName];
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const isClosed = preset.closedDays.includes(dayOfWeek);
    return {
      restaurant_id: restaurantId,
      day_of_week: dayOfWeek,
      open_time: isClosed ? null : preset.openTime,
      close_time: isClosed ? null : preset.closeTime,
      break_start_time: isClosed ? null : preset.breakStart,
      break_end_time: isClosed ? null : preset.breakEnd,
      last_order_time: isClosed ? null : preset.lastOrder,
      is_closed: isClosed,
      is_24_hours: false,
    };
  });
}

function buildImageUrls(data) {
  return {
    mainImageUrl: `/uploads/restaurants/seed-${data.seedKey}-main${path.extname(data.mainImage).toLowerCase()}`,
    subImageUrls: data.subImages.map(
      (filename, index) =>
        `/uploads/restaurants/seed-${data.seedKey}-sub-${index + 1}${path.extname(filename).toLowerCase()}`,
    ),
  };
}

async function copyAssets() {
  for (const data of restaurants) {
    const urls = buildImageUrls(data);
    await fs.copyFile(
      path.join(assetDir, data.mainImage),
      path.join(uploadDir, path.basename(urls.mainImageUrl)),
    );

    for (let index = 0; index < data.subImages.length; index += 1) {
      await fs.copyFile(
        path.join(assetDir, data.subImages[index]),
        path.join(uploadDir, path.basename(urls.subImageUrls[index])),
      );
    }
  }
}

async function ensureAssetsExist() {
  const expected = restaurants.flatMap((restaurant) => [
    restaurant.mainImage,
    ...restaurant.subImages,
  ]);
  const missing = [];

  for (const filename of expected) {
    try {
      await fs.access(path.join(assetDir, filename));
    } catch {
      missing.push(filename);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing restaurant seed assets in ${assetDir}:\n${missing.join('\n')}`,
    );
  }
}

function validateRestaurantData() {
  const seedKeys = new Set();
  for (const restaurant of restaurants) {
    if (seedKeys.has(restaurant.seedKey)) {
      throw new Error(`Duplicate restaurant seedKey: ${restaurant.seedKey}`);
    }
    seedKeys.add(restaurant.seedKey);

    if (!hourPresets[restaurant.hourPreset]) {
      throw new Error(`Unknown hour preset: ${restaurant.hourPreset}`);
    }
    if (!['active', 'closed'].includes(restaurant.status)) {
      throw new Error(`Invalid restaurant status: ${restaurant.status}`);
    }
    if (!Array.isArray(restaurant.menus) || restaurant.menus.length === 0) {
      throw new Error(`Restaurant menus are required: ${restaurant.seedKey}`);
    }
  }
}

try {
  await seed();
} catch (error) {
  console.error('Restaurant seed failed:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
