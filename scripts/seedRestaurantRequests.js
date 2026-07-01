import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import { sequelize } from '../db/database.js';
import { User } from '../data/user.js';
import { Restaurant } from '../data/restaurant.js';
import { RestaurantRequest } from '../data/restaurantRequest.js';
import { config } from '../config.js';
import { restaurants } from './data/restaurants.js';
import {
  approvedRequestKeys,
  deletedRequest,
  pendingRequests,
  rejectedRequests,
} from './data/restaurantRequests.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.join(scriptDir, 'seed-assets', 'restaurants');
const requestUploadDir = path.join(path.resolve(config.upload.dir), 'requests');
const adminUsername = 'portfolioadmin';

async function seed() {
  validateRequestData();
  await ensurePendingAssetsExist();
  await sequelize.authenticate();
  await fs.mkdir(requestUploadDir, { recursive: true });

  const usernames = new Set([
    adminUsername,
    ...approvedRequestKeys.map(
      (seedKey) => restaurantDataByKey(seedKey).ownerUsername,
    ),
    ...pendingRequests.map(({ requester }) => requester),
    ...rejectedRequests.map(({ requester }) => requester),
    deletedRequest.requester,
  ]);
  const users = await User.findAll({
    where: { username: { [Op.in]: [...usernames] } },
    attributes: ['id', 'username'],
    raw: true,
  });
  const userIds = new Map(users.map((user) => [user.username, user.id]));
  const missingUsers = [...usernames].filter((username) => !userIds.has(username));
  if (missingUsers.length) {
    throw new Error(
      `Missing seed users: ${missingUsers.join(', ')}\nRun npm run seed:users first.`,
    );
  }

  const approvedRestaurants = await findApprovedRestaurants();
  await copyPendingAssets();

  const rows = buildRequestRows(userIds, approvedRestaurants);
  const seedNames = rows.map(({ name }) => name);

  const result = await sequelize.transaction(async (transaction) => {
    await RestaurantRequest.destroy({
      where: {
        name: { [Op.in]: seedNames },
        requested_by: { [Op.in]: [...userIds.values()] },
      },
      transaction,
    });

    await RestaurantRequest.bulkCreate(rows, { transaction });
    return countStatuses(rows);
  });

  console.log(
    `Restaurant request seed complete: ${result.pending} pending, ${result.approved} approved, ${result.rejected} rejected.`,
  );
}

async function findApprovedRestaurants() {
  const approvedData = approvedRequestKeys.map(restaurantDataByKey);
  const rows = await Restaurant.findAll({
    where: {
      [Op.or]: approvedData.map(({ name, roadAddress }) => ({
        name,
        road_address: roadAddress,
      })),
    },
    attributes: ['id', 'name', 'road_address'],
    raw: true,
  });
  const ids = new Map(
    rows.map((row) => [restaurantKey(row.name, row.road_address), row.id]),
  );
  const result = new Map(
    approvedData.map((data) => [
      data.seedKey,
      ids.get(restaurantKey(data.name, data.roadAddress)),
    ]),
  );
  const missing = approvedData
    .filter((data) => !result.get(data.seedKey))
    .map((data) => data.seedKey);
  if (missing.length) {
    throw new Error(
      `Missing approved restaurants: ${missing.join(', ')}\nRun npm run seed:restaurants first.`,
    );
  }
  return result;
}

function buildRequestRows(userIds, approvedRestaurants) {
  const adminId = userIds.get(adminUsername);
  const now = Date.now();
  let sequence = 0;
  const timestamp = (daysAgo) => {
    sequence += 1;
    return new Date(now - daysAgo * 86400000 - sequence * 60000);
  };

  const approvedRows = approvedRequestKeys.map((seedKey, index) => {
    const data = restaurantDataByKey(seedKey);
    const createdAt = timestamp(70 - index * 4);
    return {
      ...restaurantFields(data),
      main_image_url: null,
      status: 'approved',
      requested_by: userIds.get(data.ownerUsername),
      reviewed_by: adminId,
      reviewed_at: new Date(createdAt.getTime() + 2 * 86400000),
      reject_reason: null,
      approved_restaurant_id: approvedRestaurants.get(seedKey),
      restaurant_deleted: false,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + 2 * 86400000),
    };
  });

  const pendingRows = pendingRequests.map((data, index) => {
    const createdAt = timestamp(8 - index);
    return {
      ...requestFields(data),
      main_image_url: `/uploads/requests/seed-${data.seedKey}${path.extname(data.sourceImage).toLowerCase()}`,
      status: 'pending',
      requested_by: userIds.get(data.requester),
      reviewed_by: null,
      reviewed_at: null,
      reject_reason: null,
      approved_restaurant_id: null,
      restaurant_deleted: false,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const rejectedRows = rejectedRequests.map((data, index) => {
    const createdAt = timestamp(35 - index * 3);
    return {
      ...requestFields(data),
      main_image_url: null,
      status: 'rejected',
      requested_by: userIds.get(data.requester),
      reviewed_by: adminId,
      reviewed_at: new Date(createdAt.getTime() + 86400000),
      reject_reason: data.rejectReason,
      approved_restaurant_id: null,
      restaurant_deleted: false,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + 86400000),
    };
  });

  const deletedCreatedAt = timestamp(90);
  const deletedRow = {
    ...requestFields(deletedRequest),
    main_image_url: null,
    status: 'approved',
    requested_by: userIds.get(deletedRequest.requester),
    reviewed_by: adminId,
    reviewed_at: new Date(deletedCreatedAt.getTime() + 86400000),
    reject_reason: null,
    approved_restaurant_id: null,
    restaurant_deleted: true,
    createdAt: deletedCreatedAt,
    updatedAt: new Date(deletedCreatedAt.getTime() + 30 * 86400000),
  };

  return [...approvedRows, ...pendingRows, ...rejectedRows, deletedRow];
}

function restaurantFields(data) {
  return {
    name: data.name,
    category: data.category,
    branch_info: data.branchInfo,
    sido: data.sido,
    sigugun: data.sigugun,
    dongmyun: data.dongmyun,
    road_address: data.roadAddress,
    jibun_address: data.jibunAddress,
    phone: data.phone,
    description: data.description,
    lat: data.lat,
    lng: data.lng,
  };
}

function requestFields(data) {
  return {
    name: data.name,
    category: data.category,
    branch_info: data.branchInfo ?? null,
    sido: data.sido,
    sigugun: data.sigugun,
    dongmyun: data.dongmyun,
    road_address: data.roadAddress ?? null,
    jibun_address: data.jibunAddress ?? null,
    phone: data.phone ?? null,
    description: data.description ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
  };
}

async function copyPendingAssets() {
  for (const request of pendingRequests) {
    const extension = path.extname(request.sourceImage).toLowerCase();
    await fs.copyFile(
      path.join(assetDir, request.sourceImage),
      path.join(requestUploadDir, `seed-${request.seedKey}${extension}`),
    );
  }
}

async function ensurePendingAssetsExist() {
  const missing = [];
  for (const { sourceImage } of pendingRequests) {
    try {
      await fs.access(path.join(assetDir, sourceImage));
    } catch {
      missing.push(sourceImage);
    }
  }
  if (missing.length) {
    throw new Error(`Missing request seed assets:\n${missing.join('\n')}`);
  }
}

function validateRequestData() {
  const restaurantKeys = new Set(restaurants.map(({ seedKey }) => seedKey));
  const requestKeys = new Set();
  for (const seedKey of approvedRequestKeys) {
    if (!restaurantKeys.has(seedKey)) {
      throw new Error(`Unknown approved restaurant seedKey: ${seedKey}`);
    }
    const owner = restaurantDataByKey(seedKey).ownerUsername;
    if (!owner) throw new Error(`Approved request requires an owner: ${seedKey}`);
  }
  for (const request of [...pendingRequests, ...rejectedRequests, deletedRequest]) {
    if (requestKeys.has(request.seedKey)) {
      throw new Error(`Duplicate request seedKey: ${request.seedKey}`);
    }
    requestKeys.add(request.seedKey);
  }
}

function restaurantDataByKey(seedKey) {
  return restaurants.find((restaurant) => restaurant.seedKey === seedKey);
}

function restaurantKey(name, roadAddress) {
  return `${name}\u0000${roadAddress}`;
}

function countStatuses(rows) {
  return rows.reduce(
    (counts, row) => ({ ...counts, [row.status]: counts[row.status] + 1 }),
    { pending: 0, approved: 0, rejected: 0 },
  );
}

try {
  await seed();
} catch (error) {
  console.error('Restaurant request seed failed:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
