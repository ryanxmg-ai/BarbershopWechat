const express = require('express');
const supabase = require('../supabase');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('services').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
