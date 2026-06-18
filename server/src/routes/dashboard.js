const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

function dateStr(d) { return d.toISOString().slice(0, 10); }

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const today = new Date();
    const todayStr = dateStr(today);

    const [stores, barbers] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }),
      supabase.from('barbers').select('id', { count: 'exact', head: true }),
    ]);

    // 今日预约数
    const { count: todayCount } = await supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('appointment_date', todayStr).neq('status', 'cancelled');

    // 近 7 天趋势
    const trend = [];
    let weekCount = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const ds = dateStr(d);
      const { count } = await supabase.from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('appointment_date', ds).neq('status', 'cancelled');
      trend.push({ date: ds.slice(5), count: count || 0 });
      weekCount += count || 0;
    }

    // 本月营业额（已完成 + 已确认）
    const monthStart = dateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    const { data: monthAppts } = await supabase.from('appointments')
      .select('amount').gte('appointment_date', monthStart)
      .in('status', ['confirmed', 'completed']);
    const monthRevenue = (monthAppts || []).reduce((s, a) => s + Number(a.amount), 0);

    // 近期动态
    const { data: recent } = await supabase.from('appointments')
      .select('order_no, user_phone, status, created_at, store:stores(name), barber:barbers(name)')
      .order('created_at', { ascending: false }).limit(6);

    res.json({
      storeCount: stores.count || 0,
      barberCount: barbers.count || 0,
      todayCount: todayCount || 0,
      weekCount,
      monthRevenue,
      trend,
      recent: recent || [],
    });
  } catch (e) { next(e); }
});

module.exports = router;
