const express = require('express');
const router = express.Router();

// 小程序模拟登录：手机号即身份
router.post('/login', (req, res, next) => {
  const phone = req.body.phone;
  if (!phone) { const e = new Error('缺少手机号'); e.status = 400; return next(e); }
  res.json({ phone, nickname: `先生 ${phone.slice(-4)}` });
});

// 管理员登录
router.post('/admin-login', (req, res, next) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return res.json({ token: process.env.ADMIN_TOKEN, username });
  }
  const e = new Error('账号或密码错误'); e.status = 401; next(e);
});

module.exports = router;
