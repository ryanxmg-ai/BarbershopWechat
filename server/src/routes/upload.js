const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const ALLOWED_BUCKETS = ['avatars', 'store-images'];

router.post('/', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    const bucket = req.query.bucket || 'avatars';
    if (!ALLOWED_BUCKETS.includes(bucket)) { const e = new Error('非法 bucket'); e.status = 400; throw e; }
    if (!req.file) { const e = new Error('缺少文件'); e.status = 400; throw e; }

    const ext = (req.file.originalname.split('.').pop() || 'png').toLowerCase();
    const path = `${Date.now()}-${uuidv4()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, req.file.buffer, {
      contentType: req.file.mimetype, upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    res.status(201).json({ url: data.publicUrl, path, bucket });
  } catch (e) { next(e); }
});

module.exports = router;
