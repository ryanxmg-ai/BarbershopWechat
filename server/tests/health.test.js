const request = require('supertest');
const createApp = require('../src/app');

test('GET /api/health 返回 ok', async () => {
  const app = createApp();
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
