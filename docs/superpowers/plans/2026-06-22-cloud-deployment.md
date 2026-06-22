# 云端部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把后端容器化部署到微信云托管、小程序改连云托管 HTTPS 域名、管理后台部署到 Vercel，使三端在云上联调。

**Architecture:** 后端 Express 打包为 Docker 容器跑在微信云托管（自带 HTTPS 默认域名）；小程序用 `wx.request` 调云托管域名并配 request 合法域名白名单；管理后台为 Vue hash-路由 SPA，构建后托管到 Vercel；数据库维持 Supabase。

**Tech Stack:** Node 20 · Express · Docker · 微信云托管 · 微信小程序原生 · Vue 3 + Vite · Vercel · Supabase

参考设计：`docs/superpowers/specs/2026-06-22-cloud-deployment-design.md`

> 说明：本计划只产出**代码与文档改动**。开通云托管、配置环境变量、加白名单、Vercel 导入、上传体验版等**控制台操作**由 `docs/deploy.md`（Task 4）记录，需用户手动执行。
> 占位符约定：真实云托管域名未知前，代码中统一用 `REPLACE_WITH_CLOUDRUN_DOMAIN`，开通后按 Task 5 替换。

---

## 文件结构

| 文件 | 责任 | 动作 |
| --- | --- | --- |
| `server/Dockerfile` | 后端容器构建定义 | 新增 |
| `server/.dockerignore` | 精简镜像、排除敏感/无关文件 | 新增 |
| `miniprogram/app.js` | apiBase 支持 dev/prod 切换 | 修改 |
| `miniprogram/utils/request.js` | 失败提示文案去本地化 | 修改 |
| `admin/.env.production` | 生产构建的 API 基址 | 新增 |
| `admin/.env.development` | 本地开发的 API 基址（显式化） | 新增 |
| `docs/deploy.md` | 端到端部署手册（控制台步骤） | 新增 |

---

## Task 1: 后端容器化（Dockerfile + .dockerignore）

**Files:**
- Create: `server/Dockerfile`
- Create: `server/.dockerignore`

- [ ] **Step 1: 创建 `server/.dockerignore`**

```
node_modules
npm-debug.log
.env
.env.example
.jest-tmp
tests
scripts
*.log
.DS_Store
.git
```

- [ ] **Step 2: 创建 `server/Dockerfile`**

```dockerfile
# 微信云托管 / 通用 Node 容器
FROM node:20-slim

WORKDIR /app

# 先拷贝依赖清单，利用层缓存
COPY package*.json ./
RUN npm ci --omit=dev

# 拷贝源码
COPY . .

# 云托管监听端口（与 app.listen(process.env.PORT||3000) 一致）
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]
```

- [ ] **Step 3: 本地构建镜像验证**

Run: `docker build -t ryan-server ./server`
Expected: 构建成功，最后输出 `naming to docker.io/library/ryan-server` 或 `writing image ... done`。

- [ ] **Step 4: 本地运行容器并冒烟测试**

Run:
```bash
docker run -d --name ryan-test -p 3001:3000 --env-file server/.env ryan-server
sleep 2
curl -s http://localhost:3001/api/health
```
Expected: 输出 `{"ok":true}`

- [ ] **Step 5: 清理测试容器**

Run: `docker rm -f ryan-test`
Expected: 输出容器名 `ryan-test`

- [ ] **Step 6: 提交**

```bash
git add server/Dockerfile server/.dockerignore
git commit -m "feat(server): containerize for WeChat Cloud Run"
```

---

## Task 2: 小程序 API 基址支持 dev/prod 切换

**Files:**
- Modify: `miniprogram/app.js`
- Modify: `miniprogram/utils/request.js`

- [ ] **Step 1: 改写 `miniprogram/app.js`**

将整个文件替换为：

```javascript
// API 基址：本地联调用 dev，云端/真机体验用 prod
const API_BASE = {
  dev: 'http://127.0.0.1:3000/api',
  prod: 'https://REPLACE_WITH_CLOUDRUN_DOMAIN/api',
};
// 切换环境：本地开发改成 'dev'，上云/真机改成 'prod'
const ENV = 'prod';

App({
  globalData: {
    apiBase: API_BASE[ENV],
    phone: '',
  },
  onLaunch() {
    const phone = wx.getStorageSync('phone');
    if (phone) this.globalData.phone = phone;
  },
});
```

- [ ] **Step 2: 改 `miniprogram/utils/request.js` 的失败提示文案**

找到（约第 16-18 行）：

```javascript
        const msg = err && err.errMsg && err.errMsg.indexOf('timeout') >= 0
          ? '连接后端超时，请确认后端已启动(localhost:3000)'
          : '网络请求失败，请检查后端服务';
```

替换为：

```javascript
        const msg = err && err.errMsg && err.errMsg.indexOf('timeout') >= 0
          ? '连接服务器超时，请稍后重试'
          : '网络请求失败，请检查网络连接';
```

- [ ] **Step 3: 校验 JS 语法**

Run: `node --check miniprogram/app.js && node --check miniprogram/utils/request.js`
Expected: 无输出（退出码 0），表示语法正确。

- [ ] **Step 4: 提交**

```bash
git add miniprogram/app.js miniprogram/utils/request.js
git commit -m "feat(mp): switchable dev/prod apiBase + neutral error copy"
```

---

## Task 3: 管理后台生产环境变量

**Files:**
- Create: `admin/.env.production`
- Create: `admin/.env.development`

- [ ] **Step 1: 创建 `admin/.env.development`**（显式化本地基址）

```
VITE_API_BASE=http://localhost:3000/api
```

- [ ] **Step 2: 创建 `admin/.env.production`**

```
VITE_API_BASE=https://REPLACE_WITH_CLOUDRUN_DOMAIN/api
```

- [ ] **Step 3: 确认旧的 `admin/.env` 不再干扰生产构建**

Vite 在 `npm run build`（mode=production）时会优先读取 `.env.production`，再读 `.env`。`.env.production` 的 `VITE_API_BASE` 会覆盖 `.env` 中的同名值，无需删除 `.env`。
Run: `cat admin/.env`
Expected: 仍为 `VITE_API_BASE=http://localhost:3000/api`（保留，作为通用兜底）。

- [ ] **Step 4: 生产构建验证（占位符应被打进产物）**

Run:
```bash
cd admin && npm install && npm run build && grep -rl "REPLACE_WITH_CLOUDRUN_DOMAIN" dist/assets | head -1; cd ..
```
Expected: 至少打印一个 `dist/assets/*.js` 文件名，说明 `.env.production` 的基址已编译进产物。

- [ ] **Step 5: 提交**

```bash
git add admin/.env.production admin/.env.development
git commit -m "feat(admin): add dev/prod VITE_API_BASE env files"
```

---

## Task 4: 部署手册 docs/deploy.md

**Files:**
- Create: `docs/deploy.md`

- [ ] **Step 1: 创建 `docs/deploy.md`**

```markdown
# 部署手册 · Ryan 男士理发馆

本系统三端部署：后端→微信云托管，小程序→真机体验版，后台→Vercel。数据库维持 Supabase。

## 一、后端：微信云托管

1. **开通服务**：微信公众平台 → 左侧「云托管」→ 开通（有免费额度）。
2. **新建环境**：创建一个环境（如 `prod`），选择地域（如上海）。
3. **新建服务**：服务名如 `ryan-server`，部署方式选「本地代码/Git 仓库」，构建用仓库内 `server/Dockerfile`。
4. **监听端口**：填 `3000`。
5. **环境变量**（服务设置 → 环境变量，逐项填写，**切勿写进仓库**）：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `ADMIN_TOKEN`
   （取值见本地 `server/.env`）
6. **部署**：上传 `server/` 目录代码或接入 Git，触发构建，等待服务运行（实例数 ≥ 1）。
7. **开启默认域名**：服务 → 「开启默认公网域名」，记下形如
   `https://ryan-server-xxxx.sh.run.tcloudbase.com` 的地址。
8. **冒烟测试**：浏览器访问 `https://<云托管域名>/api/health`，应返回 `{"ok":true}`。

## 二、小程序：连云托管 + 白名单 + 体验版

1. **替换域名**：把 `miniprogram/app.js` 里 `REPLACE_WITH_CLOUDRUN_DOMAIN` 改成云托管域名（不含 `https://` 前缀，只填主机名）。确认 `ENV = 'prod'`。
2. **配白名单**：微信公众平台 → 开发管理 → 开发设置 → 服务器域名 → 「request 合法域名」添加 `https://<云托管域名>`。
3. **真机体验**：微信开发者工具 → 上传 → 在管理后台设为「体验版」→ 手机微信扫码体验。
4. **验证**：门店列表 → 选理发师 → 下单 → 「我的」查看订单。

## 三、管理后台：Vercel

1. 登录 [vercel.com](https://vercel.com)，Import 本仓库。
2. 项目设置：
   - **Root Directory**：`admin`
   - **Build Command**：`npm run build`
   - **Output Directory**：`dist`
   - **Environment Variables**：`VITE_API_BASE = https://<云托管域名>/api`
     （或保留仓库内 `admin/.env.production` 并在其中替换占位符）
3. Deploy，得到 `https://<project>.vercel.app`。
4. 验证：访问该地址，用 `ADMIN_USERNAME/ADMIN_PASSWORD` 登录，确认数据总览能加载。

## 四、常见问题

- 小程序报「不在以下 request 合法域名列表中」→ 第二步白名单未配或域名拼写错误。
- 后台登录后空白/请求失败 → 确认 `VITE_API_BASE` 正确、后端实例在运行、`/api/health` 可访问。
- 跨境慢：后端在国内访问境外 Supabase 有延迟，属已知现象，正式上线建议迁库（见设计文档「后续」）。
```

- [ ] **Step 2: 提交**

```bash
git add docs/deploy.md
git commit -m "docs: end-to-end cloud deployment runbook"
```

---

## Task 5: 开通云托管后替换真实域名（部署期执行）

> 此任务在用户完成 Task 4 手册「一、后端」拿到真实云托管域名后执行。

**Files:**
- Modify: `miniprogram/app.js`
- Modify: `admin/.env.production`

- [ ] **Step 1: 全局替换占位符**

把 `<云托管域名>` 替换为真实主机名（如 `ryan-server-xxxx.sh.run.tcloudbase.com`）：

Run:
```bash
grep -rl "REPLACE_WITH_CLOUDRUN_DOMAIN" miniprogram/app.js admin/.env.production
```
Expected: 列出这两个文件，确认占位符位置。

然后手动用真实域名替换两处 `REPLACE_WITH_CLOUDRUN_DOMAIN`。

- [ ] **Step 2: 确认无残留占位符**

Run: `grep -rn "REPLACE_WITH_CLOUDRUN_DOMAIN" miniprogram admin || echo "无残留"`
Expected: 输出 `无残留`

- [ ] **Step 3: 提交并推送**

```bash
git add miniprogram/app.js admin/.env.production
git commit -m "chore: point clients to real cloud run domain"
git push origin main
```

---

## 验证清单（部署完成后）

1. `https://<云托管域名>/api/health` → `{"ok":true}`
2. Vercel 后台登录 → 数据总览正常加载
3. 小程序体验版真机：门店 → 理发师 → 下单 → 我的订单 全链路通
