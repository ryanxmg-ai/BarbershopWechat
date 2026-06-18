const request = require('supertest');
const createApp = require('../src/app');
const app = createApp();
const ADMIN = { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` };

test('dashboard 返回统计结构', async () => {
  const res = await request(app).get('/api/admin/dashboard').set(ADMIN);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('storeCount');
  expect(res.body).toHaveProperty('barberCount');
  expect(res.body).toHaveProperty('todayCount');
  expect(res.body).toHaveProperty('weekCount');
  expect(res.body).toHaveProperty('monthRevenue');
  expect(Array.isArray(res.body.trend)).toBe(true);
  expect(Array.isArray(res.body.recent)).toBe(true);
});

test('dashboard 需要鉴权', async () => {
  const res = await request(app).get('/api/admin/dashboard');
  expect(res.status).toBe(401);
});
