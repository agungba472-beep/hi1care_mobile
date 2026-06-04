import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';

const FloatingPlusButton = () => {
  const navigation = useNavigation();
  
  // Ambil nama halaman aktif saat ini
  const currentRouteName = useNavigationState((state) => {
    if (!state) return '';
    const route = state.routes[state.index];
    // Jika tab navigator digunakan, state mungkin bertumpuk, tapi ini menutupi route aktif utamanya
    return route.name;
  });

  // DAFTAR BLACKLIST: Sembunyikan tombol plus di halaman Login/Register agar tidak merusak UI
  const hideOnScreens = ['Login', 'Register', 'BiometricAuth']; // Sesuaikan dengan nama route login/register
  if (hideOnScreens.includes(currentRouteName)) {
    return null;
  }

  return (
    <TouchableOpacity
      style={st.fab}
      onPress={() => {
        // Arahkan ke halaman tambah/setel alarm obat
        // Sesuaikan 'MedicationReminderScreen' dengan nama rute asli di App.tsx-mu
        navigation.navigate('Alarm' as never);
      }}
      activeOpacity={0.85}
    >
      <MaterialIcons name="add" size={32} color="#ffffff" />
    </TouchableOpacity>
  );
};

const st = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90, // Diberi jarak agar melayang pas di atas bar menu bawah (Bottom Tabs)
    right: 20,  // Menempel di sudut kanan bawah
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0043a2', // Warna primary HI-CARE
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // KUNCI UTAMA: Memaksa tombol selalu berada di lapisan paling atas UI
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

export default FloatingPlusButton;
