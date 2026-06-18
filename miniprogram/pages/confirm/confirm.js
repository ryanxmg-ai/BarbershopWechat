const { request } = require('../../utils/request');

Page({
  data: {
    order: null, phone: '', remark: '', payment: 'wechat', submitting: false,
  },
  onLoad(query) {
    const order = JSON.parse(decodeURIComponent(query.data));
    const phone = wx.getStorageSync('phone') || '';
    this.setData({ order, phone });
  },
  onPhone(e) { this.setData({ phone: e.detail.value }); },
  onRemark(e) { this.setData({ remark: e.detail.value }); },
  pickPay(e) { this.setData({ payment: e.currentTarget.dataset.pay }); },
  async submit() {
    if (!this.data.phone) { wx.showToast({ title: '请填写手机号', icon: 'none' }); return; }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      // 模拟登录：手机号即身份
      await request('/auth/login', { method: 'POST', data: { phone: this.data.phone } });
      wx.setStorageSync('phone', this.data.phone);
      getApp().globalData.phone = this.data.phone;

      const o = this.data.order;
      await request('/appointments', {
        method: 'POST',
        data: {
          user_phone: this.data.phone, store_id: o.storeId, barber_id: o.barberId,
          service_id: o.serviceId, appointment_date: o.date, appointment_time: o.time,
          payment_method: this.data.payment, amount: o.amount, remark: this.data.remark,
        },
      });
      wx.showToast({ title: '预约成功' });
      setTimeout(() => wx.switchTab({ url: '/pages/my/my' }), 800);
    } catch (e) {
      wx.showToast({ title: (e && e.error) || '预约失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
