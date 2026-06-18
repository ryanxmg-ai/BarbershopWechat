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
