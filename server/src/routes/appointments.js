const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const { generateOrderNo } = require('../utils/orderNo');

const router = express.Router();

// 关联查询用的 select 串
const RELATIONS = '*, store:stores(*), barber:barbers(*), service:services(*)';

// 创建预约（小程序，演示态：直接标记 confirmed）
router.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    const insert = {
      order_no: generateOrderNo(),
      user_phone: body.user_phone,
      store_id: body.store_id,
      barber_id: body.barber_id,
      service_id: body.service_id,
      appointment_date: body.appointment_date,
      appointment_time: body.appointment_time,
      payment_method: body.payment_method || 'wechat',
      amount: body.amount || 0,
      remark: body.remark || null,
      status: 'confirmed',
    };
    const { data, error } = await supabase.from('appointments').insert(insert).select().single();
    if (error) {
      // 唯一约束冲突 -> 时段已被占用
      if (error.code === '23505') { const e = new Error('该时段已被预约'); e.status = 409; throw e; }
      throw error;
    }
    res.status(201).json(data);
  } catch (e) { next(e); }
});

// 我的预约（小程序）：?phone=&status=
router.get('/', async (req, res, next) => {
  try {
    if (!req.query.phone) { const e = new Error('缺少 phone'); e.status = 400; throw e; }
    let q = supabase.from('appointments').select(RELATIONS)
      .eq('user_phone', req.query.phone)
      .order('appointment_date', { ascending: false });
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 改约 / 取消（小程序）
router.put('/:id', async (req, res, next) => {
  try {
    if (req.params.id === 'admin') return next();
    const allowed = {};
    ['status', 'appointment_date', 'appointment_time'].forEach((k) => {
      if (req.body[k] !== undefined) allowed[k] = req.body[k];
    });
    const { data, error } = await supabase
      .from('appointments').update(allowed).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 后台列表：?store_id=&date=&barber_id=&status=&page=&pageSize=
router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase.from('appointments').select(RELATIONS, { count: 'exact' })
      .order('appointment_date', { ascending: false }).range(from, to);
    if (req.query.store_id) q = q.eq('store_id', req.query.store_id);
    if (req.query.barber_id) q = q.eq('barber_id', req.query.barber_id);
    if (req.query.date) q = q.eq('appointment_date', req.query.date);
    if (req.query.status) q = q.eq('status', req.query.status);

    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ items: data, total: count, page, pageSize });
  } catch (e) { next(e); }
});

// 后台改状态
router.put('/admin/:id', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('appointments').update({ status: req.body.status }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
