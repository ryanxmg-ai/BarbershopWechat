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
