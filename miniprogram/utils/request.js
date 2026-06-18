const app = getApp();

function request(path, { method = 'GET', data } = {}) {
  const base = getApp().globalData.apiBase;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}${path}`,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(res.data);
      },
      fail: reject,
    });
  });
}

module.exports = { request };
