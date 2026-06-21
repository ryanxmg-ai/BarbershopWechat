const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const TZ_OFFSET_MS = 8 * 3600 * 1000; // 东八区（北京时间），与时区无关地计算“日期”

// 取某时刻在北京时间下的日期字符串 YYYY-MM-DD
function beijingDate(d) {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const todayStr = beijingDate(now);
    // 北京时间今天 00:00 对应的 UTC 时刻
    const todayMidnight = new Date(`${todayStr}T00:00:00+08:00`);
    const weekStart = new Date(todayMidnight.getTime() - 6 * 86400000); // 近 7 天起点（含今天）
    const weekStartISO = weekStart.toISOString();
    const monthStartStr = todayStr.slice(0, 7) + '-01';
    const monthStartISO = new Date(`${monthStartStr}T00:00:00+08:00`).toISOString();

    // 今日预约 / 本周预约 / 趋势 全部按【下单时间 created_at】统计，下单即时反映
    const [storesRes, barbersRes, weekRes, monthRes, recentRes] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }),
      supabase.from('barbers').select('id', { count: 'exact', head: true }),
      // 近 7 天内下单的非取消预约，一次取回在内存按北京日期聚合
      supabase.from('appointments').select('created_at')
        .gte('created_at', weekStartISO).neq('status', 'cancelled'),
      // 本月下单且已确认/已完成的金额（营业额）
      supabase.from('appointments').select('amount')
        .gte('created_at', monthStartISO).in('status', ['confirmed', 'completed']),
      // 近期动态
      supabase.from('appointments')
        .select('order_no, user_phone, status, created_at, store:stores(name), barber:barbers(name)')
        .order('created_at', { ascending: false }).limit(6),
    ]);

    // 近 7 天趋势：建零值桶（北京日期），保证每天有点
    const counts = {};
    for (let i = 6; i >= 0; i--) {
      counts[beijingDate(new Date(todayMidnight.getTime() - i * 86400000))] = 0;
    }
    (weekRes.data || []).forEach((a) => {
      const key = beijingDate(new Date(a.created_at));
      if (counts[key] !== undefined) counts[key] += 1;
    });
    const trend = Object.keys(counts).map((ds) => ({ date: ds.slice(5), count: counts[ds] }));
    const weekCount = Object.values(counts).reduce((s, c) => s + c, 0);
    const todayCount = counts[todayStr] || 0;

    const monthRevenue = (monthRes.data || []).reduce((s, a) => s + Number(a.amount), 0);

    res.json({
      storeCount: storesRes.count || 0,
      barberCount: barbersRes.count || 0,
      todayCount,
      weekCount,
      monthRevenue,
      trend,
      recent: recentRes.data || [],
    });
  } catch (e) { next(e); }
});

module.exports = router;
