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
