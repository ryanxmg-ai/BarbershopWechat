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
    following: false,
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
  toggleFollow() {
    const following = !this.data.following;
    this.setData({ following });
    wx.showToast({ title: following ? '已关注' : '已取消关注', icon: 'none' });
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
      storeName: this.data.barber.store && this.data.barber.store.name,
      barberName: this.data.barber.name,
      barberTitle: this.data.barber.title,
      serviceId: svc.id, serviceName: svc.name, amount: svc.price,
      date: this.data.activeDate, time: this.data.selTime,
    };
    wx.navigateTo({ url: `/pages/confirm/confirm?data=${encodeURIComponent(JSON.stringify(payload))}` });
  },
});
