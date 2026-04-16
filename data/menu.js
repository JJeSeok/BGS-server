import { DataTypes } from 'sequelize';
import { sequelize } from '../db/database.js';

export const Menu = sequelize.define('menu', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  restaurant_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  price: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  sort_order: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },
});

function normalizeMenuPayload(menu, restaurantId) {
  return {
    restaurant_id: restaurantId,
    name: String(menu.name || '').trim(),
    price: menu.price === '' || menu.price === null ? null : Number(menu.price),
    sort_order: menu.sortOrder ?? null,
  };
}

export async function syncRestaurantMenus(
  restaurantId,
  menus = [],
  transaction = undefined,
) {
  if (!Array.isArray(menus)) return;

  for (const menu of menus) {
    if (menu.id && menu.isDeleted) {
      await Menu.destroy({
        where: {
          id: menu.id,
          restaurant_id: restaurantId,
        },
        transaction,
      });
      continue;
    }

    if (menu.id && !menu.isDeleted) {
      await Menu.update(normalizeMenuPayload(menu, restaurantId), {
        where: {
          id: menu.id,
          restaurant_id: restaurantId,
        },
        transaction,
      });
      continue;
    }

    if (!menu.id && !menu.isDeleted) {
      await Menu.create(normalizeMenuPayload(menu, restaurantId), {
        transaction,
      });
    }
  }
}
