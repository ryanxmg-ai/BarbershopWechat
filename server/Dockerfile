# 微信云托管 / 通用 Node 容器
FROM node:22-slim

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
