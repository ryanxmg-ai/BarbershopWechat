const request = require('supertest');
const createApp = require('../src/app');
const { createStore, createBarber, createService, cleanup, TEST_PREFIX } = require('./helpers');

const app = createApp();
const ADMIN = { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` };
const PHONE = `${TEST_PREFIX}13800000000`;
afterAll(cleanup);

describe('appointments API', () => {
  let store, barber, service;
  beforeAll(async () => {
    store = await createStore();
    barber = await createBarber(store.id);
    service = await createService({ price: 128 });
  });

  const payload = (overrides = {}) => ({
    user_phone: PHONE, store_id: store.id, barber_id: barber.id,
    service_id: service.id, appointment_date: '2026-07-02',
    appointment_time: '13:30', payment_method: 'wechat', amount: 128, ...overrides,
  });

  test('创建预约生成订单号并标记支付成功', async () => {
    const res = await request(app).post('/api/appointments').send(payload());
    expect(res.status).toBe(201);
    expect(res.body.order_no).toMatch(/^AP\d{12}$/);
    expect(res.body.status).toBe('confirmed');
  });

  test('同理发师同时段重复预约返回 409', async () => {
    const res = await request(app).post('/api/appointments').send(payload());
    expect(res.status).toBe(409);
  });

  test('按手机号查询我的预约', async () => {
    const res = await request(app).get(`/api/appointments?phone=${encodeURIComponent(PHONE)}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('store');
    expect(res.body[0]).toHaveProperty('barber');
    expect(res.body[0]).toHaveProperty('service');
  });

  test('取消预约', async () => {
    const list = await request(app).get(`/api/appointments?phone=${encodeURIComponent(PHONE)}`);
    const id = list.body[0].id;
    const res = await request(app).put(`/api/appointments/${id}`).send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  test('后台按门店筛选预约列表（分页结构）', async () => {
    const res = await request(app).get(`/api/appointments/admin?store_id=${store.id}`).set(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
  });
});
