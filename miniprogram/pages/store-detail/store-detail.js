const { request } = require('../../utils/request');

Page({
  data: { store: null, collected: false },
  onLoad(query) {
    request(`/stores/${query.id}`).then((store) => {
      wx.setNavigationBarTitle({ title: store.name });
      this.setData({ store });
    });
  },
  callStore() {
    const phone = this.data.store && this.data.store.phone;
    if (!phone) { wx.showToast({ title: '暂无电话', icon: 'none' }); return; }
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },
  navStore() {
    wx.showToast({ title: '暂未配置门店坐标', icon: 'none' });
  },
  toggleCollect() {
    const collected = !this.data.collected;
    this.setData({ collected });
    wx.showToast({ title: collected ? '已收藏' : '已取消收藏', icon: 'none' });
  },
  goBarber(e) {
    wx.navigateTo({ url: `/pages/barber/barber?id=${e.currentTarget.dataset.id}` });
  },
});
