export function mapGenderToCohort(gender) {
  if (gender === 'male') return 'M';
  if (gender === 'female') return 'F';
  return 'U';
}

export function calcAgeBandFromBirth(birth) {
  if (!birth) return null;

  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;

  const now = new Date();

  let age = now.getFullYear() - b.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() >= b.getDate());

  if (!hasHadBirthdayThisYear) age -= 1;

  let band = Math.floor(age / 10) * 10;
  if (band < 10) band = 10;
  if (band > 60) band = 60;

  return band;
}
