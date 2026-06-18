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
