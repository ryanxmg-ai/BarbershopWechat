# Ryan 男士理发馆连锁预约系统 — 设计方案

> 日期：2026-06-17
> 状态：已确认，待编写实现计划

## 1. 背景与目标

为「Ryan 男士理发馆」连锁（上海，5 家门店，每店 4 名理发师，共 20 名理发师）开发一套预约系统，包含两端：

1. **客户端**：微信原生小程序「Ryan 男士理发馆」——按门店查找理发师并预约。
2. **商家端**：Web 管理后台（Vue 3 + Element Plus）——管理门店、理发师、查看预约；理发师头像可上传并保存。

UI 严格对照参考图实现：
- `微信小程序前端.png`（深绿 + 金色高级男士风，6 个页面）
- `商家管理后台系统.png`（左侧导航 + 数据总览/管理表格/编辑弹窗）

**项目定位**：本地演示 / 原型。登录与支付为模拟态，不接入真实微信登录与微信支付。

## 2. 技术选型（已确认）

| 部分 | 选型 |
| --- | --- |
| 小程序前端 | 微信原生小程序（WXML/WXSS/JS），微信开发者工具预览 |
| 后台前端 | Vue 3 + Element Plus + Vite |
| 后端 | Node.js + Express |
| 数据库 | Supabase（云端免费项目，Postgres） |
| 文件存储 | Supabase Storage 公开 bucket |
| 后端访问 Supabase | `@supabase/supabase-js`，使用 service role key |

后端同时服务小程序和后台；前端均只调用后端自有 API，不直连 Supabase。

## 3. 总体架构

```
Ryanwechat/
├── server/                Node + Express + @supabase/supabase-js
│   ├── src/
│   │   ├── index.js        应用入口
│   │   ├── supabase.js     Supabase 客户端（service role）
│   │   ├── routes/         路由（stores / barbers / services / appointments / auth / admin / upload）
│   │   ├── controllers/    业务逻辑
│   │   └── middleware/     管理员鉴权、错误处理
│   ├── sql/
│   │   ├── schema.sql      建表 + 索引（在 Supabase SQL Editor 执行）
│   │   └── seed.js         种子脚本（5 门店 × 4 理发师 + 服务项目 + 管理员）
│   ├── tests/              Jest + Supertest
│   ├── .env.example        SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / PORT / ADMIN_*
│   └── package.json
├── miniprogram/           微信原生小程序（6 个页面）
└── admin/                 Vue 3 + Element Plus + Vite（核心四模块）
```

**运行前置条件**：用户需在 supabase.com 创建免费项目，执行 `sql/schema.sql` 建表，创建 `avatars` 与 `store-images` 两个公开 Storage bucket，并把 URL 与 keys 填入 `server/.env`，最后运行 `seed.js` 灌入演示数据。

## 4. 数据模型（Supabase Postgres）

### stores 门店
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| name | text | 门店名，如「徐汇店」 |
| address | text | 地址 |
| business_hours | text | 营业时间，如「10:00-22:00」 |
| phone | text | 联系电话 |
| images | jsonb | 门店图片 URL 数组 |
| status | text | `open`（营业中）/ `closed`（休息中） |
| rating | numeric | 评分，如 4.9 |
| review_count | int | 评价数 |
| city | text | 默认「上海」 |
| created_at | timestamptz | |

### barbers 理发师
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| store_id | uuid FK→stores | 所属门店 |
| name | text | 姓名，如 Ryan / 阿杰 |
| title | text | 店长 / 高级发型师 / 发型师 |
| avatar_url | text | Supabase Storage 公开 URL |
| specialties | jsonb | 擅长项目数组，如 ["油头","渐变","纹理烫"] |
| rating | numeric | 评分 |
| review_count | int | 评价数 |
| years_experience | int | 从业年限 |
| bio | text | 简介 |
| status | text | `active`（在职）/ `resting`（休息） |
| created_at | timestamptz | |

### services 服务项目（全局目录）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| name | text | 男士剪发(洗剪吹) / 造型设计(含造型) / 渐变·油头造型 / 烫发(纹理·定位) |
| price | numeric | 价格，如 128 |
| duration | int | 时长（分钟），用于排期，默认 30 |
| sort_order | int | 排序 |

### appointments 预约
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| order_no | text unique | 订单号，如 AP240521001 |
| user_phone | text | 顾客手机号（模拟登录身份） |
| store_id | uuid FK | |
| barber_id | uuid FK | |
| service_id | uuid FK | |
| appointment_date | date | 预约日期 |
| appointment_time | text | 预约时段，如「13:30」 |
| status | text | `pending`(待确认) / `confirmed`(已确认) / `completed`(已完成) / `cancelled`(已取消) |
| payment_method | text | `wechat` / `balance` |
| amount | numeric | 金额 |
| remark | text | 备注 |
| created_at | timestamptz | |

唯一约束：`(barber_id, appointment_date, appointment_time)` 在非取消状态下唯一，用于防止时段冲突。

### admins 管理员
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| username | text unique | 默认 admin |
| password | text | 演示态明文/简单哈希，默认 admin123 |

### 时段说明
不建表。可约时段按门店营业时间在 10:00–20:30 间每 30 分钟动态生成；查询某理发师某天时，已被 `pending/confirmed` 占用的时段标记为不可选。

## 5. 后端 API

### 小程序（公开）
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/auth/login | 模拟登录，传手机号，返回用户标识 |
| GET | /api/stores | 门店列表，支持 city、关键词搜索 |
| GET | /api/stores/:id | 门店详情（含该店理发师列表） |
| GET | /api/barbers/:id | 理发师详情（含服务项目 + 指定日期可约时段） |
| GET | /api/services | 服务项目目录 |
| POST | /api/appointments | 创建预约（校验时段冲突，生成订单号，标记支付成功） |
| GET | /api/appointments?phone=&status= | 我的预约，按状态筛选（待服务/已完成/已取消） |
| PUT | /api/appointments/:id | 改约 / 取消 |

### 后台（需管理员鉴权）
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/admin/login | 管理员登录，返回 token |
| GET | /api/admin/dashboard | 统计卡 + 近 7 天预约趋势 + 近期动态 |
| GET/POST/PUT/DELETE | /api/admin/stores | 门店增删改查 |
| GET/POST/PUT/DELETE | /api/admin/barbers | 理发师增删改查（含头像 URL） |
| GET | /api/admin/appointments | 预约列表，按门店/日期/理发师/状态筛选 + 分页 |
| PUT | /api/admin/appointments/:id | 修改预约状态 |
| POST | /api/upload | 图片上传到 Supabase Storage，返回公开 URL（bucket 参数区分 avatars / store-images） |

鉴权：管理员登录返回简单 token（演示态），后台接口校验 `Authorization` 头。

## 6. 前端页面

### 小程序（6 个页面，深绿 + 金色风，底部 tab：首页/门店/预约/我的）
1. **首页**：Logo、城市选择（上海）、「立即预约」、快捷入口（找门店/选理发师/我的预约/会员中心）、连锁门店网格。
2. **门店列表**：城市下拉、搜索、门店卡片（图片/名称/状态/距离/评分/评价数）。
3. **门店详情**：门店图、信息、电话/导航/收藏、理发师团队网格（查看排班）。
4. **理发师详情与预约**：头像/姓名/职级/评分/从业年限/关注、服务项目单选列表、日期 tab + 时段选择、「下一步」。
5. **预约确认**：预约信息、顾客信息（手机号/备注）、支付方式（微信支付/余额支付）、「确认并支付」。
6. **我的预约**：tab 待服务/已完成/已取消，预约卡片（查看凭证/修改预约/再来一单）。

> 距离字段为演示展示用静态值或简单计算；收藏/关注/会员中心为前端占位交互。

### 后台（左侧导航，核心四模块 + 占位菜单）
1. **数据总览**：统计卡（门店数/理发师数/今日预约/本周预约/本月营业额）、近 7 天预约趋势折线图、近期动态列表。
2. **门店管理**：表格（名称/地址/营业时间/电话/操作）、新增门店、编辑/删除弹窗（含门店图片上传）、分页。
3. **理发师管理**：筛选 tab（全部/在职/休息）、搜索、门店/状态筛选、卡片网格（头像/姓名/门店/擅长/状态/编辑·停用）、新增/编辑弹窗（含头像上传）。
4. **预约管理**：筛选（门店/日期/理发师/状态）、表格（时间/订单号/顾客/门店/理发师/服务/状态/操作）、改状态、分页。

占位菜单：会员管理、营销管理、评价管理、系统设置——点击显示「开发中」。

## 7. 登录与支付（演示态）

- 小程序：模拟登录，手机号即身份；预约记录挂在该手机号下。无真实微信授权。
- 支付：选择支付方式后直接标记成功，不接真实支付。
- 后台：固定管理员账号（admin / admin123）登录。

## 8. 测试

- 后端用 Jest + Supertest 覆盖关键路径：创建预约、时段冲突拦截、门店/理发师 CRUD、图片上传、预约筛选。
- 测试连真实 Supabase 项目运行；测试数据使用专用前缀并在用例后清理，避免污染种子数据。
- 前端以手动跑通完整预约流程与后台管理流程为主。

## 9. 非目标（YAGNI）

- 不实现真实微信登录、微信支付、短信验证码。
- 后台会员/营销/评价/系统设置仅占位，不实现业务逻辑。
- 不做多语言、不做复杂权限角色（仅单一管理员）。
- 距离计算、收藏、关注、会员中心为展示/占位级别。
