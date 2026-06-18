require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/error');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

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
