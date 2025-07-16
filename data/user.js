let users = [];

export async function findByUsername(username) {
  return users.find((user) => user.username === username);
}

export async function findByEmail(email) {
  return users.find((user) => user.email === email);
}

export async function findByPhone(phone) {
  return users.find((user) => user.phone === phone);
}

export async function create(user) {
  const created = { id: users.length + 1, ...user };
  users.push(created);
  return created.id;
}
