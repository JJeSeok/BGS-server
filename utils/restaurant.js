export function timeToMinutes(timeStr) {
  if (!timeStr) return null;

  const [hour, minute] = timeStr.split(':').map(Number);
  return hour * 60 + minute;
}

export function getRestaurantOpenStatus({
  openingTime,
  closingTime,
  is24Hours,
  now = new Date(),
}) {
  if (is24Hours) return true;
  if (!openingTime || !closingTime) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeToMinutes(openingTime);
  const closeMinutes = timeToMinutes(closingTime);

  if (openMinutes === null || closeMinutes === null) return null;

  // ex) 09:00 ~ 21:00
  if (openMinutes < closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  // ex) 18:00 ~ 02:00
  if (openMinutes > closeMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return null;
}

export function formatHours({ openingTime, closingTime, is24Hours }) {
  if (is24Hours) return '00:00 ~ 24:00';
  if (!openingTime || !closingTime) return null;

  return `${openingTime.slice(0, 5)} ~ ${closingTime.slice(0, 5)}`;
}
