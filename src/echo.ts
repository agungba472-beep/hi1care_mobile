import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './api'; 

(window as any).Pusher = Pusher;

export const initEcho = async () => {
  const token = await AsyncStorage.getItem('userToken');
  
  return new Echo({
    broadcaster: 'pusher',
    key: '05b470900701ceeb7482', // Samakan dengan yang di .env Laravel
    cluster: 'ap1',
    forceTLS: true,
    authEndpoint: `${API_URL}/broadcasting/auth`, // Pintu masuk otorisasi
    auth: {
      headers: {
        Authorization: `Bearer ${token}`, // Membawa token agar diizinkan Laravel
      },
    },
  });
};