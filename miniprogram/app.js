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
