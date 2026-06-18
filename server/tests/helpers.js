const supabase = require('../src/supabase');

// 所有测试数据用此前缀，便于清理，避免污染种子数据
const TEST_PREFIX = '__test__';

async function createStore(overrides = {}) {
  const { data, error } = await supabase
    .from('stores')
    .insert({ name: `${TEST_PREFIX}门店`, address: `${TEST_PREFIX}地址`, ...overrides })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function createBarber(storeId, overrides = {}) {
  const { data, error } = await supabase
    .from('barbers')
    .insert({ store_id: storeId, name: `${TEST_PREFIX}理发师`, ...overrides })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function createService(overrides = {}) {
  const { data, error } = await supabase
    .from('services')
    .insert({ name: `${TEST_PREFIX}服务`, price: 100, ...overrides })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 清理所有测试数据（按外键顺序）
async function cleanup() {
  await supabase.from('appointments').delete().like('user_phone', `${TEST_PREFIX}%`);
  await supabase.from('barbers').delete().like('name', `${TEST_PREFIX}%`);
  await supabase.from('stores').delete().like('name', `${TEST_PREFIX}%`);
  await supabase.from('services').delete().like('name', `${TEST_PREFIX}%`);
}

module.exports = { TEST_PREFIX, createStore, createBarber, createService, cleanup };
