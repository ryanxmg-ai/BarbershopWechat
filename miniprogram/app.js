// API 基址：本地联调用 dev，云端/真机体验用 prod
const API_BASE = {
  dev: 'http://127.0.0.1:3000/api',
  prod: 'https://REPLACE_WITH_CLOUDRUN_DOMAIN/api',
};
// 切换环境：本地开发改成 'dev'，上云/真机改成 'prod'
const ENV = 'prod';

App({
  globalData: {
    apiBase: API_BASE[ENV],
    phone: '',
  },
  onLaunch() {
    const phone = wx.getStorageSync('phone');
    if (phone) this.globalData.phone = phone;
  },
});
