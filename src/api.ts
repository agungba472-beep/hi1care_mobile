import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ganti IP ini dengan IPv4 Address laptopmu
export const API_URL = 'http://10.150.7.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor: Otomatis menempelkan Token Sanctum di setiap request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');

    // Tambahkan pengecekan config.headers di sini
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// INTERCEPTOR RESPONSE
// Jika 401 → hapus token (expired/invalid)
// ============================================================
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    console.log(`[API] ❌ ${status || 'NETWORK_ERROR'} ${error.config?.url} — ${error.response?.data?.message || error.message}`);
    if (status === 401) {
      await AsyncStorage.removeItem('userToken');
      console.log('[API] Token dihapus karena 401 Unauthorized.');
    }
    return Promise.reject(error);
  }
);

export default api;
