import * as requestRepository from '../data/restaurantRequest.js';

function validateCreateBody(body) {
  const required = ['name', 'category', 'sido', 'sigugun', 'dongmyun'];
  for (const k of required) {
    if (!body?.[k] || String(body[k]).trim().length === 0)
      return `${k}는 필수입니다.`;
  }
  return null;
}

export async function createRestaurantRequest(req, res) {
  const userId = req.userId;
  const msg = validateCreateBody(req.body);
  if (msg) return res.status(400).json({ message: msg });

  const restaurant = {
    name: String(req.body.name).trim(),
    category: String(req.body.category).trim(),
    branch_info: req.body.branch_info
      ? String(req.body.branch_info).trim()
      : null,
    main_image_url: req.body.main_image_url
      ? String(req.body.main_image_url).trim()
      : null,
    sido: String(req.body.sido).trim(),
    sigugun: String(req.body.sigugun).trim(),
    dongmyun: String(req.body.dongmyun).trim(),
    road_address: req.body.road_address
      ? String(req.body.road_address).trim()
      : null,
    jibun_address: req.body.jibun_address
      ? String(req.body.jibun_address).trim()
      : null,
    phone: req.body.phone ? String(req.body.phone).trim() : null,
    description: req.body.description
      ? String(req.body.description).trim()
      : null,
    lat: req.body.lat ?? null,
    lng: req.body.lng ?? null,
    status: 'pending',
    requested_by: userId,
  };

  try {
    const row = await requestRepository.create(restaurant);
    return res.status(201).json({ id: row.id });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '식당 등록 요청 중 오류가 발생했습니다.' });
  }
}

export async function getMyRestaurantRequests(req, res) {
  const userId = req.userId;

  try {
    const rows = await requestRepository.findMyRequests(userId);
    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: '요청 목록 조회 중 오류가 발생했습니다.' });
  }
}
