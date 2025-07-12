let restaurants = [
  {
    id: '1',
    name: '천원국수',
    time: '10:00 ~ 21:00',
    number: '041-532-0969',
    type: '분식',
  },
  {
    id: '2',
    name: '버거운버거',
    time: '10:00 ~ 22:00',
    number: '0507-1470-9286',
    type: '햄버거',
  },
];

export async function getAllRestaurants() {
  return restaurants;
}

export async function getRestaurantById(id) {
  return restaurants.find((restaurant) => restaurant.id === id);
}

export async function create(name, time, number, type) {
  const restaurant = {
    id: restaurants.length + 1,
    name,
    time,
    number,
    type,
  };
  restaurants.push(restaurant);

  return restaurant;
}

export async function update(id, updateData) {
  const restaurant = restaurants.find((restaurant) => restaurant.id === id);
  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined) {
      restaurant[key] = value;
    }
  });

  return restaurant;
}

export async function remove(id) {
  restaurants = restaurants.filter((restaurant) => restaurant.id !== id);
}
