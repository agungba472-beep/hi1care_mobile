import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ganti IP ini dengan IPv4 Address laptopmu
export const API_URL = 'http://192.168.1.7:8000/api';

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

import { Alert } from 'react-native';

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
    
    // JIKA 401 ATAU 403 (Sesi Berakhir / Double Login)
    if (status === 401) {
      await AsyncStorage.removeItem('userToken');
      console.log('[API] Token dihapus karena 401 Unauthorized.');
      Alert.alert('Peringatan', 'Sesi Anda telah berakhir atau akun sedang digunakan di tempat lain. Silakan login kembali.');
    } else if (status === 403 && error.config?.url !== '/login') {
      // Alert 403 selain dari halaman login
      Alert.alert('Peringatan', error.response?.data?.message || 'Akses ditolak.');
    }
    return Promise.reject(error);
  }
);

export default api;
