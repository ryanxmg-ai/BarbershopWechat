const request = require('supertest');
const createApp = require('../src/app');
const app = createApp();

test('小程序模拟登录返回手机号身份', async () => {
  const res = await request(app).post('/api/auth/login').send({ phone: '13800001111' });
  expect(res.status).toBe(200);
  expect(res.body.phone).toBe('13800001111');
});

test('管理员登录正确凭证返回 token', async () => {
  const res = await request(app).post('/api/auth/admin-login')
    .send({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  expect(res.status).toBe(200);
  expect(res.body.token).toBe(process.env.ADMIN_TOKEN);
});

test('管理员登录错误凭证 401', async () => {
  const res = await request(app).post('/api/auth/admin-login').send({ username: 'x', password: 'y' });
  expect(res.status).toBe(401);
});
