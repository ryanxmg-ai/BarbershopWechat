<script setup>
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

const router = useRouter();
const route = useRoute();
const active = computed(() => route.path);

const menus = [
  { path: '/dashboard', label: '数据总览', icon: 'DataLine' },
  { path: '/stores', label: '门店管理', icon: 'Shop' },
  { path: '/barbers', label: '理发师管理', icon: 'User' },
  { path: '/services', label: '服务项目管理', icon: 'Scissor' },
  { path: '/appointments', label: '预约管理', icon: 'Calendar' },
  { path: '/members', label: '会员管理', icon: 'Avatar' },
  { path: '/marketing', label: '营销管理', icon: 'Promotion' },
  { path: '/reviews', label: '评价管理', icon: 'Star' },
  { path: '/settings', label: '系统设置', icon: 'Setting' },
];

function logout() {
  localStorage.removeItem('admin_token');
  router.push('/login');
}
</script>

<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" class="ryan-sider">
      <div class="logo">RYAN<span>男士理发馆</span></div>
      <el-menu :default-active="active" router>
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="topbar">
        <div class="page-title">{{ route.name }}</div>
        <el-dropdown @command="logout">
          <span class="admin-name">管理员 <el-icon><ArrowDown /></el-icon></span>
          <template #dropdown>
            <el-dropdown-menu><el-dropdown-item command="logout">退出登录</el-dropdown-item></el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.logo { color: #fff; font-size: 22px; font-weight: 800; letter-spacing: 2px; padding: 22px 20px 14px; }
.logo span { display: block; font-size: 12px; color: #c9a96a; font-weight: 400; letter-spacing: 4px; }
.topbar { background: #fff; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #eee; }
.admin-name { cursor: pointer; color: #1f3026; }
</style>
