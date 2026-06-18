// 生成订单号：AP + YYMMDD + 6位随机数
function generateOrderNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `AP${yy}${mm}${dd}${rand}`;
}

module.exports = { generateOrderNo };
