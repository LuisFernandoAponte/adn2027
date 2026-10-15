import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from '../api/config';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let pendingRequests: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const getRefreshToken = async (): Promise<string> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token');

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success || !data.token) throw new Error(data.error || 'Error al refrescar token');
  return data.token;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await getRefreshToken();
        localStorage.setItem('token', newToken);

        pendingRequests.forEach((p) => p.resolve(newToken));
        pendingRequests = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        pendingRequests.forEach((p) => p.reject(refreshError));
        pendingRequests = [];

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('permisos');

        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          getRefreshToken().then((newToken) => {
            localStorage.setItem('token', newToken);
            config.headers.Authorization = `Bearer ${newToken}`;
          }).catch(() => {});
        }
      } catch {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
