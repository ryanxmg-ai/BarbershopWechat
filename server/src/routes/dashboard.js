const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

function dateStr(d) { return d.toISOString().slice(0, 10); }

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const today = new Date();
    const todayStr = dateStr(today);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
    const weekStartStr = dateStr(weekStart);
    const monthStartStr = dateStr(new Date(today.getFullYear(), today.getMonth(), 1));

    // 所有相互独立的查询并发执行（避免逐天串行造成的高延迟）
    const [storesRes, barbersRes, weekRes, monthRes, recentRes] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }),
      supabase.from('barbers').select('id', { count: 'exact', head: true }),
      // 近 7 天非取消预约，一次取回后在内存聚合（覆盖 trend / weekCount / todayCount）
      supabase.from('appointments').select('appointment_date')
        .gte('appointment_date', weekStartStr).lte('appointment_date', todayStr)
        .neq('status', 'cancelled'),
      // 本月已确认 + 已完成的金额（营业额）
      supabase.from('appointments').select('amount')
        .gte('appointment_date', monthStartStr).in('status', ['confirmed', 'completed']),
      // 近期动态
      supabase.from('appointments')
        .select('order_no, user_phone, status, created_at, store:stores(name), barber:barbers(name)')
        .order('created_at', { ascending: false }).limit(6),
    ]);

    // 近 7 天趋势：先建零值桶，保证每天都有点
    const counts = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      counts[dateStr(d)] = 0;
    }
    (weekRes.data || []).forEach((a) => {
      if (counts[a.appointment_date] !== undefined) counts[a.appointment_date] += 1;
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
