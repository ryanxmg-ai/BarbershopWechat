const { request } = require('../../utils/request');

Page({
  data: { stores: [], keyword: '' },
  onShow() { this.load(); },
  load() {
    const kw = this.data.keyword ? `&keyword=${encodeURIComponent(this.data.keyword)}` : '';
    const demo = [1.2, 3.6, 7.8, 5.1, 9.3];
    request(`/stores?city=上海${kw}`).then((stores) => {
      const list = stores.map((s, i) => ({
        ...s,
        distance: (demo[i] !== undefined ? demo[i] : ((i + 1) * 1.4).toFixed(1)) + 'km',
      }));
      this.setData({ stores: list });
    });
  },
  onInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.load(); },
  goStore(e) {
    wx.navigateTo({ url: `/pages/store-detail/store-detail?id=${e.currentTarget.dataset.id}` });
  },
});
