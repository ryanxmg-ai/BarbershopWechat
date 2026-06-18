const request = require('supertest');
const createApp = require('../src/app');
const { cleanup, TEST_PREFIX } = require('./helpers');

const app = createApp();
const ADMIN = { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` };

afterAll(cleanup);

describe('stores API', () => {
  test('GET /api/stores 返回门店数组', async () => {
    const res = await request(app).get('/api/stores');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('后台可新增、查询、修改、删除门店', async () => {
    const create = await request(app)
      .post('/api/stores')
      .set(ADMIN)
      .send({ name: `${TEST_PREFIX}徐汇店`, address: `${TEST_PREFIX}潍浦路18号`, phone: '021-0000' });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const detail = await request(app).get(`/api/stores/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.name).toBe(`${TEST_PREFIX}徐汇店`);
    expect(Array.isArray(detail.body.barbers)).toBe(true);

    const upd = await request(app).put(`/api/stores/${id}`).set(ADMIN).send({ status: 'closed' });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('closed');

    const del = await request(app).delete(`/api/stores/${id}`).set(ADMIN);
    expect(del.status).toBe(204);
  });

  test('未授权不能新增门店', async () => {
    const res = await request(app).post('/api/stores').send({ name: 'x', address: 'y' });
    expect(res.status).toBe(401);
  });
});
