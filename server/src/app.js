require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/error');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // 根路径：友好提示（本服务为纯 API，界面在管理后台 admin / 小程序 miniprogram）
  app.get('/', (req, res) => {
    res.json({
      service: 'Ryan 男士理发馆预约系统 · 后端 API',
      hint: '这是 API 服务，不是网页。管理后台请运行 admin（npm run dev），界面在那里。',
      endpoints: [
        'GET  /api/health',
        'GET  /api/stores',
        'GET  /api/stores/:id',
        'GET  /api/barbers/:id?date=YYYY-MM-DD',
        'GET  /api/services',
        'POST /api/appointments',
        'GET  /api/appointments?phone=',
        'POST /api/auth/admin-login',
        'GET  /api/admin/dashboard (需要 Bearer token)',
      ],
    });
  });

  // 路由在后续任务中挂载（创建对应文件后逐行解开注释）
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/stores', require('./routes/stores'));
  app.use('/api/barbers', require('./routes/barbers'));
  app.use('/api/services', require('./routes/services'));
  app.use('/api/appointments', require('./routes/appointments'));
  app.use('/api/admin/dashboard', require('./routes/dashboard'));
  app.use('/api/upload', require('./routes/upload'));

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
