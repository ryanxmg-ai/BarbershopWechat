# 云端部署设计 · Ryan 男士理发馆

> 日期：2026-06-22
> 目标：把整套系统（小程序 + 后端 + 管理后台）部署到云端，先满足真机联调（开发/体验阶段），暂不处理正式上线的备案合规。

---

## 1. 目标与范围

把三端从本地 `localhost` 迁到云端，使小程序能在真机上联调：

- **后端 API**（Express）→ 部署到**微信云托管**（容器化），对外用云托管自带 HTTPS 默认域名。
- **小程序**（顾客端）→ 改为请求云托管域名，采用 **`wx.request` + request 合法域名白名单**（方案 A）。
- **管理后台**（Vue SPA）→ 部署到 **Vercel**，请求云托管后端（后端已开 CORS）。
- **数据库/存储** → 维持现有 **Supabase**（境外），本阶段不迁移。

非目标（本次不做）：ICP 备案、自定义域名、数据库迁移到腾讯云、生产级监控告警。

---

## 2. 总体架构

```
微信小程序(顾客端) ──HTTPS──┐
                            ├──→ 微信云托管(Express 容器) ──→ Supabase(PostgreSQL + Storage)
管理后台(Vercel, 浏览器) ─HTTPS┘
```

- 后端是无状态 API 容器，水平可扩展；状态全在 Supabase。
- 小程序与后台都通过 HTTPS 调用同一套 `/api` 接口。

---

## 3. 各组件部署设计

### 3.1 后端 → 微信云托管

**容器化**：后端当前 `app.listen(process.env.PORT || 3000)`，已适配容器。新增：

- `server/Dockerfile`：基于 `node:20-slim`，`npm ci --omit=dev` 安装生产依赖，`CMD ["node", "src/index.js"]`。
- `server/.dockerignore`：排除 `node_modules`、`.env`、`.jest-tmp`、`tests`、`*.log` 等。

**端口**：云托管创建服务时填「监听端口」。约定 `3000`，与代码默认值一致；若云托管注入 `PORT` 环境变量，代码会自动采用，无需改动。

**环境变量**（在云托管服务「环境变量」中配置，**不进仓库**）：
`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`、`ADMIN_TOKEN`。

**默认域名**：在云托管服务开启「默认公网域名」，得到形如
`https://<service>-<id>.<region>.app.tcloudbase.com` 的 HTTPS 地址（腾讯已签发证书，无需备案）。

### 3.2 小程序 → 方案 A（wx.request + 白名单）

- `miniprogram/app.js`：把 `globalData.apiBase` 从 `http://127.0.0.1:3000/api` 改为云托管域名 `https://<云托管域名>/api`。做成可切换：保留一个 `useLocal` 开关或 dev/prod 两个常量，便于本地与云端切换。
- 在**微信公众平台 → 开发管理 → 开发设置 → 服务器域名**，把云托管默认域名加入 **request 合法域名**。
- `request.js` 的超时提示文案里写死的 `localhost:3000` 一并改为中性文案。

### 3.3 管理后台 → Vercel

- 路由为 **hash 模式**（`createWebHashHistory`），静态托管**无需** SPA 回退/重写配置。
- API 基址通过 `VITE_API_BASE` 注入。新增 `admin/.env.production`（或在 Vercel 项目环境变量中设置）：
  `VITE_API_BASE=https://<云托管域名>/api`
- Vercel 项目配置：Root Directory = `admin`，Build Command = `npm run build`，Output Directory = `dist`。
- 后端 CORS 当前为 `cors()`（允许所有来源），Vercel 域名可直接访问；后续可收紧为白名单。

---

## 4. 代码改动清单

| 文件 | 改动 |
| --- | --- |
| `server/Dockerfile` | 新增，容器化后端 |
| `server/.dockerignore` | 新增，精简镜像、排除敏感文件 |
| `miniprogram/app.js` | `apiBase` 改为云托管域名，支持 dev/prod 切换 |
| `miniprogram/utils/request.js` | 失败提示文案去掉 `localhost:3000` |
| `admin/.env.production` | 新增，`VITE_API_BASE` 指向云托管域名 |
| `docs/deploy.md` | 新增，端到端部署手册 |

> 真实云托管域名在控制台开通后才会产生。代码中先用占位符（如 `REPLACE_WITH_CLOUDRUN_DOMAIN`），开通后替换并说明在部署文档里。

---

## 5. 需在控制台手动完成的步骤（写入 docs/deploy.md）

1. 开通微信云托管（微信公众平台，有免费额度）。
2. 新建环境与服务，监听端口 3000，配置上述环境变量。
3. 上传/部署后端代码（控制台上传或 Git 接入），等待构建运行。
4. 开启默认公网域名，记下域名。
5. 用域名替换 `app.js` 与 `admin/.env.production` 中的占位符。
6. 公众平台把域名加入 request 合法域名白名单。
7. Vercel 导入仓库、设置 Root Directory=`admin` 与环境变量，部署。
8. 微信开发者工具上传**体验版**，真机扫码联调。

---

## 6. 错误处理与验证

- **健康检查**：`GET /api/health` 返回 `{ ok: true }`，用于云托管探活与部署后冒烟测试。
- **联调验证顺序**：
  1. 浏览器直接访问 `https://<云托管域名>/api/health` 应返回 ok。
  2. 后台（Vercel）登录并加载数据总览，确认能打通后端。
  3. 小程序体验版真机：门店列表 → 选理发师 → 下单 → 「我的」查看订单。
- **常见失败**：小程序报「不在以下 request 合法域名列表中」→ 白名单未配；后台 CORS 报错 → 确认后端已部署且 `VITE_API_BASE` 正确。

---

## 7. 后续（不在本次范围）

- 数据库迁移：Supabase（境外）→ 腾讯云 PostgreSQL，解决跨境延迟。
- 自定义域名 + ICP 备案，用于正式发布。
- CORS 收紧为后台域名白名单。
- 云托管监控、日志、自动扩缩容策略。
