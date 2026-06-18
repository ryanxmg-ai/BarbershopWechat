require('dotenv').config();
const supabase = require('../src/supabase');

const SERVICES = [
  { name: '男士剪发(洗剪吹)', price: 128, duration: 45, sort_order: 1 },
  { name: '造型设计(含造型)', price: 168, duration: 60, sort_order: 2 },
  { name: '渐变·油头造型', price: 188, duration: 60, sort_order: 3 },
  { name: '烫发(纹理·定位)', price: 298, duration: 90, sort_order: 4 },
];

const STORES = [
  { name: '徐汇店', address: '上海市徐汇区漕溪北路18号 近地铁1/9/11号线徐家汇站', phone: '021-6433 5678', rating: 4.9, review_count: 1288 },
  { name: '静安店', address: '上海市静安区南京西路1266号 恒隆广场2期81-12', phone: '021-6288 1234', rating: 4.8, review_count: 986 },
  { name: '浦东店', address: '上海市浦东新区世纪大道88号 国金中心商场L2-15', phone: '021-5858 9012', rating: 4.9, review_count: 1103 },
  { name: '长宁店', address: '上海市长宁区天山路789号 城市中心公园旁', phone: '021-6233 4455', rating: 4.8, review_count: 765, status: 'closed' },
  { name: '黄浦店', address: '上海市黄浦区南京东路300号 新世界大丸百货82-03', phone: '021-6333 1122', rating: 4.8, review_count: 668 },
];

// 每店 4 名理发师
const BARBER_TEMPLATES = [
  { name: 'Ryan', title: '店长 · 高级发型师', specialties: ['男士剪发', '造型设计', '油头', '渐变'], years_experience: 10, rating: 4.9 },
  { name: '阿杰', title: '高级发型师', specialties: ['渐变', '纹理烫'], years_experience: 6, rating: 4.8 },
  { name: '大卫', title: '高级发型师', specialties: ['经典背头', '胡须修剪'], years_experience: 7, rating: 4.8 },
  { name: 'Leo', title: '发型师', specialties: ['油头', '染发'], years_experience: 4, rating: 4.7 },
];

async function main() {
  console.log('清理旧数据...');
  await supabase.from('appointments').delete().neq('order_no', '');
  await supabase.from('barbers').delete().neq('name', '');
  await supabase.from('stores').delete().neq('name', '');
  await supabase.from('services').delete().neq('name', '');

  console.log('写入服务项目...');
  await supabase.from('services').insert(SERVICES);

  console.log('写入门店与理发师...');
  for (const s of STORES) {
    const { data: store, error } = await supabase.from('stores')
      .insert({ ...s, status: s.status || 'open' }).select().single();
    if (error) throw error;
    const barbers = BARBER_TEMPLATES.map((b) => ({ ...b, store_id: store.id }));
    await supabase.from('barbers').insert(barbers);
  }

  // 管理员（如不存在）
  await supabase.from('admins').upsert(
    { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' },
    { onConflict: 'username' }
  );

  console.log('种子数据完成：5 门店 × 4 理发师 + 4 服务项目');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
