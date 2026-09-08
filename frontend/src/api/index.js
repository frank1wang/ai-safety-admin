import axios from 'axios';
import { storage } from '../utils/storage';
import { message } from 'antd';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        storage.clear();
        message.error('登录已过期，请重新登录');
        window.location.href = '/login';
      } else if (error.response.status === 403) {
        message.error('没有权限执行此操作');
      } else if (error.response.status >= 500) {
        message.error('服务器错误，请稍后重试');
      } else {
        message.error(error.response.data?.message || '请求失败');
      }
    } else {
      message.error('网络错误，请检查网络连接');
    }
    return Promise.reject(error);
  }
);

export default api;