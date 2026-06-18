const request = require('supertest');
const createApp = require('../src/app');
const { createStore, createBarber, cleanup, TEST_PREFIX } = require('./helpers');

const app = createApp();
const ADMIN = { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` };
afterAll(cleanup);

describe('barbers API', () => {
  test('理发师详情含服务项目与某日可约时段', async () => {
    const store = await createStore();
    const barber = await createBarber(store.id, { title: '店长', years_experience: 10 });
    const res = await request(app).get(`/api/barbers/${barber.id}?date=2026-07-01`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(`${TEST_PREFIX}理发师`);
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots[0]).toHaveProperty('available');
  });

  test('后台 CRUD 理发师', async () => {
    const store = await createStore();
    const create = await request(app).post('/api/barbers').set(ADMIN)
      .send({ store_id: store.id, name: `${TEST_PREFIX}阿杰`, title: '高级发型师' });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const upd = await request(app).put(`/api/barbers/${id}`).set(ADMIN).send({ status: 'resting' });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('resting');

    const list = await request(app).get(`/api/barbers?store_id=${store.id}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThanOrEqual(1);

    const del = await request(app).delete(`/api/barbers/${id}`).set(ADMIN);
    expect(del.status).toBe(204);
  });
});
