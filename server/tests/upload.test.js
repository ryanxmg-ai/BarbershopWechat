const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();
const ADMIN = { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` };

// 1x1 PNG
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

test('上传头像返回公开 URL', async () => {
  const res = await request(app)
    .post('/api/upload?bucket=avatars')
    .set(ADMIN)
    .attach('file', pngBuffer, 'test.png');
  expect(res.status).toBe(201);
  expect(res.body.url).toMatch(/^https?:\/\//);
});

test('未授权不能上传', async () => {
  const res = await request(app).post('/api/upload?bucket=avatars').attach('file', pngBuffer, 'x.png');
  expect(res.status).toBe(401);
});
