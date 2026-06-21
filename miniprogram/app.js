App({
  globalData: {
    apiBase: 'http://127.0.0.1:3000/api',
    phone: '',
  },
  onLaunch() {
    const phone = wx.getStorageSync('phone');
    if (phone) this.globalData.phone = phone;
  },
});
