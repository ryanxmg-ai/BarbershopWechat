import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: () => import('../layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: '数据总览', component: () => import('../views/Dashboard.vue') },
      { path: 'stores', name: '门店管理', component: () => import('../views/Stores.vue') },
      { path: 'barbers', name: '理发师管理', component: () => import('../views/Barbers.vue') },
      { path: 'appointments', name: '预约管理', component: () => import('../views/Appointments.vue') },
      { path: 'members', name: '会员管理', component: () => import('../views/Placeholder.vue') },
      { path: 'marketing', name: '营销管理', component: () => import('../views/Placeholder.vue') },
      { path: 'reviews', name: '评价管理', component: () => import('../views/Placeholder.vue') },
      { path: 'settings', name: '系统设置', component: () => import('../views/Placeholder.vue') },
    ],
  },
];

const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to) => {
  if (to.path !== '/login' && !localStorage.getItem('admin_token')) return '/login';
  return true;
});

export default router;
