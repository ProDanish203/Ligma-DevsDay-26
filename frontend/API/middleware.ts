import { TOKEN_KEY } from '@/lib/constants';
import axios from 'axios';

const getAccessToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use(
  async (config) => {
    const accessToken = getAccessToken();

    config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
