<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../api/request';

const router = useRouter();
const form = reactive({ username: 'admin', password: 'admin123' });

async function login() {
  const res = await request.post('/auth/admin-login', form);
  localStorage.setItem('admin_token', res.token);
  ElMessage.success('登录成功');
  router.push('/dashboard');
}
</script>

<template>
  <div class="login-bg">
    <div class="login-card">
      <div class="brand">RYAN</div>
      <div class="sub">男士理发馆 · 管理后台</div>
      <el-form :model="form" @submit.prevent="login">
        <el-form-item>
          <el-input v-model="form.username" placeholder="管理员账号" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-button type="primary" size="large" style="width:100%" @click="login">登 录</el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-bg { height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1f3026, #16241c); }
.login-card { width: 360px; background: #fff; border-radius: 14px; padding: 40px 32px; box-shadow: 0 8px 30px rgba(0,0,0,.2); }
.brand { font-size: 34px; font-weight: 800; letter-spacing: 4px; color: #1f3026; text-align: center; }
.sub { text-align: center; color: #c9a96a; margin: 6px 0 28px; letter-spacing: 1px; }
</style>
