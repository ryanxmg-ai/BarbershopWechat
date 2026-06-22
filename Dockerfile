# 微信云托管入口 Dockerfile（构建上下文 = 仓库根目录，仅打包 server/）
# 说明：云托管绑定 GitHub 时默认在仓库根目录找 Dockerfile，故置于此。
# 本地针对 server 目录单独构建可用 server/Dockerfile。
FROM node:22-slim

WORKDIR /app

# 先拷贝依赖清单，利用层缓存
COPY server/package*.json ./
RUN npm ci --omit=dev

# 拷贝后端源码
COPY server/ ./

# 监听端口（与 app.listen(process.env.PORT||3000) 一致；云托管会注入 PORT 覆盖）
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]
