# Ryan 理发馆 — 后端服务 (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Node + Express 后端，以 Supabase(Postgres + Storage) 为数据库与文件存储，为小程序和管理后台提供完整 REST API。

**Architecture:** Express 应用导出为 `app`（供 Supertest 测试），由 `index.js` 启动监听。所有数据访问通过单例 Supabase 客户端（service role key）。路由按资源拆分，每个资源文件包含路由与处理逻辑。管理后台接口用简单 token 中间件鉴权。

**Tech Stack:** Node.js, Express, @supabase/supabase-js, Jest, Supertest, dotenv, multer(内存解析上传), uuid。

**前置条件（人工，一次性）：** 在 supabase.com 建免费项目 → 在 SQL Editor 执行 `server/sql/schema.sql` → 在 Storage 建两个 **public** bucket：`avatars`、`store-images` → 复制 Project URL / anon key / service_role key 填入 `server/.env`。

---

## File Structure

```
server/
├── package.json
├── .env.example
├── .gitignore
├── jest.config.js
├── sql/
│   ├── schema.sql          建表 + 约束 + 索引
│   └── seed.js             种子数据脚本
├── src/
│   ├── index.js            启动监听
│   ├── app.js              创建并导出 Express app
│   ├── supabase.js         Supabase 客户端单例
│   ├── middleware/
│   │   ├── auth.js         管理员 token 校验
│   │   └── error.js        统一错误处理
│   ├── utils/
│   │   ├── orderNo.js      生成订单号
│   │   └── timeslots.js    生成/过滤可约时段
│   └── routes/
│       ├── auth.js         小程序模拟登录 + 管理员登录
│       ├── stores.js       门店（公开查 + 后台 CRUD）
│       ├── barbers.js      理发师（公开查 + 后台 CRUD）
│       ├── services.js     服务项目
│       ├── appointments.js 预约（创建/我的/改约 + 后台列表/改状态）
│       ├── dashboard.js    后台数据总览
│       └── upload.js       图片上传到 Supabase Storage
└── tests/
    ├── helpers.js          测试夹具：建/清理测试数据
    ├── stores.test.js
    ├── barbers.test.js
    ├── appointments.test.js
    └── upload.test.js
```

---

## Task 1: 项目初始化与依赖

**Files:**
- Create: `server/package.json`
- Create: `server/.gitignore`
- Create: `server/.env.example`
- Create: `server/jest.config.js`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ryan-barber-server",
  "version": "1.0.0",
  "description": "Ryan 男士理发馆预约系统后端",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "seed": "node sql/seed.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: 创建 .gitignore**

```
node_modules/
.env
coverage/
```

- [ ] **Step 3: 创建 .env.example**

```
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_TOKEN=ryan-admin-demo-token
```

- [ ] **Step 4: 创建 jest.config.js**

```js
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  testTimeout: 20000,
};
```

- [ ] **Step 5: 安装依赖**

Run: `cd server && npm install`
Expected: 依赖安装成功，生成 `node_modules` 与 `package-lock.json`。

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/.gitignore server/.env.example server/jest.config.js
git commit -m "chore: scaffold backend project"
```

---

## Task 2: 数据库 schema

**Files:**
- Create: `server/sql/schema.sql`

- [ ] **Step 1: 编写 schema.sql**

```sql
-- 门店
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  business_hours text not null default '10:00-22:00',
  phone text,
  images jsonb not null default '[]'::jsonb,
  status text not null default 'open',        -- open | closed
  rating numeric(2,1) not null default 4.8,
  review_count int not null default 0,
  city text not null default '上海',
  created_at timestamptz not null default now()
);

-- 理发师
create table if not exists barbers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  title text not null default '发型师',        -- 店长 | 高级发型师 | 发型师
  avatar_url text,
  specialties jsonb not null default '[]'::jsonb,
  rating numeric(2,1) not null default 4.8,
  review_count int not null default 0,
  years_experience int not null default 1,
  bio text,
  status text not null default 'active',        -- active | resting
  created_at timestamptz not null default now()
);

-- 服务项目
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  duration int not null default 30,
  sort_order int not null default 0
);

-- 预约
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_phone text not null,
  store_id uuid not null references stores(id),
  barber_id uuid not null references barbers(id),
  service_id uuid not null references services(id),
  appointment_date date not null,
  appointment_time text not null,
  status text not null default 'confirmed',     -- pending | confirmed | completed | cancelled
  payment_method text not null default 'wechat',-- wechat | balance
  amount numeric(10,2) not null default 0,
  remark text,
  created_at timestamptz not null default now()
);

-- 同一理发师同一时段在“未取消”状态下唯一
create unique index if not exists uniq_active_slot
  on appointments (barber_id, appointment_date, appointment_time)
  where status <> 'cancelled';

create index if not exists idx_barbers_store on barbers(store_id);
create index if not exists idx_appt_phone on appointments(user_phone);
create index if not exists idx_appt_date on appointments(appointment_date);

-- 管理员
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null
);
```

- [ ] **Step 2: 在 Supabase SQL Editor 执行（人工）**

将上面内容粘贴到 Supabase 控制台 → SQL Editor → Run。
Expected: 5 张表创建成功，无报错。

- [ ] **Step 3: Commit**

```bash
git add server/sql/schema.sql
git commit -m "feat: add database schema"
```

---

## Task 3: Supabase 客户端与 Express app 骨架

**Files:**
- Create: `server/src/supabase.js`
- Create: `server/src/middleware/error.js`
- Create: `server/src/app.js`
- Create: `server/src/index.js`

- [ ] **Step 1: 创建 supabase.js**

```js
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请检查 .env');
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = supabase;
```

- [ ] **Step 2: 创建 middleware/error.js**

```js
// 统一错误处理：控制器抛出的错误带 .status 时使用，否则 500
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || '服务器内部错误' });
}

module.exports = errorHandler;
```

- [ ] **Step 3: 创建 app.js**

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/error');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // 路由在后续任务中挂载
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
```

> 注意：本任务先只保留 `/api/health` 与 router 挂载行；若对应 route 文件尚未创建会导致 require 失败。**实现顺序：** 在本步骤先注释掉尚未创建的 `app.use(...require...)` 行，仅保留 health；每完成后续任务再解开对应一行。

- [ ] **Step 4: 创建 index.js**

```js
const createApp = require('./app');
const app = createApp();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Ryan server running on http://localhost:${port}`));
```

- [ ] **Step 5: 写健康检查测试**

Create: `server/tests/health.test.js`

```js
const request = require('supertest');
const createApp = require('../src/app');

test('GET /api/health 返回 ok', async () => {
  const app = createApp();
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd server && npx jest tests/health.test.js`
Expected: PASS（先确保 app.js 中未创建的路由行已临时注释）。

- [ ] **Step 7: Commit**

```bash
git add server/src/supabase.js server/src/middleware/error.js server/src/app.js server/src/index.js server/tests/health.test.js
git commit -m "feat: express app skeleton with supabase client"
```

---

## Task 4: 测试夹具 helpers

**Files:**
- Create: `server/tests/helpers.js`

- [ ] **Step 1: 编写 helpers.js**

```js
const supabase = require('../src/supabase');

// 所有测试数据用此前缀，便于清理，避免污染种子数据
const TEST_PREFIX = '__test__';

async function createStore(overrides = {}) {
  const { data, error } = await supabase
    .from('stores')
    .insert({ name: `${TEST_PREFIX}门店`, address: `${TEST_PREFIX}地址`, ...overrides })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function createBarber(storeId, overrides = {}) {
  const { data, error } = await supabase
    .from('barbers')
    .insert({ store_id: storeId, name: `${TEST_PREFIX}理发师`, ...overrides })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function createService(overrides = {}) {
  const { data, error } = await supabase
    .from('services')
    .insert({ name: `${TEST_PREFIX}服务`, price: 100, ...overrides })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 清理所有测试数据（按外键顺序）
async function cleanup() {
  await supabase.from('appointments').delete().like('user_phone', `${TEST_PREFIX}%`);
  await supabase.from('barbers').delete().like('name', `${TEST_PREFIX}%`);
  await supabase.from('stores').delete().like('name', `${TEST_PREFIX}%`);
  await supabase.from('services').delete().like('name', `${TEST_PREFIX}%`);
}

module.exports = { TEST_PREFIX, createStore, createBarber, createService, cleanup };
```

- [ ] **Step 2: Commit**

```bash
git add server/tests/helpers.js
git commit -m "test: add supabase test fixtures"
```

---

## Task 5: 门店 API（公开查询 + 后台 CRUD）

**Files:**
- Create: `server/src/middleware/auth.js`
- Create: `server/src/routes/stores.js`
- Test: `server/tests/stores.test.js`

- [ ] **Step 1: 创建 auth 中间件**

```js
// 管理员鉴权：校验 Authorization: Bearer <ADMIN_TOKEN>
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (token && token === process.env.ADMIN_TOKEN) return next();
  const err = new Error('未授权');
  err.status = 401;
  next(err);
}

module.exports = { requireAdmin };
```

- [ ] **Step 2: 写失败测试**

```js
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
```

- [ ] **Step 3: 运行确认失败**

Run: `cd server && npx jest tests/stores.test.js`
Expected: FAIL（路由未实现 / Cannot find module './routes/stores'）。

- [ ] **Step 4: 实现 routes/stores.js**

```js
const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 公开：门店列表，支持 ?city= 与 ?keyword=
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('stores').select('*').order('created_at', { ascending: true });
    if (req.query.city) query = query.eq('city', req.query.city);
    if (req.query.keyword) query = query.ilike('name', `%${req.query.keyword}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 公开：门店详情（含理发师）
router.get('/:id', async (req, res, next) => {
  try {
    const { data: store, error } = await supabase
      .from('stores').select('*').eq('id', req.params.id).single();
    if (error) { const err = new Error('门店不存在'); err.status = 404; throw err; }
    const { data: barbers } = await supabase
      .from('barbers').select('*').eq('store_id', store.id).order('created_at');
    res.json({ ...store, barbers: barbers || [] });
  } catch (e) { next(e); }
});

// 后台：新增
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('stores').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

// 后台：修改
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('stores').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 后台：删除
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabase.from('stores').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 5: 在 app.js 解开 stores 路由挂载**

确保 `app.use('/api/stores', require('./routes/stores'));` 未被注释。

- [ ] **Step 6: 运行确认通过**

Run: `cd server && npx jest tests/stores.test.js`
Expected: PASS（需 .env 已配置真实 Supabase）。

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/auth.js server/src/routes/stores.js server/tests/stores.test.js server/src/app.js
git commit -m "feat: stores API with admin CRUD"
```

---

## Task 6: 理发师 API + 服务项目 API

**Files:**
- Create: `server/src/routes/services.js`
- Create: `server/src/utils/timeslots.js`
- Create: `server/src/routes/barbers.js`
- Test: `server/tests/barbers.test.js`

- [ ] **Step 1: 实现 services.js**

```js
const express = require('express');
const supabase = require('../supabase');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('services').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 2: 实现 utils/timeslots.js**

```js
// 生成 10:00-20:30 每 30 分钟时段
function generateSlots(start = '10:00', end = '20:30', stepMin = 30) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const pad = (n) => String(n).padStart(2, '0');
  const slots = [];
  for (let t = toMin(start); t <= toMin(end); t += stepMin) {
    slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return slots;
}

// 标记已占用：bookedTimes 为该理发师该日已被占用的时间数组
function withAvailability(slots, bookedTimes) {
  const taken = new Set(bookedTimes);
  return slots.map((time) => ({ time, available: !taken.has(time) }));
}

module.exports = { generateSlots, withAvailability };
```

- [ ] **Step 3: 写 timeslots 单元测试**

Create: `server/tests/timeslots.test.js`

```js
const { generateSlots, withAvailability } = require('../src/utils/timeslots');

test('生成时段含首尾，步长30分钟', () => {
  const slots = generateSlots('10:00', '11:00', 30);
  expect(slots).toEqual(['10:00', '10:30', '11:00']);
});

test('标记已占用时段', () => {
  const result = withAvailability(['10:00', '10:30'], ['10:00']);
  expect(result).toEqual([
    { time: '10:00', available: false },
    { time: '10:30', available: true },
  ]);
});
```

- [ ] **Step 4: 运行单元测试确认通过**

Run: `cd server && npx jest tests/timeslots.test.js`
Expected: PASS

- [ ] **Step 5: 写 barbers 失败测试**

```js
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
```

- [ ] **Step 6: 运行确认失败**

Run: `cd server && npx jest tests/barbers.test.js`
Expected: FAIL（Cannot find module './routes/barbers'）。

- [ ] **Step 7: 实现 routes/barbers.js**

```js
const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const { generateSlots, withAvailability } = require('../utils/timeslots');

const router = express.Router();

// 公开：列表，支持 ?store_id= & ?status=
router.get('/', async (req, res, next) => {
  try {
    let q = supabase.from('barbers').select('*').order('created_at');
    if (req.query.store_id) q = q.eq('store_id', req.query.store_id);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 公开：详情（含全部服务项目 + 指定日期可约时段）
router.get('/:id', async (req, res, next) => {
  try {
    const { data: barber, error } = await supabase
      .from('barbers').select('*').eq('id', req.params.id).single();
    if (error) { const err = new Error('理发师不存在'); err.status = 404; throw err; }

    const { data: services } = await supabase
      .from('services').select('*').order('sort_order');

    const date = req.query.date;
    let slots = [];
    if (date) {
      const { data: booked } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('barber_id', barber.id)
        .eq('appointment_date', date)
        .neq('status', 'cancelled');
      const bookedTimes = (booked || []).map((b) => b.appointment_time);
      slots = withAvailability(generateSlots(), bookedTimes);
    }
    res.json({ ...barber, services: services || [], slots });
  } catch (e) { next(e); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('barbers').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('barbers').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabase.from('barbers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 8: 在 app.js 解开 barbers 与 services 路由挂载**

- [ ] **Step 9: 运行确认通过**

Run: `cd server && npx jest tests/barbers.test.js tests/timeslots.test.js`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add server/src/routes/barbers.js server/src/routes/services.js server/src/utils/timeslots.js server/tests/barbers.test.js server/tests/timeslots.test.js server/src/app.js
git commit -m "feat: barbers + services API with time slots"
```

---

## Task 7: 预约 API（创建/我的/改约 + 后台列表/改状态）

**Files:**
- Create: `server/src/utils/orderNo.js`
- Create: `server/src/routes/appointments.js`
- Test: `server/tests/appointments.test.js`

- [ ] **Step 1: 实现 utils/orderNo.js**

```js
// 生成订单号：AP + YYMMDD + 6位随机数
function generateOrderNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `AP${yy}${mm}${dd}${rand}`;
}

module.exports = { generateOrderNo };
```

- [ ] **Step 2: 写失败测试**

```js
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
```

- [ ] **Step 3: 运行确认失败**

Run: `cd server && npx jest tests/appointments.test.js`
Expected: FAIL（Cannot find module './routes/appointments'）。

- [ ] **Step 4: 实现 routes/appointments.js**

```js
const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const { generateOrderNo } = require('../utils/orderNo');

const router = express.Router();

// 关联查询用的 select 串
const RELATIONS = '*, store:stores(*), barber:barbers(*), service:services(*)';

// 创建预约（小程序，演示态：直接标记 confirmed）
router.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    const insert = {
      order_no: generateOrderNo(),
      user_phone: body.user_phone,
      store_id: body.store_id,
      barber_id: body.barber_id,
      service_id: body.service_id,
      appointment_date: body.appointment_date,
      appointment_time: body.appointment_time,
      payment_method: body.payment_method || 'wechat',
      amount: body.amount || 0,
      remark: body.remark || null,
      status: 'confirmed',
    };
    const { data, error } = await supabase.from('appointments').insert(insert).select().single();
    if (error) {
      // 唯一约束冲突 -> 时段已被占用
      if (error.code === '23505') { const e = new Error('该时段已被预约'); e.status = 409; throw e; }
      throw error;
    }
    res.status(201).json(data);
  } catch (e) { next(e); }
});

// 我的预约（小程序）：?phone=&status=
router.get('/', async (req, res, next) => {
  try {
    if (!req.query.phone) { const e = new Error('缺少 phone'); e.status = 400; throw e; }
    let q = supabase.from('appointments').select(RELATIONS)
      .eq('user_phone', req.query.phone)
      .order('appointment_date', { ascending: false });
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 改约 / 取消（小程序）
router.put('/:id', async (req, res, next) => {
  try {
    const allowed = {};
    ['status', 'appointment_date', 'appointment_time'].forEach((k) => {
      if (req.body[k] !== undefined) allowed[k] = req.body[k];
    });
    const { data, error } = await supabase
      .from('appointments').update(allowed).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// 后台列表：?store_id=&date=&barber_id=&status=&page=&pageSize=
router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase.from('appointments').select(RELATIONS, { count: 'exact' })
      .order('appointment_date', { ascending: false }).range(from, to);
    if (req.query.store_id) q = q.eq('store_id', req.query.store_id);
    if (req.query.barber_id) q = q.eq('barber_id', req.query.barber_id);
    if (req.query.date) q = q.eq('appointment_date', req.query.date);
    if (req.query.status) q = q.eq('status', req.query.status);

    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ items: data, total: count, page, pageSize });
  } catch (e) { next(e); }
});

// 后台改状态
router.put('/admin/:id', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('appointments').update({ status: req.body.status }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
```

> 路由顺序注意：`/admin` 必须在 `/:id` 之前不冲突——此处 `/admin` 为 GET、`/:id` 为 PUT，方法不同无冲突；`/admin/:id` 为 PUT 且路径更具体，Express 按声明顺序匹配，已先声明 `PUT /:id`，故将 `PUT /admin/:id` 改写为独立前缀不会被 `/:id` 吞掉（`admin` 会被当作 id）。**修正：** 在 `PUT /:id` 处理器开头加保护：`if (req.params.id === 'admin') return next();` 以免误匹配。

- [ ] **Step 5: 在 PUT /:id 开头加保护行**

在 `router.put('/:id', ...)` 函数体第一行加入：

```js
if (req.params.id === 'admin') return next();
```

- [ ] **Step 6: 在 app.js 解开 appointments 路由挂载**

- [ ] **Step 7: 运行确认通过**

Run: `cd server && npx jest tests/appointments.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/appointments.js server/src/utils/orderNo.js server/tests/appointments.test.js server/src/app.js
git commit -m "feat: appointments API with conflict detection"
```

---

## Task 8: 图片上传到 Supabase Storage

**Files:**
- Create: `server/src/routes/upload.js`
- Test: `server/tests/upload.test.js`

- [ ] **Step 1: 写失败测试**

```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd server && npx jest tests/upload.test.js`
Expected: FAIL（Cannot find module './routes/upload'）。

- [ ] **Step 3: 实现 routes/upload.js**

```js
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const ALLOWED_BUCKETS = ['avatars', 'store-images'];

router.post('/', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    const bucket = req.query.bucket || 'avatars';
    if (!ALLOWED_BUCKETS.includes(bucket)) { const e = new Error('非法 bucket'); e.status = 400; throw e; }
    if (!req.file) { const e = new Error('缺少文件'); e.status = 400; throw e; }

    const ext = (req.file.originalname.split('.').pop() || 'png').toLowerCase();
    const path = `${Date.now()}-${uuidv4()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, req.file.buffer, {
      contentType: req.file.mimetype, upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    res.status(201).json({ url: data.publicUrl, path, bucket });
  } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 4: 在 app.js 解开 upload 路由挂载**

- [ ] **Step 5: 运行确认通过**

Run: `cd server && npx jest tests/upload.test.js`
Expected: PASS（需提前在 Supabase 建好 public bucket `avatars`、`store-images`）。

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/upload.js server/tests/upload.test.js server/src/app.js
git commit -m "feat: image upload to supabase storage"
```

---

## Task 9: 登录 API（小程序模拟登录 + 管理员登录）

**Files:**
- Create: `server/src/routes/auth.js`
- Test: 追加到 `server/tests/health.test.js` 或新建 `server/tests/auth.test.js`

- [ ] **Step 1: 写失败测试**

Create: `server/tests/auth.test.js`

```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd server && npx jest tests/auth.test.js`
Expected: FAIL。

- [ ] **Step 3: 实现 routes/auth.js**

```js
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
```

- [ ] **Step 4: 在 app.js 解开 auth 路由挂载**

- [ ] **Step 5: 运行确认通过**

Run: `cd server && npx jest tests/auth.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/auth.js server/tests/auth.test.js server/src/app.js
git commit -m "feat: mock login + admin login"
```

---

## Task 10: 数据总览 Dashboard API

**Files:**
- Create: `server/src/routes/dashboard.js`
- Test: `server/tests/dashboard.test.js`

- [ ] **Step 1: 写失败测试**

```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd server && npx jest tests/dashboard.test.js`
Expected: FAIL。

- [ ] **Step 3: 实现 routes/dashboard.js**

```js
const express = require('express');
const supabase = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

function dateStr(d) { return d.toISOString().slice(0, 10); }

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const today = new Date();
    const todayStr = dateStr(today);

    const [stores, barbers] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }),
      supabase.from('barbers').select('id', { count: 'exact', head: true }),
    ]);

    // 今日预约数
    const { count: todayCount } = await supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('appointment_date', todayStr).neq('status', 'cancelled');

    // 近 7 天趋势
    const trend = [];
    let weekCount = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const ds = dateStr(d);
      const { count } = await supabase.from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('appointment_date', ds).neq('status', 'cancelled');
      trend.push({ date: ds.slice(5), count: count || 0 });
      weekCount += count || 0;
    }

    // 本月营业额（已完成 + 已确认）
    const monthStart = dateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    const { data: monthAppts } = await supabase.from('appointments')
      .select('amount').gte('appointment_date', monthStart)
      .in('status', ['confirmed', 'completed']);
    const monthRevenue = (monthAppts || []).reduce((s, a) => s + Number(a.amount), 0);

    // 近期动态
    const { data: recent } = await supabase.from('appointments')
      .select('order_no, user_phone, status, created_at, store:stores(name), barber:barbers(name)')
      .order('created_at', { ascending: false }).limit(6);

    res.json({
      storeCount: stores.count || 0,
      barberCount: barbers.count || 0,
      todayCount: todayCount || 0,
      weekCount,
      monthRevenue,
      trend,
      recent: recent || [],
    });
  } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 4: 在 app.js 解开 dashboard 路由挂载**

- [ ] **Step 5: 运行确认通过**

Run: `cd server && npx jest tests/dashboard.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/dashboard.js server/tests/dashboard.test.js server/src/app.js
git commit -m "feat: dashboard stats API"
```

---

## Task 11: 种子数据脚本

**Files:**
- Create: `server/sql/seed.js`

- [ ] **Step 1: 编写 seed.js**

```js
require('dotenv').config();
const supabase = require('../src/supabase');

const SERVICES = [
  { name: '男士剪发(洗剪吹)', price: 128, duration: 45, sort_order: 1 },
  { name: '造型设计(含造型)', price: 168, duration: 60, sort_order: 2 },
  { name: '渐变·油头造型', price: 188, duration: 60, sort_order: 3 },
  { name: '烫发(纹理·定位)', price: 298, duration: 90, sort_order: 4 },
];

const STORES = [
  { name: '徐汇店', address: '上海市徐汇区漕溪北路18号 近地铁1/9/11号线徐家汇站', phone: '021-6433 5678', rating: 4.9, review_count: 1288 },
  { name: '静安店', address: '上海市静安区南京西路1266号 恒隆广场2期81-12', phone: '021-6288 1234', rating: 4.8, review_count: 986 },
  { name: '浦东店', address: '上海市浦东新区世纪大道88号 国金中心商场L2-15', phone: '021-5858 9012', rating: 4.9, review_count: 1103 },
  { name: '长宁店', address: '上海市长宁区天山路789号 城市中心公园旁', phone: '021-6233 4455', rating: 4.8, review_count: 765, status: 'closed' },
  { name: '黄浦店', address: '上海市黄浦区南京东路300号 新世界大丸百货82-03', phone: '021-6333 1122', rating: 4.8, review_count: 668 },
];

// 每店 4 名理发师
const BARBER_TEMPLATES = [
  { name: 'Ryan', title: '店长 · 高级发型师', specialties: ['男士剪发', '造型设计', '油头', '渐变'], years_experience: 10, rating: 4.9 },
  { name: '阿杰', title: '高级发型师', specialties: ['渐变', '纹理烫'], years_experience: 6, rating: 4.8 },
  { name: '大卫', title: '高级发型师', specialties: ['经典背头', '胡须修剪'], years_experience: 7, rating: 4.8 },
  { name: 'Leo', title: '发型师', specialties: ['油头', '染发'], years_experience: 4, rating: 4.7 },
];

async function main() {
  console.log('清理旧数据...');
  await supabase.from('appointments').delete().neq('order_no', '');
  await supabase.from('barbers').delete().neq('name', '');
  await supabase.from('stores').delete().neq('name', '');
  await supabase.from('services').delete().neq('name', '');

  console.log('写入服务项目...');
  await supabase.from('services').insert(SERVICES);

  console.log('写入门店与理发师...');
  for (const s of STORES) {
    const { data: store, error } = await supabase.from('stores')
      .insert({ ...s, status: s.status || 'open' }).select().single();
    if (error) throw error;
    const barbers = BARBER_TEMPLATES.map((b) => ({ ...b, store_id: store.id }));
    await supabase.from('barbers').insert(barbers);
  }

  // 管理员（如不存在）
  await supabase.from('admins').upsert(
    { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' },
    { onConflict: 'username' }
  );

  console.log('种子数据完成：5 门店 × 4 理发师 + 4 服务项目');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 运行种子脚本**

Run: `cd server && npm run seed`
Expected: 控制台打印「种子数据完成」，无报错。

- [ ] **Step 3: 验证数据**

Run: `cd server && node -e "require('dotenv').config(); require('./src/supabase').from('barbers').select('id').then(r=>console.log('barbers:', r.data.length))"`
Expected: `barbers: 20`

- [ ] **Step 4: Commit**

```bash
git add server/sql/seed.js
git commit -m "feat: seed data (5 stores x 4 barbers)"
```

> 注：头像图片在后台「理发师编辑」中通过上传补充；种子数据 avatar_url 为空，前端用占位图兜底。

---

## Task 12: 全量测试 + README

**Files:**
- Create: `server/README.md`

- [ ] **Step 1: 运行全部测试**

Run: `cd server && npm test`
Expected: 所有测试 PASS。

- [ ] **Step 2: 编写 README.md**

````markdown
# Ryan 理发馆后端

## 准备
1. 在 supabase.com 创建项目
2. SQL Editor 执行 `sql/schema.sql`
3. Storage 创建两个 **public** bucket：`avatars`、`store-images`
4. 复制 `.env.example` 为 `.env` 并填入 SUPABASE 三个值
5. `npm install`
6. `npm run seed` 灌入演示数据

## 运行
- `npm start` 启动服务（默认 http://localhost:3000）
- `npm test` 运行测试

## 默认管理员
admin / admin123
````

- [ ] **Step 3: Commit**

```bash
git add server/README.md
git commit -m "docs: backend README"
```

---

## Self-Review 记录

- **Spec 覆盖**：门店/理发师/服务/预约/上传/登录/Dashboard API 均有任务；时段冲突(Task7)、头像上传(Task8)、5×4 种子(Task11)、模拟登录与管理员(Task9)、演示态支付(Task7 直接 confirmed) 全覆盖。
- **类型一致**：状态枚举统一 `open/closed`、`active/resting`、`pending/confirmed/completed/cancelled`；关联查询统一用 `store/barber/service` 别名（前端据此取字段）。
- **占位符**：无 TODO/TBD，每步含完整代码与命令。
- **已知注意点**：`PUT /:id` 与 `/admin` 路径冲突已在 Task7 Step5 用保护行处理；测试依赖真实 Supabase 与已建 bucket。
