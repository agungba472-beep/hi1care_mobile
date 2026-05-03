import React from 'react';
import { Alert } from 'react-native';
import ProfileScreen from './screens/ProfileScreen';

export default function App() {
  return (
    <ProfileScreen
      onMenuPress={() => Alert.alert('Menu', 'Drawer menu')}
      onPrivacyToggle={() => Alert.alert('Privacy', 'Toggle privacy')}
      onAccountSettings={() => Alert.alert('Settings', 'Membuka pengaturan akun...')}
      onLogout={() => Alert.alert('Logout', 'Apakah Anda yakin ingin keluar?')}
      onNavPress={(tab) => Alert.alert('Nav', `Tab: ${tab}`)}
    />
  );
}
