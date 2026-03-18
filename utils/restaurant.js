export function timeToMinutes(timeStr) {
  if (!timeStr) return null;

  const [hour, minute] = timeStr.split(':').map(Number);
  return hour * 60 + minute;
}

export function formatHours(timeStr) {
  if (!timeStr) return null;
  return timeStr.slice(0, 5);
}

export function formatTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return null;
  return `${formatHours(startTime)} ~ ${formatHours(endTime)}`;
}

export function getRestaurantTodayInfo(restaurantHours = [], now = new Date()) {
  const today = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayHours = restaurantHours.find(
    (item) => Number(item.day_of_week) === today,
  );
  if (!todayHours) {
    return {
      status: 'UNKNOWN',
      label: '영업시간 정보 없음',
      businessHours: null,
      breakTime: null,
      lastOrder: null,
    };
  }

  const {
    open_time,
    close_time,
    break_start_time,
    break_end_time,
    last_order_time,
    is_closed,
    is_24_hours,
  } = todayHours;

  if (is_closed) {
    return {
      status: 'HOLIDAY',
      label: '휴무일',
      businessHours: null,
      breakTime: null,
      lastOrder: null,
    };
  }

  if (is_24_hours) {
    return {
      status: 'OPEN_24_HOURS',
      label: '24시간 영업',
      businessHours: '00:00 ~ 24:00',
      breakTime: null,
      lastOrder: last_order_time ? formatHours(last_order_time) : null,
    };
  }

  if (!open_time || !close_time) {
    return {
      status: 'UNKNOWN',
      label: '영업시간 정보 없음',
      businessHours: null,
      breakTime: null,
      lastOrder: null,
    };
  }

  const openMinutes = timeToMinutes(open_time);
  const closeMinutes = timeToMinutes(close_time);

  let isOpenNow = false;

  // ex) 09:00 ~ 21:00
  if (openMinutes < closeMinutes) {
    isOpenNow = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else if (openMinutes > closeMinutes) {
    // ex) 18:00 ~ 02:00
    isOpenNow = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  const breakStartMinutes = timeToMinutes(break_start_time);
  const breakEndMinutes = timeToMinutes(break_end_time);

  let isBreakTime = false;

  if (breakStartMinutes !== null && breakEndMinutes !== null) {
    if (breakStartMinutes < breakEndMinutes) {
      isBreakTime =
        currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes;
    } else if (breakStartMinutes > breakEndMinutes) {
      isBreakTime =
        currentMinutes >= breakStartMinutes || currentMinutes < breakEndMinutes;
    }
  }

  let status = 'CLOSED';
  let label = '영업 종료';

  if (isOpenNow) {
    status = 'OPEN';
    label = '영업중';
  }

  if (isOpenNow && isBreakTime) {
    status = 'BREAK_TIME';
    label = '브레이크타임';
  }

  return {
    status,
    label,
    businessHours: formatTimeRange(open_time, close_time),
    breakTime: formatTimeRange(break_start_time, break_end_time),
    lastOrder: last_order_time ? formatHours(last_order_time) : null,
  };
}
