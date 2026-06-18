const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const { generateSlots, withAvailability } = require('../utils/timeslots');

const router = express.Router();

// 公开：列表，支持 ?store_id= & ?status=
router.get('/', async (req, res, next) => {
  try {
    let q = supabase.from('barbers').select('*').order('created_at');
    if (req.query.store_id) q = q.eq('store_id', req.query.store_id);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 公开：详情（含全部服务项目 + 指定日期可约时段）
router.get('/:id', async (req, res, next) => {
  try {
    const { data: barber, error } = await supabase
      .from('barbers').select('*').eq('id', req.params.id).single();
    if (error) { const err = new Error('理发师不存在'); err.status = 404; throw err; }

    const { data: services } = await supabase
      .from('services').select('*').order('sort_order');

    const date = req.query.date;
    let slots = [];
    if (date) {
      const { data: booked } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('barber_id', barber.id)
        .eq('appointment_date', date)
        .neq('status', 'cancelled');
      const bookedTimes = (booked || []).map((b) => b.appointment_time);
      slots = withAvailability(generateSlots(), bookedTimes);
    }
    res.json({ ...barber, services: services || [], slots });
  } catch (e) { next(e); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('barbers').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('barbers').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabase.from('barbers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
