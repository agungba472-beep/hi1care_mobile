import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ganti IP ini dengan IPv4 Address laptopmu
const API_URL = 'http://192.168.0.209:8000/api'; 

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
export default api;