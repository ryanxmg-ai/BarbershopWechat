function request(path, { method = 'GET', data } = {}) {
  const base = getApp().globalData.apiBase;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}${path}`,
      method,
      data,
      timeout: 15000,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(res.data);
      },
      fail: (err) => {
        // 连不上/超时时给出明确提示，而不是静默空白
        const msg = err && err.errMsg && err.errMsg.indexOf('timeout') >= 0
          ? '连接服务器超时，请稍后重试'
          : '网络请求失败，请检查网络连接';
        wx.showToast({ title: msg, icon: 'none', duration: 2500 });
        reject(err);
      },
    });
  });
}

module.exports = { request };
