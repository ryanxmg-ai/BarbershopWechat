// API 基址：开发版(开发者工具)连本地，体验版/正式版连云端
const API_BASE = {
  dev: 'http://127.0.0.1:3000/api',
  prod: 'https://ryan-server-273180-6-1445846787.sh.run.tcloudbase.com/api',
};

// 按小程序运行环境自动选择：develop=开发版, trial=体验版, release=正式版
function resolveApiBase() {
  try {
    const { envVersion } = wx.getAccountInfoSync().miniProgram;
    return envVersion === 'develop' ? API_BASE.dev : API_BASE.prod;
  } catch (e) {
    return API_BASE.prod;
  }
}

App({
  globalData: {
    apiBase: resolveApiBase(),
    phone: '',
  },
  onLaunch() {
    const phone = wx.getStorageSync('phone');
    if (phone) this.globalData.phone = phone;
  },
});
