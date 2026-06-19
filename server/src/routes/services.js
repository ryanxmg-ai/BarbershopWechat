const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 公开/后台：服务项目列表，支持 ?status=active|inactive 过滤（不传则返回全部，供后台管理）
router.get('/', async (req, res, next) => {
  try {
    let q = supabase.from('services').select('*').order('sort_order', { ascending: true });
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 后台：新增服务项目
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('services').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

// 后台：编辑服务项目（含上架/下架状态）
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('services').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
