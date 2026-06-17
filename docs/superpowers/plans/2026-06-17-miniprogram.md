# Ryan 理发馆 — 微信小程序 (Mini Program) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用微信原生小程序实现客户端 6 个页面（首页、门店列表、门店详情、理发师详情与预约、预约确认、我的预约），对照 `微信小程序前端.png`（深绿+金色风），完成「按门店找理发师 → 选服务/时段 → 确认下单 → 查看我的预约」全流程。

**Architecture:** 微信原生小程序（WXML/WXSS/JS）。底部 4 个 tab（首页/门店/预约/我的）。封装统一请求模块 `utils/request.js` 调后端 API；模拟登录后把手机号存 storage 作身份。全局主题色与公共样式放 `app.wxss`。

**Tech Stack:** 微信小程序原生框架，微信开发者工具预览。

**前置条件：** 后端运行在 `http://localhost:3000` 且已 seed。开发者工具需勾选「不校验合法域名」（本地演示）。

**验证方式：** 微信开发者工具中手动跑通，每个任务给出预期界面/交互。

---

## File Structure

```
miniprogram/
├── project.config.json
├── app.json                导航/tab 配置
├── app.js                  全局：API base、登录态
├── app.wxss                全局主题样式
├── utils/
│   └── request.js          封装 wx.request
└── pages/
    ├── index/              首页
    ├── stores/             门店列表
    ├── store-detail/       门店详情
    ├── barber/             理发师详情与预约
    ├── confirm/            预约确认
    └── my/                 我的预约
```

每个 page 目录含 `.wxml / .wxss / .js / .json` 四个文件。

---

## Task 1: 小程序骨架与全局配置

**Files:**
- Create: `miniprogram/project.config.json`, `miniprogram/app.json`, `miniprogram/app.js`, `miniprogram/app.wxss`
- Create: `miniprogram/utils/request.js`

- [ ] **Step 1: project.config.json**

```json
{
  "appid": "touristappid",
  "compileType": "miniprogram",
  "libVersion": "latest",
  "projectname": "ryan-barber",
  "setting": { "urlCheck": false, "es6": true, "postcss": true, "minified": true }
}
```

> `urlCheck:false` 允许本地 http 调用；预览时用「测试号 / 游客模式」。

- [ ] **Step 2: app.json**

```json
{
  "pages": [
    "pages/index/index",
    "pages/stores/stores",
    "pages/store-detail/store-detail",
    "pages/barber/barber",
    "pages/confirm/confirm",
    "pages/my/my"
  ],
  "window": {
    "navigationBarBackgroundColor": "#1f3026",
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "Ryan 男士理发馆",
    "backgroundColor": "#f4f5f3"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#c9a96a",
    "backgroundColor": "#ffffff",
    "list": [
      { "pagePath": "pages/index/index", "text": "首页" },
      { "pagePath": "pages/stores/stores", "text": "门店" },
      { "pagePath": "pages/my/my", "text": "我的" }
    ]
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

> 说明：截图底部为「首页/门店/预约/我的」。「预约」实为进入预约流程的入口而非独立 tab 页，这里把 tab 精简为首页/门店/我的三项以匹配实际页面；首页含「立即预约」入口覆盖「预约」语义。如需 4 个 tab，可把 `my` 复用为预约入口——保持当前 3 tab 实现以避免空页。

- [ ] **Step 3: 创建 sitemap.json**

Create: `miniprogram/sitemap.json`

```json
{ "rules": [{ "action": "allow", "page": "*" }] }
```

- [ ] **Step 4: app.js**

```js
App({
  globalData: {
    apiBase: 'http://localhost:3000/api',
    phone: '',
  },
  onLaunch() {
    const phone = wx.getStorageSync('phone');
    if (phone) this.globalData.phone = phone;
  },
});
```

- [ ] **Step 5: app.wxss（全局主题）**

```css
page { background: #f4f5f3; font-family: -apple-system, "PingFang SC", sans-serif; }
.ryan-dark { color: #1f3026; }
.ryan-gold { color: #c9a96a; }
.btn-gold {
  background: linear-gradient(90deg, #c9a96a, #e3d4b0);
  color: #1f3026; font-weight: 600; border-radius: 999rpx;
  text-align: center; padding: 24rpx 0;
}
.card { background: #fff; border-radius: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.05); }
.tag-open { color: #2e7d32; background: #e8f5e9; padding: 2rpx 12rpx; border-radius: 6rpx; font-size: 22rpx; }
.tag-closed { color: #999; background: #eee; padding: 2rpx 12rpx; border-radius: 6rpx; font-size: 22rpx; }
.rate { color: #c9a96a; font-size: 24rpx; }
.muted { color: #8a958e; font-size: 24rpx; }
```

- [ ] **Step 6: utils/request.js**

```js
const app = getApp();

function request(path, { method = 'GET', data } = {}) {
  const base = getApp().globalData.apiBase;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}${path}`,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(res.data);
      },
      fail: reject,
    });
  });
}

module.exports = { request };
```

- [ ] **Step 7: 在开发者工具打开项目验证**

打开微信开发者工具 → 导入 `miniprogram` 目录 → 游客模式。
Expected: 编译通过（页面文件下一任务创建前会提示缺页，先创建各页空文件让其编译——见下步）。

- [ ] **Step 8: 为 6 个页面创建空骨架文件**

为每个 page 创建四件套占位，使项目可编译。以 `index` 为例（其余同构）：
- `pages/index/index.json`: `{ "navigationBarTitleText": "Ryan 男士理发馆" }`
- `pages/index/index.wxml`: `<view>首页</view>`
- `pages/index/index.wxss`: ``（空）
- `pages/index/index.js`: `Page({})`

对 `stores / store-detail / barber / confirm / my` 重复（标题分别为 门店列表/门店详情/理发师详情/预约确认/我的预约）。

- [ ] **Step 9: 验证编译**

Expected: 开发者工具编译成功，底部出现 3 个 tab，各页显示占位文字。

- [ ] **Step 10: Commit**

```bash
git add miniprogram
git commit -m "chore: scaffold wechat mini program"
```

---

## Task 2: 首页

**Files:**
- Modify: `miniprogram/pages/index/index.{js,wxml,wxss}`

- [ ] **Step 1: index.js**

```js
const { request } = require('../../utils/request');

Page({
  data: { stores: [] },
  onShow() {
    request('/stores?city=上海').then((stores) => this.setData({ stores: stores.slice(0, 4) }));
  },
  goStores() { wx.switchTab({ url: '/pages/stores/stores' }); },
  goStore(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/store-detail/store-detail?id=${id}` });
  },
  goMy() { wx.switchTab({ url: '/pages/my/my' }); },
});
```

- [ ] **Step 2: index.wxml**

```xml
<view class="hero">
  <view class="brand">RYAN</view>
  <view class="brand-sub">男士理发馆</view>
  <view class="slogan">专注男士美发 · 型格东方</view>
  <view class="since">SINCE 2015 · SHANGHAI</view>
  <view class="btn-gold book-btn" bindtap="goStores">立即预约</view>
</view>

<view class="quick">
  <view class="quick-item" bindtap="goStores"><view class="q-ic">🏬</view><text>找门店</text></view>
  <view class="quick-item" bindtap="goStores"><view class="q-ic">✂️</view><text>选理发师</text></view>
  <view class="quick-item" bindtap="goMy"><view class="q-ic">📅</view><text>我的预约</text></view>
  <view class="quick-item"><view class="q-ic">💳</view><text>会员中心</text></view>
</view>

<view class="section-head">
  <text>连锁门店 · 上海</text>
  <text class="more" bindtap="goStores">查看更多 ›</text>
</view>
<view class="store-grid">
  <view class="store-cell card" wx:for="{{stores}}" wx:key="id" data-id="{{item.id}}" bindtap="goStore">
    <image class="store-img" src="{{item.images[0] || '/images/placeholder-store.png'}}" mode="aspectFill" />
    <view class="store-name">{{item.name}}</view>
    <view class="muted">{{item.address}}</view>
  </view>
</view>
```

- [ ] **Step 3: index.wxss**

```css
.hero { background: linear-gradient(160deg, #1f3026, #16241c); color: #fff; padding: 60rpx 40rpx 50rpx; }
.brand { font-size: 64rpx; font-weight: 800; letter-spacing: 6rpx; }
.brand-sub { color: #c9a96a; letter-spacing: 10rpx; margin-top: 6rpx; }
.slogan { margin-top: 24rpx; font-size: 26rpx; color: #c8d2cb; }
.since { font-size: 20rpx; color: #8a958e; margin-top: 8rpx; }
.book-btn { margin-top: 36rpx; }
.quick { display: flex; justify-content: space-around; background: #fff; padding: 30rpx 0; margin: -30rpx 24rpx 0; border-radius: 16rpx; position: relative; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.05); }
.quick-item { display: flex; flex-direction: column; align-items: center; font-size: 24rpx; color: #555; }
.q-ic { font-size: 44rpx; margin-bottom: 8rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; padding: 30rpx 24rpx 16rpx; font-size: 30rpx; font-weight: 600; color: #1f3026; }
.section-head .more { font-size: 24rpx; color: #8a958e; font-weight: 400; }
.store-grid { display: flex; flex-wrap: wrap; gap: 20rpx; padding: 0 24rpx; }
.store-cell { width: calc(50% - 10rpx); overflow: hidden; padding-bottom: 16rpx; }
.store-img { width: 100%; height: 200rpx; }
.store-name { font-weight: 600; color: #1f3026; padding: 12rpx 16rpx 4rpx; }
.store-cell .muted { padding: 0 16rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

- [ ] **Step 4: 验证**

Expected: 首页显示深绿渐变 Hero + RYAN 品牌、金色「立即预约」、4 个快捷入口、连锁门店 2×2 网格（取后端前 4 家）。点门店进详情、点立即预约/找门店进门店列表。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/pages/index
git commit -m "feat: mini program home page"
```

---

## Task 3: 门店列表

**Files:**
- Modify: `miniprogram/pages/stores/stores.{js,wxml,wxss}`

- [ ] **Step 1: stores.js**

```js
const { request } = require('../../utils/request');

Page({
  data: { stores: [], keyword: '' },
  onShow() { this.load(); },
  load() {
    const kw = this.data.keyword ? `&keyword=${encodeURIComponent(this.data.keyword)}` : '';
    request(`/stores?city=上海${kw}`).then((stores) => this.setData({ stores }));
  },
  onInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.load(); },
  goStore(e) {
    wx.navigateTo({ url: `/pages/store-detail/store-detail?id=${e.currentTarget.dataset.id}` });
  },
});
```

- [ ] **Step 2: stores.wxml**

```xml
<view class="searchbar">
  <text class="city">上海 ▾</text>
  <input class="search-input" placeholder="搜索门店名称或商圈" value="{{keyword}}" bindinput="onInput" bindconfirm="onSearch" />
</view>

<view class="list">
  <view class="store-row card" wx:for="{{stores}}" wx:key="id" data-id="{{item.id}}" bindtap="goStore">
    <image class="thumb" src="{{item.images[0] || '/images/placeholder-store.png'}}" mode="aspectFill" />
    <view class="row-info">
      <view class="row-top">
        <text class="store-name">{{item.name}}</text>
        <text class="{{item.status === 'open' ? 'tag-open' : 'tag-closed'}}">{{item.status === 'open' ? '营业中' : '休息中'}}</text>
      </view>
      <view class="muted">{{item.address}}</view>
      <view class="row-bottom">
        <text class="rate">★ {{item.rating}}</text>
        <text class="muted">{{item.review_count}}条评价</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 3: stores.wxss**

```css
.searchbar { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; background: #fff; }
.city { color: #1f3026; font-weight: 600; }
.search-input { flex: 1; background: #f1f2f0; border-radius: 999rpx; padding: 14rpx 24rpx; font-size: 26rpx; }
.list { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.store-row { display: flex; padding: 20rpx; gap: 20rpx; }
.thumb { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; }
.row-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.row-top { display: flex; align-items: center; gap: 12rpx; }
.store-name { font-size: 30rpx; font-weight: 600; color: #1f3026; }
.row-bottom { display: flex; gap: 16rpx; align-items: center; }
```

- [ ] **Step 4: 验证**

Expected: 显示 5 家门店行卡片（缩略图/名称/营业状态标签/地址/评分/评价数）；搜索框输入「徐汇」回车筛选；点卡片进门店详情。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/pages/stores
git commit -m "feat: store list page"
```

---

## Task 4: 门店详情

**Files:**
- Modify: `miniprogram/pages/store-detail/store-detail.{js,wxml,wxss,json}`

- [ ] **Step 1: store-detail.json**

```json
{ "navigationBarTitleText": "门店详情" }
```

- [ ] **Step 2: store-detail.js**

```js
const { request } = require('../../utils/request');

Page({
  data: { store: null },
  onLoad(query) {
    request(`/stores/${query.id}`).then((store) => {
      wx.setNavigationBarTitle({ title: store.name });
      this.setData({ store });
    });
  },
  goBarber(e) {
    wx.navigateTo({ url: `/pages/barber/barber?id=${e.currentTarget.dataset.id}` });
  },
});
```

- [ ] **Step 3: store-detail.wxml**

```xml
<view wx:if="{{store}}">
  <image class="banner" src="{{store.images[0] || '/images/placeholder-store.png'}}" mode="aspectFill" />
  <view class="info card">
    <view class="row-top">
      <text class="store-name">{{store.name}}</text>
      <text class="{{store.status === 'open' ? 'tag-open' : 'tag-closed'}}">{{store.status === 'open' ? '营业中' : '休息中'}}</text>
    </view>
    <view class="muted">{{store.address}}</view>
    <view class="muted">营业时间：{{store.business_hours}}　☎ {{store.phone}}</view>
    <view class="rate">★ {{store.rating}}（{{store.review_count}}条评价）</view>
  </view>

  <view class="section-title">理发师团队</view>
  <view class="barber-grid">
    <view class="barber-cell card" wx:for="{{store.barbers}}" wx:key="id" data-id="{{item.id}}" bindtap="goBarber">
      <image class="avatar" src="{{item.avatar_url || '/images/placeholder-avatar.png'}}" mode="aspectFill" />
      <view class="b-name">{{item.name}}</view>
      <view class="muted">{{item.title}}</view>
      <view class="rate">★ {{item.rating}}</view>
      <view class="btn-view">查看排班</view>
    </view>
  </view>
</view>
```

- [ ] **Step 4: store-detail.wxss**

```css
.banner { width: 100%; height: 360rpx; }
.info { margin: -40rpx 24rpx 0; position: relative; padding: 24rpx; display: flex; flex-direction: column; gap: 10rpx; }
.row-top { display: flex; align-items: center; gap: 12rpx; }
.store-name { font-size: 34rpx; font-weight: 700; color: #1f3026; }
.section-title { padding: 30rpx 24rpx 16rpx; font-size: 30rpx; font-weight: 600; color: #1f3026; }
.barber-grid { display: flex; flex-wrap: wrap; gap: 20rpx; padding: 0 24rpx 30rpx; }
.barber-cell { width: calc(50% - 10rpx); padding: 24rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.avatar { width: 120rpx; height: 120rpx; border-radius: 50%; }
.b-name { font-weight: 600; color: #1f3026; }
.btn-view { margin-top: 10rpx; font-size: 24rpx; color: #c9a96a; border: 1rpx solid #c9a96a; border-radius: 999rpx; padding: 8rpx 28rpx; }
```

- [ ] **Step 5: 验证**

Expected: 门店 banner + 信息卡 + 4 名理发师网格（头像兜底占位图）；点理发师进详情。

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/store-detail
git commit -m "feat: store detail page"
```

---

## Task 5: 理发师详情与预约（选服务 + 选时段）

**Files:**
- Modify: `miniprogram/pages/barber/barber.{js,wxml,wxss,json}`

- [ ] **Step 1: barber.json**

```json
{ "navigationBarTitleText": "理发师详情" }
```

- [ ] **Step 2: barber.js**

```js
const { request } = require('../../utils/request');

// 生成未来 5 天日期 tab
function buildDates() {
  const labels = ['今天', '明天'];
  const out = [];
  const base = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    const md = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ label: labels[i] || ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()], md, iso });
  }
  return out;
}

Page({
  data: {
    barber: null, services: [], slots: [],
    dates: [], activeDate: '', selServiceId: '', selTime: '',
  },
  onLoad(query) {
    this.barberId = query.id;
    const dates = buildDates();
    this.setData({ dates, activeDate: dates[0].iso }, () => this.load());
  },
  load() {
    request(`/barbers/${this.barberId}?date=${this.data.activeDate}`).then((b) => {
      this.setData({
        barber: b, services: b.services, slots: b.slots,
        selServiceId: this.data.selServiceId || (b.services[0] && b.services[0].id),
      });
    });
  },
  pickDate(e) { this.setData({ activeDate: e.currentTarget.dataset.iso, selTime: '' }, () => this.load()); },
  pickService(e) { this.setData({ selServiceId: e.currentTarget.dataset.id }); },
  pickTime(e) {
    if (!e.currentTarget.dataset.avail) return;
    this.setData({ selTime: e.currentTarget.dataset.time });
  },
  next() {
    if (!this.data.selServiceId || !this.data.selTime) {
      wx.showToast({ title: '请选择服务和时段', icon: 'none' });
      return;
    }
    const svc = this.data.services.find((s) => s.id === this.data.selServiceId);
    const payload = {
      barberId: this.barberId,
      storeId: this.data.barber.store_id,
      barberName: this.data.barber.name,
      barberTitle: this.data.barber.title,
      serviceId: svc.id, serviceName: svc.name, amount: svc.price,
      date: this.data.activeDate, time: this.data.selTime,
    };
    wx.navigateTo({ url: `/pages/confirm/confirm?data=${encodeURIComponent(JSON.stringify(payload))}` });
  },
});
```

- [ ] **Step 3: barber.wxml**

```xml
<view wx:if="{{barber}}" class="wrap">
  <view class="header card">
    <image class="avatar" src="{{barber.avatar_url || '/images/placeholder-avatar.png'}}" mode="aspectFill" />
    <view class="h-info">
      <view class="name">{{barber.name}}</view>
      <view class="muted">{{barber.title}}</view>
      <view class="rate">★ {{barber.rating}}（{{barber.review_count}}条评价）· 从业{{barber.years_experience}}年</view>
    </view>
  </view>

  <view class="block card">
    <view class="block-title">服务项目</view>
    <view class="svc-row {{selServiceId === item.id ? 'svc-active' : ''}}"
          wx:for="{{services}}" wx:key="id" data-id="{{item.id}}" bindtap="pickService">
      <text>{{item.name}}</text>
      <text class="price">¥{{item.price}}</text>
    </view>
  </view>

  <view class="block card">
    <view class="block-title">选择预约时间</view>
    <scroll-view scroll-x class="date-tabs">
      <view class="date-tab {{activeDate === item.iso ? 'date-active' : ''}}"
            wx:for="{{dates}}" wx:key="iso" data-iso="{{item.iso}}" bindtap="pickDate">
        <view>{{item.label}}</view><view class="md">{{item.md}}</view>
      </view>
    </scroll-view>
    <view class="slot-grid">
      <view class="slot {{!item.available ? 'slot-disabled' : ''}} {{selTime === item.time ? 'slot-active' : ''}}"
            wx:for="{{slots}}" wx:key="time" data-time="{{item.time}}" data-avail="{{item.available}}" bindtap="pickTime">
        {{item.time}}
      </view>
    </view>
  </view>

  <view class="footer">
    <view class="sel-info">已选：{{activeDate}} {{selTime || '--:--'}}</view>
    <view class="btn-gold" bindtap="next">下一步</view>
  </view>
</view>
```

- [ ] **Step 4: barber.wxss**

```css
.wrap { padding: 24rpx 24rpx 180rpx; display: flex; flex-direction: column; gap: 20rpx; }
.header { display: flex; gap: 24rpx; padding: 28rpx; align-items: center; }
.avatar { width: 140rpx; height: 140rpx; border-radius: 50%; }
.name { font-size: 36rpx; font-weight: 700; color: #1f3026; }
.block { padding: 24rpx; }
.block-title { font-weight: 600; color: #1f3026; margin-bottom: 16rpx; }
.svc-row { display: flex; justify-content: space-between; padding: 22rpx 16rpx; border-radius: 12rpx; border: 1rpx solid #eee; margin-bottom: 12rpx; }
.svc-active { border-color: #c9a96a; background: #faf6ee; }
.price { color: #c9a96a; font-weight: 600; }
.date-tabs { white-space: nowrap; margin-bottom: 16rpx; }
.date-tab { display: inline-block; text-align: center; padding: 12rpx 24rpx; margin-right: 12rpx; border-radius: 12rpx; background: #f1f2f0; font-size: 26rpx; }
.date-active { background: #1f3026; color: #fff; }
.date-tab .md { font-size: 22rpx; }
.slot-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.slot { width: calc(25% - 12rpx); text-align: center; padding: 18rpx 0; border-radius: 10rpx; background: #f1f2f0; font-size: 26rpx; }
.slot-active { background: #c9a96a; color: #1f3026; font-weight: 600; }
.slot-disabled { color: #ccc; background: #f7f7f7; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 20rpx 24rpx; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.06); }
.sel-info { font-size: 24rpx; color: #8a958e; margin-bottom: 10rpx; }
```

- [ ] **Step 5: 验证**

Expected: 显示理发师头部信息、服务项目单选（金色高亮）、日期 tab（今天/明天/周X）、时段网格（已占用置灰不可点）；选服务+时段后「下一步」跳确认页；未选给 toast。

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/barber
git commit -m "feat: barber detail with service & slot selection"
```

---

## Task 6: 预约确认（顾客信息 + 支付 + 模拟登录）

**Files:**
- Modify: `miniprogram/pages/confirm/confirm.{js,wxml,wxss,json}`

- [ ] **Step 1: confirm.json**

```json
{ "navigationBarTitleText": "预约确认" }
```

- [ ] **Step 2: confirm.js**

```js
const { request } = require('../../utils/request');

Page({
  data: {
    order: null, phone: '', remark: '', payment: 'wechat', submitting: false,
  },
  onLoad(query) {
    const order = JSON.parse(decodeURIComponent(query.data));
    const phone = wx.getStorageSync('phone') || '';
    this.setData({ order, phone });
  },
  onPhone(e) { this.setData({ phone: e.detail.value }); },
  onRemark(e) { this.setData({ remark: e.detail.value }); },
  pickPay(e) { this.setData({ payment: e.currentTarget.dataset.pay }); },
  async submit() {
    if (!this.data.phone) { wx.showToast({ title: '请填写手机号', icon: 'none' }); return; }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      // 模拟登录：手机号即身份
      await request('/auth/login', { method: 'POST', data: { phone: this.data.phone } });
      wx.setStorageSync('phone', this.data.phone);
      getApp().globalData.phone = this.data.phone;

      const o = this.data.order;
      await request('/appointments', {
        method: 'POST',
        data: {
          user_phone: this.data.phone, store_id: o.storeId, barber_id: o.barberId,
          service_id: o.serviceId, appointment_date: o.date, appointment_time: o.time,
          payment_method: this.data.payment, amount: o.amount, remark: this.data.remark,
        },
      });
      wx.showToast({ title: '预约成功' });
      setTimeout(() => wx.switchTab({ url: '/pages/my/my' }), 800);
    } catch (e) {
      wx.showToast({ title: (e && e.error) || '预约失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
```

- [ ] **Step 3: confirm.wxml**

```xml
<view wx:if="{{order}}" class="wrap">
  <view class="block card">
    <view class="block-title">预约信息</view>
    <view class="kv"><text class="k">理发师</text><text>{{order.barberName}}（{{order.barberTitle}}）</text></view>
    <view class="kv"><text class="k">服务项目</text><text>{{order.serviceName}}　¥{{order.amount}}</text></view>
    <view class="kv"><text class="k">预约时间</text><text>{{order.date}} {{order.time}}</text></view>
  </view>

  <view class="block card">
    <view class="block-title">顾客信息</view>
    <view class="kv"><text class="k">手机号码</text><input class="ipt" placeholder="请输入手机号" value="{{phone}}" bindinput="onPhone" type="number" /></view>
    <view class="kv"><text class="k">备注</text><input class="ipt" placeholder="选填，如特殊要求" value="{{remark}}" bindinput="onRemark" /></view>
  </view>

  <view class="block card">
    <view class="block-title">支付方式</view>
    <view class="pay {{payment === 'wechat' ? 'pay-active' : ''}}" data-pay="wechat" bindtap="pickPay">微信支付</view>
    <view class="pay {{payment === 'balance' ? 'pay-active' : ''}}" data-pay="balance" bindtap="pickPay">余额支付</view>
  </view>

  <view class="footer">
    <text class="amount">应付：¥{{order.amount}}</text>
    <view class="btn-gold" bindtap="submit">确认并支付</view>
  </view>
</view>
```

- [ ] **Step 4: confirm.wxss**

```css
.wrap { padding: 24rpx 24rpx 180rpx; display: flex; flex-direction: column; gap: 20rpx; }
.block { padding: 24rpx; }
.block-title { font-weight: 600; color: #1f3026; margin-bottom: 16rpx; }
.kv { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f2; }
.kv .k { color: #8a958e; }
.ipt { text-align: right; flex: 1; margin-left: 20rpx; }
.pay { padding: 22rpx 16rpx; border: 1rpx solid #eee; border-radius: 12rpx; margin-bottom: 12rpx; }
.pay-active { border-color: #c9a96a; background: #faf6ee; color: #1f3026; font-weight: 600; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 20rpx 24rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.06); }
.amount { color: #c9a96a; font-size: 32rpx; font-weight: 700; }
.footer .btn-gold { width: 320rpx; }
```

- [ ] **Step 5: 验证**

Expected: 显示预约信息汇总；填手机号（默认带出上次存储）；切换支付方式高亮；点「确认并支付」→ 调登录+创建预约 → toast 成功 → 跳「我的」。重复同一理发师同时段会提示「该时段已被预约」。

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/confirm
git commit -m "feat: booking confirmation with mock login & payment"
```

---

## Task 7: 我的预约（tab 切换 + 取消/再来一单）

**Files:**
- Modify: `miniprogram/pages/my/my.{js,wxml,wxss,json}`

- [ ] **Step 1: my.json**

```json
{ "navigationBarTitleText": "我的预约" }
```

- [ ] **Step 2: my.js**

```js
const { request } = require('../../utils/request');

const TABS = [
  { key: 'upcoming', label: '待服务' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

Page({
  data: { tabs: TABS, activeTab: 'upcoming', phone: '', list: [] },
  onShow() {
    const phone = wx.getStorageSync('phone') || '';
    this.setData({ phone });
    if (phone) this.load();
    else this.setData({ list: [] });
  },
  load() {
    request(`/appointments?phone=${encodeURIComponent(this.data.phone)}`).then((all) => {
      const t = this.data.activeTab;
      const list = all.filter((a) => {
        if (t === 'upcoming') return ['pending', 'confirmed'].includes(a.status);
        if (t === 'completed') return a.status === 'completed';
        return a.status === 'cancelled';
      });
      this.setData({ list });
    });
  },
  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.key }, () => this.load()); },
  async cancel(e) {
    const id = e.currentTarget.dataset.id;
    const ok = await new Promise((r) => wx.showModal({ title: '提示', content: '确认取消该预约？', success: (res) => r(res.confirm) }));
    if (!ok) return;
    await request(`/appointments/${id}`, { method: 'PUT', data: { status: 'cancelled' } });
    wx.showToast({ title: '已取消' });
    this.load();
  },
  rebook(e) {
    const it = e.currentTarget.dataset.item;
    wx.navigateTo({ url: `/pages/barber/barber?id=${it.barber_id}` });
  },
});
```

- [ ] **Step 3: my.wxml**

```xml
<view class="tabs">
  <view class="tab {{activeTab === item.key ? 'tab-active' : ''}}" wx:for="{{tabs}}" wx:key="key"
        data-key="{{item.key}}" bindtap="switchTab">{{item.label}}</view>
</view>

<view wx:if="{{!phone}}" class="empty">请先在预约流程中登录</view>

<view class="list">
  <view class="appt card" wx:for="{{list}}" wx:key="id">
    <view class="appt-top">
      <text class="dt">{{item.appointment_date}} {{item.appointment_time}}</text>
      <text class="muted">{{item.store.name}}</text>
    </view>
    <view class="appt-mid">
      <image class="avatar" src="{{item.barber.avatar_url || '/images/placeholder-avatar.png'}}" mode="aspectFill" />
      <view>
        <view class="b-name">{{item.barber.name}}（{{item.barber.title}}）</view>
        <view class="muted">{{item.service.name}}　¥{{item.amount}}</view>
      </view>
    </view>
    <view class="appt-actions">
      <view wx:if="{{activeTab === 'upcoming'}}" class="btn-outline" data-id="{{item.id}}" bindtap="cancel">取消预约</view>
      <view wx:if="{{activeTab !== 'upcoming'}}" class="btn-outline" data-item="{{item}}" bindtap="rebook">再来一单</view>
    </view>
  </view>
  <view wx:if="{{phone && list.length === 0}}" class="empty">暂无预约</view>
</view>
```

- [ ] **Step 4: my.wxss**

```css
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 28rpx 0; color: #8a958e; font-size: 28rpx; }
.tab-active { color: #1f3026; font-weight: 700; border-bottom: 4rpx solid #c9a96a; }
.list { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.appt { padding: 24rpx; }
.appt-top { display: flex; justify-content: space-between; padding-bottom: 16rpx; border-bottom: 1rpx solid #f2f2f2; }
.dt { font-weight: 600; color: #1f3026; }
.appt-mid { display: flex; gap: 20rpx; align-items: center; padding: 20rpx 0; }
.avatar { width: 90rpx; height: 90rpx; border-radius: 50%; }
.b-name { font-weight: 600; color: #1f3026; }
.appt-actions { display: flex; justify-content: flex-end; }
.btn-outline { border: 1rpx solid #c9a96a; color: #c9a96a; border-radius: 999rpx; padding: 12rpx 32rpx; font-size: 26rpx; }
.empty { text-align: center; color: #aaa; padding: 80rpx 0; }
```

- [ ] **Step 5: 验证**

Expected: 三个 tab 切换；待服务显示 pending+confirmed，可取消（取消后移到已取消 tab）；已完成/已取消显示「再来一单」跳回理发师页。未登录提示。

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/my
git commit -m "feat: my bookings page"
```

---

## Task 8: 占位图与全流程联调

**Files:**
- Create: `miniprogram/images/placeholder-store.png`, `miniprogram/images/placeholder-avatar.png`

- [ ] **Step 1: 放置占位图**

放两张占位 PNG（门店/头像）。可用任意纯色或品牌图；保证路径 `/images/placeholder-store.png`、`/images/placeholder-avatar.png` 存在。

- [ ] **Step 2: 全流程联调**

在开发者工具按顺序验证：
首页 → 门店列表 → 门店详情 → 理发师详情（选服务+时段）→ 确认（填手机号+支付）→ 提交成功 → 我的预约（待服务出现该单）→ 取消 → 移到已取消。
再回后台「预约管理」确认该订单可见、可改状态。
Expected: 全链路通畅，数据与后台一致。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/images
git commit -m "feat: placeholders & end-to-end flow"
```

---

## Self-Review 记录

- **Spec 覆盖**：6 页面全实现（首页/列表/详情/理发师预约/确认/我的）；模拟登录(手机号 storage)、演示支付(选择即成功)、时段冲突提示、头像/门店图兜底占位 全覆盖。
- **类型一致**：API 字段与后端一致（`status` 枚举、关联对象 `store/barber/service`、`appointment_date/appointment_time`、`order_no`、`amount`）；创建预约 body 字段与后端 `appointments` 表列名一致。
- **占位符**：无 TODO；每步含完整 wxml/wxss/js。
- **已知简化**：tabBar 取 3 项（首页/门店/我的），「预约」语义由首页入口承载，已在 Task1 Step2 说明；距离/收藏/关注/会员中心为展示占位，未实现真实逻辑（符合 spec 非目标）。
```
