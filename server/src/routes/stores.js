const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 公开：门店列表，支持 ?city= 与 ?keyword=
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('stores').select('*').order('created_at', { ascending: true });
    if (req.query.city) query = query.eq('city', req.query.city);
    if (req.query.keyword) query = query.ilike('name', `%${req.query.keyword}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 公开：门店详情（含理发师）
router.get('/:id', async (req, res, next) => {
  try {
    const { data: store, error } = await supabase
      .from('stores').select('*').eq('id', req.params.id).single();
    if (error) { const err = new Error('门店不存在'); err.status = 404; throw err; }
    const { data: barbers } = await supabase
      .from('barbers').select('*').eq('store_id', store.id).order('created_at');
    res.json({ ...store, barbers: barbers || [] });
  } catch (e) { next(e); }
});

// 后台：新增
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('stores').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

// 后台：修改
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('stores').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 后台：删除
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabase.from('stores').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
