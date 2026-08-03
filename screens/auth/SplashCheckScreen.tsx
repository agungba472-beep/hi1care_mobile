import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import api from '../../src/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type SplashNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SplashCheck'>;

export default function SplashCheckScreen() {
  const navigation = useNavigation<SplashNavigationProp>();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        const userRole = await AsyncStorage.getItem('userRole');

        if (!userToken) {
          // Tidak ada token, langsung ke Login
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return;
        }

        // Ada token, verifikasi dengan memanggil API (misal GET /user)
        // Interceptor axios otomatis akan menangani 401 dan memanggil resetToLogin jika invalid
        const res = await api.get('/user');
        
        if (res.status >= 200 && res.status < 300) {
          // Token valid, arahkan ke Tab yang sesuai
          if (userRole === 'nakes') {
            navigation.reset({
              index: 0,
              routes: [{ name: 'NakesTabs' }],
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }
        }
      } catch (error: any) {
        // Jika error (misal 401 atau network error)
        if (error?.response?.status === 401) {
          // Token benar-benar invalid/expired -> ke Login
          console.log('[SplashCheck] Token invalid (401), mengarahkan ke Login.');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        } else {
          // Gagal koneksi/timeout, BUKAN berarti token invalid.
          // Tetap masuk ke app pakai token yang tersimpan (mode optimis),
          // biar layar lain yang urus retry data.
          console.log('[SplashCheck] Network error / Timeout. Lanjut optimis ke Dashboard.');
          
          const userRole = await AsyncStorage.getItem('userRole');
          if (userRole === 'nakes') {
            navigation.reset({ index: 0, routes: [{ name: 'NakesTabs' }] });
          } else {
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
          }
        }
      }
    };

    checkToken();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#012D1D" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
