import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '../router';

const request = axios.create({ baseURL: import.meta.env.VITE_API_BASE, timeout: 20000 });

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      router.push('/login');
    }
    ElMessage.error(err.response?.data?.error || '请求失败');
    return Promise.reject(err);
  }
);

export default request;
