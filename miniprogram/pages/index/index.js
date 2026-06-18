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
