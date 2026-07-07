import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  // Jika pasien menekan tombol "Konfirmasi Minum" pada alarm
  if (type === EventType.ACTION_PRESS && pressAction?.id === 'stop_alarm') {
    if (notification?.id) {
      // Matikan bunyi dan hilangkan notifikasi weker
      await notifee.cancelNotification(notification.id);
    }
    console.log('Obat dikonfirmasi dari background!');
  }

  // Jika pasien mengklik body notifikasi (bukan tombol action)
  if (type === EventType.PRESS) {
    if (notification?.id) {
      await notifee.cancelNotification(notification.id);
    }
    // Notifee secara otomatis akan membuka aplikasi saat diklik.
    console.log('[Notifee BG] Notifikasi diklik, membuka aplikasi...');
  }

  if (type === EventType.DELIVERED) {
    console.log('Alarm delivered in background:', notification?.id);
  }
});

// Daftarkan "penjaga" Foreground Service. Promise ini sengaja tidak pernah
// di-resolve agar Android menganggap app sedang bekerja aktif dan tidak
// membekukan prosesnya (menambal celah "Zombie State" di HP OEM seperti
// Transsion/XOS). Ini pelengkap, bukan pengganti, dari trigger alarm
// SET_ALARM_CLOCK yang dijadwalkan di MedicationReminderScreen.tsx.
notifee.registerForegroundService(() => {
  return new Promise(() => {
    // Sengaja dibiarkan menggantung selama service belum di-stop.
  });
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
