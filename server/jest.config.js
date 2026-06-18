module.exports = {
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  testTimeout: 30000, // 连远端云 Supabase，留足余量应对网络抖动
};
