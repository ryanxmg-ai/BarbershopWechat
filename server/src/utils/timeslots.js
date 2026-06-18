// 生成 10:00-20:30 每 30 分钟时段
function generateSlots(start = '10:00', end = '20:30', stepMin = 30) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const pad = (n) => String(n).padStart(2, '0');
  const slots = [];
  for (let t = toMin(start); t <= toMin(end); t += stepMin) {
    slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return slots;
}

// 标记已占用：bookedTimes 为该理发师该日已被占用的时间数组
function withAvailability(slots, bookedTimes) {
  const taken = new Set(bookedTimes);
  return slots.map((time) => ({ time, available: !taken.has(time) }));
}

module.exports = { generateSlots, withAvailability };
