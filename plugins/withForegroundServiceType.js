const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Notifee mendaftarkan service-nya sendiri di manifest dengan tipe default
// "shortService" (otomatis dihentikan sistem setelah ±3 menit). Untuk
// keep-alive jangka panjang (memastikan alarm obat tidak dibekukan OS di
// HP Transsion/XOS), kita timpa jadi "specialUse" via tools:replace.
module.exports = function withForegroundServiceType(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    mainApplication.service = mainApplication.service || [];

    // Hapus entri lama untuk service ini kalau sudah ada (hindari duplikat
    // saat prebuild dijalankan berulang kali)
    mainApplication.service = mainApplication.service.filter(
      (s) => s.$['android:name'] !== 'app.notifee.core.ForegroundService'
    );

    mainApplication.service.push({
      $: {
        'android:name': 'app.notifee.core.ForegroundService',
        'android:foregroundServiceType': 'specialUse',
        'android:exported': 'false',
        'tools:replace': 'android:foregroundServiceType',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            // Wajib diisi Play Console juga saat submit: jelaskan bahwa
            // service ini menjaga proses tetap hidup agar pengingat jadwal
            // minum obat pasien tidak dibekukan oleh manajemen baterai OEM.
            'android:value': 'medication_reminder_keepalive',
          },
        },
      ],
    });

    return config;
  });
};
