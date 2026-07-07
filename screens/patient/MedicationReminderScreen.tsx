import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  StatusBar, ActivityIndicator, Alert, Platform, Switch, ImageBackground, Modal, TextInput, Linking 
} from 'react-native';
import * as Device from 'expo-device';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio, Video, ResizeMode } from 'expo-av';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/api';
import CustomHeader from '../../components/CustomHeader';
import notifee, { TriggerType, AndroidImportance, AndroidVisibility, AndroidNotificationSetting, AndroidCategory, AlarmType } from '@notifee/react-native';

// Deteksi HP dari OEM yang diketahui punya sistem manajemen baterai ketat
// (MIUI, ColorOS, FuntouchOS, Hiber/Transsion, dst.) - dipakai untuk
// menampilkan banner edukasi ke user yang benar-benar membutuhkannya.
const STRICT_OEM_BRANDS = ['xiaomi', 'redmi', 'poco', 'oppo', 'vivo', 'realme', 'huawei', 'honor', 'infinix', 'tecno', 'itel', 'transsion'];
export const isAggressiveOEM = (): boolean => {
  if (Platform.OS !== 'android') return false;
  const manufacturer = (Device.manufacturer || Device.brand || '').toString().toLowerCase();
  return STRICT_OEM_BRANDS.some((b) => manufacturer.includes(b));
};

export const jadwalkanWekerObat = async (waktuMinum: Date, namaObat: string, nadaDering: string = 'ceria', isEveryday: boolean = true) => {
  await notifee.requestPermission();
  
  if (Platform.OS === 'android') {
    // 1. Cek Exact Alarm Permission (Android 12+)
    const settings = await notifee.getNotificationSettings();
    if (settings.android.alarm === AndroidNotificationSetting.DISABLED) {
      Alert.alert(
        'Izin Alarm Weker Diperlukan',
        'Agar alarm bisa berbunyi tepat waktu meski aplikasi ditutup, mohon izinkan akses "Alarms & reminders" di pengaturan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Buka Pengaturan', onPress: async () => await notifee.openAlarmPermissionSettings() }
        ]
      );
      return; // Jangan lanjut jadwalkan jika tidak diizinkan, biarkan user atur dulu
    }

    // 2. Cek Battery Optimization (Penyebab utama alarm mati saat sleep)
    const isBatteryOptimized = await notifee.isBatteryOptimizationEnabled();
    if (isBatteryOptimized) {
      Alert.alert(
        'Izin Latar Belakang',
        'Sistem HP mendeteksi aplikasi ini dibatasi baterainya. Agar weker tetap berbunyi saat layar mati/sleep, mohon matikan optimasi baterai (Pilih "Unrestricted" / "Tidak Dibatasi").',
        [
          { text: 'Nanti Saja', style: 'cancel' },
          { text: 'Matikan Pembatasan', onPress: async () => await notifee.openBatteryOptimizationSettings() }
        ]
      );
    }
  }

  // Android membuang ekstensi dan butuh nama file yang persis sama.
  // Karena file kita namanya "standard.wav" tapi state di UI adalah "standar", kita mapping.
  const soundFile = nadaDering === 'standar' ? 'standard' : nadaDering;

  const channelId = await notifee.createChannel({
    id: `alarm_obat_${soundFile}_v4`,
    name: `Pengingat Obat (${soundFile}) V4`,
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: soundFile,
    vibration: true,
    vibrationPattern: [300, 500, 300, 500, 300, 500],
  });

  // 1a. Jalankan Foreground Service "penjaga" (senyap, importance LOW) agar
  // proses app tidak dibekukan OS selama alarm masih terjadwal. Ini lapisan
  // TAMBAHAN di atas SET_ALARM_CLOCK di bawah, bukan pengganti.
  if (Platform.OS === 'android') {
    try {
      const fgChannelId = await notifee.createChannel({
        id: 'hicare_fg_service',
        name: 'Status Pemantauan Aktif',
        importance: AndroidImportance.LOW, // LOW: tidak bunyi/getar, cuma ikon diam di status bar
      });

      await notifee.displayNotification({
        id: 'hicare_fg_notification',
        title: 'HI!-CARE Pemantauan Aktif',
        body: 'Menjaga pengingat jadwal obat Anda tetap berjalan.',
        android: {
          channelId: fgChannelId,
          asForegroundService: true,
          ongoing: true,
        },
      });
    } catch (fgErr) {
      console.log('Gagal start foreground service (lanjut tanpa itu):', fgErr);
    }
  }

  // 1b. Batalkan alarm lama dulu (id lama 'weker_arv_utama' + id harian sebelumnya)
  const existingIds = await notifee.getTriggerNotificationIds();
  await notifee.cancelTriggerNotifications(existingIds.filter(id => id.startsWith('weker_arv_')));

  // 2. Jadwalkan berulang untuk 30 hari ke depan (lebih reliable daripada repeatFrequency saja)
  const totalHari = isEveryday ? 30 : 1;
  for (let i = 0; i < totalHari; i++) {
    const tgl = new Date(waktuMinum);
    tgl.setDate(tgl.getDate() + i);

    const trigger: any = {
      type: TriggerType.TIMESTAMP,
      timestamp: tgl.getTime(),
      alarmManager: { type: AlarmType.SET_ALARM_CLOCK },
    };

    await notifee.createTriggerNotification({
      id: `weker_arv_${i}`,
      title: '⚠️ WAKTUNYA MINUM OBAT!',
      body: `Segera minum suplemen Anda`,
      data: { type: 'alarm' },
      android: {
        channelId,
        category: AndroidCategory.ALARM,
        loopSound: true,
        ongoing: true,
        autoCancel: false,
        importance: AndroidImportance.HIGH,
        sound: soundFile,
        fullScreenAction: { id: 'default' },
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    }, trigger);
  }

  // FALLBACK: Jadwalkan juga via Expo Notifications (sebagai cadangan jika Notifee gagal) untuk hari ini saja
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ WAKTUNYA MINUM OBAT!',
        body: `(Cadangan) Silakan minum ${namaObat} Anda sekarang.`,
        data: { type: 'alarm_cadangan' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: waktuMinum,
      },
    });
  } catch (expoErr) {
    console.log("Gagal set expo fallback", expoErr);
  }
};


// ── FIX 1: PAKSA NOTIFIKASI BUNYI MESKIPUN APLIKASI SEDANG DIBUKA ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Design Tokens (Tema Emerald/Mint Sesuai Referensi HTML) ──
const C = {
  surface: '#f9f9f8', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#f3f4f3',
  surfaceContainer: '#edeeed', surfaceContainerHigh: '#e7e8e7',
  onSurface: '#191c1c', onSurfaceVariant: '#414844', surfaceVariant: '#dfe5df',
  outline: '#717973', outlineVariant: '#c1c8c2',
  primary: '#012d1d', onPrimary: '#ffffff', primaryContainer: '#1b4332',
  onPrimaryContainer: '#86af99', primaryFixed: '#c1ecd4', onPrimaryFixed: '#012d1d', primaryFixedDim: '#a5d0b9',
  secondary: '#4c6452', onSecondary: '#ffffff', secondaryContainer: '#cce6d0', onSecondaryContainer: '#052111',
  secondaryFixed: '#cee9d3', onSecondaryFixed: '#092012', secondaryFixedDim: '#b3cdb7',
  tertiary: '#002d1b', error: '#ba1a1a', background: '#f9f9f8', onBackground: '#191c1c',
} as const;

const S = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32, margin: 16 } as const;

const CircleProgress: React.FC<{ percent: number; size: number }> = ({ percent, size }) => {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: 'rgba(255,255,255,0.2)' }} />
      <View style={{ 
        position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 6, 
        borderColor: '#ffffff', borderTopColor: offset > circumference * 0.75 ? 'rgba(255,255,255,0.2)' : '#ffffff', 
        transform: [{ rotate: '-90deg' }] 
      }} />
      <Text style={{ position: 'absolute', color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>{percent}%</Text>
    </View>
    );
  };

const TutorialVideo = () => {
  const [videoUri, setVideoUri] = useState<string | null>(null);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const asset = Asset.fromModule(require('../../assets/vid/contoh_swipe.mp4'));
        await asset.downloadAsync();
        setVideoUri(asset.localUri || asset.uri);
      } catch (e) {
        console.log("Gagal memuat video:", e);
      }
    };
    loadVideo();
  }, []);

  if (!videoUri) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ color: '#fff', marginTop: 10, fontSize: 12 }}>Memuat Video...</Text>
      </View>
    );
  }

  return (
    <Video
      source={{ uri: videoUri }}
      style={{ width: '100%', height: '100%' }}
      resizeMode={ResizeMode.CONTAIN}
      shouldPlay={true}
      isLooping={true}
      isMuted={true}
      useNativeControls={true}
    />
  );
};

const MedicationReminderScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [symptomText, setSymptomText] = useState('');
  const [activeAlarmId, setActiveAlarmId] = useState<number | null>(null);
  const [isSubmittingSymptom, setIsSubmittingSymptom] = useState(false);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [refills, setRefills] = useState<any[]>([]);
  const [compliancePercent, setCompliancePercent] = useState(0);
  const [refillLoading, setRefillLoading] = useState(false);

  // Alarm settings
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEveryday, setIsEveryday] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // NADA DERING (Bawaan Aplikasi)
  const [selectedSoundId, setSelectedSoundId] = useState('standar');
  const [isPlaying, setIsPlaying] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const [showDeviceWarning, setShowDeviceWarning] = useState(false);
  const [deviceBrandLabel, setDeviceBrandLabel] = useState('');
  const [permBatteryOk, setPermBatteryOk] = useState(false);
  const [permAutoStartOk, setPermAutoStartOk] = useState(false);
  const [permOverlayOk, setPermOverlayOk] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkPermissionsOnFocus = async () => {
        if (Platform.OS === 'android') {
          try {
            const isBatteryOptimized = await notifee.isBatteryOptimizationEnabled();
            const powerInfo = await notifee.getPowerManagerInfo();
            
            setPermBatteryOk(!isBatteryOptimized);
            setPermAutoStartOk(!powerInfo.activity);

            // Jika salah satu dari izin utama belum diberikan, tampilkan Modal Panduan
            if (isBatteryOptimized || powerInfo.activity) {
              setShowPermissionGuide(true);
            }
          } catch (e) {
            console.log(e);
          }
        }
      };
      checkPermissionsOnFocus();
    }, [])
  );

  const soundRef = useRef<Audio.Sound | null>(null);

  // ── WEB AUDIO API: REFS UNTUK BYPASS AUTOPLAY POLICY ──
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webAudioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const webAudioReadyRef = useRef(false);

  // ── FIX 2: TIMER UNTUK UPDATE GEMBOK WAKTU SETIAP 5 DETIK ──
  const [currentTimeForUI, setCurrentTimeForUI] = useState(new Date());
  useEffect(() => {
    if (showTimePicker || showDatePicker) return;
    const timer = setInterval(() => setCurrentTimeForUI(new Date()), 5000);
    return () => clearInterval(timer);
  }, [showTimePicker, showDatePicker]);

  // ── FIX 3: PUTAR NADA DERING KUSTOM VIA EXPO-AV SAAT NOTIFIKASI MASUK ──
  // Pendekatan hybrid: saat app terbuka → suara kustom (ceria/darurat/standar)
  //                    saat HP terkunci → suara default sistem Android
  useEffect(() => {
    if (Platform.OS === 'web') return; // Web sudah punya mekanisme sendiri

    const subscription = Notifications.addNotificationReceivedListener(async (_notification) => {
      try {
        // Ambil nada dering yang terakhir dipilih user
        const savedSoundId = await AsyncStorage.getItem('saved_sound_id');
        const soundId = savedSoundId || 'standar';

        let soundAsset;
        if (soundId === 'ceria') soundAsset = require('../../assets/sounds/ceria.mp3');
        else if (soundId === 'darurat') soundAsset = require('../../assets/sounds/darurat.mp3');
        else soundAsset = require('../../assets/sounds/standard.wav');

        // Putar suara keras via expo-av!
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,   // Tetap bunyi meski HP dalam mode silent (iOS)
          staysActiveInBackground: true, // Jangan matikan suara saat pindah app
        });

        const { sound } = await Audio.Sound.createAsync(soundAsset);
        await sound.setVolumeAsync(1.0); // Volume maksimal!
        await sound.setIsLoopingAsync(true); // Pastikan sound terus looping!
        await sound.playAsync();

        // Auto-cleanup setelah selesai
        sound.setOnPlaybackStatusUpdate((s) => {
          if ('didJustFinish' in s && s.didJustFinish) {
            sound.unloadAsync();
          }
        });

        console.log(`[Alarm] 🔊 Memutar nada "${soundId}" via expo-av`);
      } catch (err) {
        console.log('[Alarm] Gagal memutar suara:', err);
      }
    });

    return () => subscription.remove();
  }, []);

  const getLocalDateString = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const localTodayStr = getLocalDateString();
  const todayAlarms = alarms.filter((a: any) => !a.tanggal || a.tanggal.substring(0, 10) === localTodayStr);

  // ── WEB AUDIO: AUTO PRELOAD MENGGUNAKAN JALUR RESMI EXPO ──
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const preloadBuffers = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        webAudioCtxRef.current = ctx;

        // JALUR RESMI EXPO: Menggunakan require() agar file pasti ketemu
        const soundFiles = [
          { id: 'standar', module: require('../../assets/sounds/standard.wav') },
          { id: 'ceria',   module: require('../../assets/sounds/ceria.mp3') },
          { id: 'darurat', module: require('../../assets/sounds/darurat.mp3') },
        ];

        for (const s of soundFiles) {
          try {
            const asset = Asset.fromModule(s.module);
            await asset.downloadAsync(); 
            const uri = asset.localUri || asset.uri; 
            
            const response = await fetch(uri);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              webAudioBuffersRef.current[s.id] = audioBuffer;
              console.log(`[WebAudio] ✅ Berhasil Load: ${s.id}`);
            }
          } catch (err) {
            console.log(`[WebAudio] ❌ Gagal Load ${s.id}:`, err);
          }
        }
      } catch (e) {
        console.log('[WebAudio] Preload gagal:', e);
      }
    };

    preloadBuffers();

    return () => {
      webAudioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // ── FUNGSI UNLOCK (dipanggil saat klik Preview / Simpan) ──
  const initAndUnlockWebAudio = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    if (webAudioReadyRef.current) return;

    const ctx = webAudioCtxRef.current;
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume(); // Buka gembok browser!
      }
      
      // Jika buffer sudah terisi, tandai bahwa mesin siap
      if (Object.keys(webAudioBuffersRef.current).length > 0) {
        webAudioReadyRef.current = true;
        console.log('[WebAudio] ✅ GEMBOK TERBUKA & SIAP BERBUNYI!');
      }
    } catch (e) {
      console.log('[WebAudio] Unlock gagal:', e);
    }
  }, []);

  const playWebAlarmSound = useCallback((soundId: string) => {
    const ctx = webAudioCtxRef.current;
    const buffer = webAudioBuffersRef.current[soundId] || webAudioBuffersRef.current['standar'];
    
    if (!ctx || !buffer) {
      console.log('[WebAudio] Belum siap, skip. Ctx:', !!ctx, '| Buffer:', !!buffer);
      return;
    }

    const doPlay = () => {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        console.log(`[WebAudio] 🔊 Memutar: "${soundId}"`);
      } catch (e) {
        console.log('[WebAudio] Gagal memutar:', e);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay).catch(() => {});
    } else {
      doPlay();
    }
  }, []);

  // ── JURUS KHUSUS WEB (LOCALHOST): DETEKSI ALARM MANUAL ──
  useEffect(() => {
    if (Platform.OS === 'web' && todayAlarms.length > 0) {
      const checker = setInterval(() => {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHour}:${currentMinute}`;

        // PERBAIKAN: Potong format HH:MM:SS dari DB menjadi HH:MM
        const activeAlarm = todayAlarms.find((a: any) => {
          const dbTime = a.waktu ? a.waktu.substring(0, 5) : "";
          return dbTime === currentTimeStr && (!a.status || a.status !== 'sudah');
        });

        if (activeAlarm) {
          // Gunakan localStorage agar tidak bunyi berkali-kali di menit yang sama
          const lastPlayed = localStorage.getItem('last_played_alarm_time');
          if (lastPlayed !== currentTimeStr) {
            localStorage.setItem('last_played_alarm_time', currentTimeStr);
            
            // 1. Putar Suara via Web Audio API (BYPASS AUTOPLAY POLICY!)
            playWebAlarmSound(activeAlarm.nada_dering || 'standar');
            
            // 2. Munculkan Notifikasi Layar
            setTimeout(() => {
              window.alert(`⏰ WAKTUNYA MINUM OBAT ARV!
Jadwal: ${activeAlarm.waktu}
Nada: ${activeAlarm.nada_dering || 'standar'}`);
            }, 500); // Beri jeda setengah detik agar suaranya main duluan
          }
        }
      }, 5000); // Mesin mengecek jam setiap 5 detik

      return () => clearInterval(checker);
    }
  }, [todayAlarms, playWebAlarmSound]);

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const fmtTime = useMemo(() => {
    return selectedTime.getHours().toString().padStart(2, '0') + ':' + selectedTime.getMinutes().toString().padStart(2, '0');
  }, [selectedTime]);

  const fmtDate = useMemo(() => {
    return selectedDate.getFullYear() + '-' + (selectedDate.getMonth() + 1).toString().padStart(2, '0') + '-' + selectedDate.getDate().toString().padStart(2, '0');
  }, [selectedDate]);

  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const [savedTime, savedDate, savedSoundId, savedEveryday] = await Promise.all([
          AsyncStorage.getItem('saved_alarm_time'),
          AsyncStorage.getItem('saved_alarm_date'),
          AsyncStorage.getItem('saved_sound_id'),
          AsyncStorage.getItem('saved_is_everyday')
        ]);
        if (savedTime) { const parsed = new Date(savedTime); if (!isNaN(parsed.getTime())) setSelectedTime(parsed); }
        if (savedDate) { const parsed = new Date(savedDate); if (!isNaN(parsed.getTime())) setSelectedDate(parsed); }
        if (savedSoundId) setSelectedSoundId(savedSoundId);
        if (savedEveryday !== null) setIsEveryday(savedEveryday === 'true');
      } catch (e) {}
    };
    loadSavedSettings();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [aR, rR, dR] = await Promise.all([
        api.get('/patient/alarms'), api.get('/patient/refill-history'), api.get('/patient/dashboard'),
      ]);
      setAlarms(aR.data.data || []);
      setRefills(rR.data.data || []);
      const kepPercentage = dR.data.data?.kepatuhan_percentage;
      if (kepPercentage !== undefined) {
        setCompliancePercent(kepPercentage);
      } else {
        setCompliancePercent(0);
      }
    } catch (e) {} finally { setLoading(false); }
  }, []);
  
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // Deteksi merek HP untuk banner peringatan OEM ketat (Xiaomi/Oppo/Vivo/dst).
  // Tidak menyentuh logika Notifee/jadwalkanWekerObat - murni UI edukatif.
  useEffect(() => {
    const cekBrandHP = async () => {
      try {
        if (isAggressiveOEM()) {
          const label = Device.manufacturer || Device.brand || 'HP Anda';
          setDeviceBrandLabel(label);
          setShowDeviceWarning(true);
        }
      } catch (e) {
        console.log('Gagal deteksi brand HP:', e);
      }
    };
    cekBrandHP();
  }, []);

  // PENGAMAN REBOOT: AlarmManager (termasuk SET_ALARM_CLOCK) menghapus semua
  // alarm terjadwal saat HP restart. Tanpa BroadcastReceiver native khusus,
  // kita tutup celah ini secara ringan: setiap kali app dibuka, cek apakah
  // alarm weker masih terdaftar di sistem; kalau kosong padahal user
  // sebelumnya sudah mengatur jadwal (tersimpan di AsyncStorage), jadwalkan
  // ulang otomatis secara senyap (tanpa modal/alert, supaya tidak mengganggu).
  useEffect(() => {
    const cekDanJadwalkanUlangJikaHilang = async () => {
      if (Platform.OS === 'web') return;
      try {
        const existingIds = await notifee.getTriggerNotificationIds();
        const masihAda = existingIds.some((id) => id.startsWith('weker_arv_'));
        if (masihAda) return; // Masih ada, tidak perlu apa-apa

        const [savedTime, savedSound, savedEveryday] = await Promise.all([
          AsyncStorage.getItem('saved_alarm_time'),
          AsyncStorage.getItem('saved_sound_id'),
          AsyncStorage.getItem('saved_is_everyday'),
        ]);
        if (!savedTime) return; // Belum pernah ada jadwal tersimpan

        const savedDate = new Date(savedTime);
        const now = new Date();
        const target = new Date();
        target.setHours(savedDate.getHours(), savedDate.getMinutes(), 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);

        await jadwalkanWekerObat(target, 'ARV', savedSound || 'standar', savedEveryday !== 'false');
        console.log('[Notif] Alarm dijadwalkan ulang otomatis (kemungkinan setelah HP restart).');
      } catch (e) {
        console.log('Gagal cek/reschedule alarm setelah restart:', e);
      }
    };
    cekDanJadwalkanUlangJikaHilang();
  }, []);

  const handleDeleteAlarm = async (alarmId: number) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm('Hapus jadwal alarm ini?');
      if (confirm) {
        try {
          await api.delete(`/patient/alarms/${alarmId}`);
          window.alert('Alarm dihapus.');
          fetchData();
        } catch (e) { window.alert('Gagal menghapus alarm.'); }
      }
    } else {
      Alert.alert('Hapus Alarm', 'Hapus jadwal alarm ini?', [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/patient/alarms/${alarmId}`);
              fetchData();
            } catch (e) { Alert.alert('Gagal', 'Tidak dapat menghapus alarm.'); }
          },
        },
      ]);
    }
  };

  const handleRefill = async () => {
    setRefillLoading(true);
    try { 
      await api.post('/patient/refill/request'); 
      if (Platform.OS === 'web') window.alert('Berhasil ✅ Permintaan refill berhasil diajukan.');
      else Alert.alert('Berhasil ✅', 'Permintaan refill berhasil diajukan.'); 
      fetchData(); 
    } catch (e: any) { 
      if (Platform.OS === 'web') window.alert('Gagal: ' + (e.response?.data?.message || 'Tidak dapat mengajukan refill.'));
      else Alert.alert('Gagal', e.response?.data?.message || 'Tidak dapat mengajukan refill.'); 
    } finally { setRefillLoading(false); }
  };

  const handleUploadRefillPhoto = async (refillId: number) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      if (Platform.OS === 'web') window.alert("Aplikasi butuh izin kamera untuk mengirim bukti foto botol kosong/resep!");
      else Alert.alert("Izin Ditolak", "Aplikasi butuh izin kamera untuk mengirim bukti foto botol kosong/resep!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // @ts-ignore
        formData.append('foto_bukti', result.assets[0].file);
      } else {
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop() || 'refill.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // @ts-ignore
        formData.append('foto_bukti', { uri: localUri, name: filename, type });
      }

      try { 
        await api.post(`/patient/refill/${refillId}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }); 
        if (Platform.OS === 'web') window.alert('Berhasil ✅ Bukti foto berhasil diunggah.');
        else Alert.alert('Berhasil ✅', 'Bukti foto berhasil diunggah.'); 
        fetchData(); 
      } catch (e: any) { 
        if (Platform.OS === 'web') window.alert('Gagal: ' + (e.response?.data?.message || 'Tidak dapat mengunggah bukti foto.'));
        else Alert.alert('Gagal', e.response?.data?.message || 'Tidak dapat mengunggah bukti foto.'); 
      }
    }
  };

  const launchCamera = async (alarmId: number) => {
    // 2. Buka Kamera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5, 
    });

    // 3. Jika pasien memotret (tidak membatalkan)
    if (!result.canceled) {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // @ts-ignore
        formData.append('foto_bukti', result.assets[0].file);
      } else {
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop() || 'bukti.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        // @ts-ignore
        formData.append('foto_bukti', { uri: localUri, name: filename, type });
      }

      formData.append('status', 'diminum');

      try {
        await api.post(`/patient/alarms/${alarmId}/taken`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (Platform.OS === 'web') {
           window.alert("Hebat! Bukti minum obat berhasil dikirim ke Admin.");
        } else {
           Alert.alert("Berhasil ✅", "Hebat! Bukti minum obat berhasil dikirim ke Admin.");
        }
        fetchData();
      } catch (e: any) {
        if (Platform.OS === 'web') {
           window.alert('Gagal: ' + (e.response?.data?.message || 'Tidak dapat menyimpan konfirmasi.'));
        } else {
           Alert.alert('Gagal', e.response?.data?.message || 'Tidak dapat menyimpan konfirmasi.');
        }
      }
    }
  };

  const handleProceedWithoutSymptoms = () => {
    setShowSymptomModal(false);
    setSymptomText('');
    if (activeAlarmId !== null) {
      launchCamera(activeAlarmId);
      setActiveAlarmId(null);
    }
  };

  const handleSaveSymptomsAndProceed = async () => {
    const trimmed = symptomText.trim();
    if (!trimmed) {
      if (Platform.OS === 'web') window.alert('Keluhan tidak boleh kosong.');
      else Alert.alert('Peringatan', 'Keluhan tidak boleh kosong.');
      return;
    }
    
    setIsSubmittingSymptom(true);
    try {
      await api.post('/patient/diary', { kondisi: trimmed });
      setShowSymptomModal(false);
      setSymptomText('');
      if (activeAlarmId !== null) {
        launchCamera(activeAlarmId);
        setActiveAlarmId(null);
      }
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Gagal menyimpan keluhan.');
      else Alert.alert('Gagal', 'Tidak dapat menyimpan keluhan.');
    } finally {
      setIsSubmittingSymptom(false);
    }
  };

  const handleMarkAsTaken = async (alarmId: number, scheduledTimeStr?: string) => {
    // 0. Matikan semua suara notifikasi yang sedang looping
    try {
      await notifee.cancelAllNotifications();
    } catch (e) {}

    // Validasi 15 menit timeout
    if (scheduledTimeStr) {
      const now = new Date();
      const [schedHour, schedMin] = scheduledTimeStr.substring(0, 5).split(':').map(Number);
      
      const alarmDate = new Date();
      alarmDate.setHours(schedHour, schedMin, 0, 0);
      
      const diffMinutes = Math.floor((now.getTime() - alarmDate.getTime()) / 60000);
      
      if (diffMinutes > 15) {
        const msg = 'Maaf, Anda telah melewati batas waktu toleransi 15 menit dari jadwal minum obat Anda. Status Anda hari ini tercatat sebagai Terlewat.';
        if (Platform.OS === 'web') window.alert('Waktu Terlewat\n\n' + msg);
        else Alert.alert('Waktu Terlewat', msg);

        try {
          await api.post(`/patient/alarms/${alarmId}/taken`, { status: 'terlewat' });
          fetchData();
        } catch (e) {}
        
        return; // Blokir kamera & symptom modal
      }
    }
    // 1. Minta izin akses kamera HP
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      if (Platform.OS === 'web') {
         window.alert("Aplikasi butuh izin kamera untuk mengirim bukti foto!");
      } else {
         Alert.alert("Izin Ditolak", "Aplikasi butuh izin kamera untuk mengirim bukti foto!");
      }
      return;
    }

    setActiveAlarmId(alarmId);
    setShowSymptomModal(true);
  };
  // ── MANTRA AUDIO BAWAAN ──
  const playPreviewSound = async (id: string) => {
    await initAndUnlockWebAudio();

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
    }
    
    if (isPlaying && selectedSoundId === id) return;

    try {
      let soundAsset;
      if (id === 'ceria') soundAsset = require('../../assets/sounds/ceria.mp3');
      else if (id === 'darurat') soundAsset = require('../../assets/sounds/darurat.mp3');
      else soundAsset = require('../../assets/sounds/standard.wav');

      const { sound } = await Audio.Sound.createAsync(soundAsset);
      soundRef.current = sound;
      setIsPlaying(true);
      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((s) => {
        if ('didJustFinish' in s && s.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (e) {
      console.log('Gagal memutar:', e);
    }
  };

  const handleSave = async () => {
    await initAndUnlockWebAudio();
    setSavingSettings(true);
    try {
      // 1. Simpan ke Local Storage
      await Promise.all([
        AsyncStorage.setItem('saved_alarm_time', selectedTime.toISOString()),
        AsyncStorage.setItem('saved_alarm_date', selectedDate.toISOString()),
        AsyncStorage.setItem('saved_sound_id', selectedSoundId),
        AsyncStorage.setItem('saved_is_everyday', isEveryday.toString()),
      ]);

      // 2. Simpan ke Server Laravel (INI YANG BERHASIL)
      await api.post('/patient/alarms/settings', { 
        waktu: fmtTime, 
        tanggal: fmtDate, 
        nada_dering: selectedSoundId, 
        is_everyday: isEveryday 
      });

      // 3. Jadwalkan Notifikasi Lokal HP (DIBUNGKUS TRY-CATCH KHUSUS)
      if (Platform.OS !== 'web') {
        try {
            // Hitung waktu target notifikasi
            const now = new Date();
            const target = new Date();
            target.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

            // Jika waktu target sudah lewat hari ini, jadwalkan untuk besok
            if (target <= now) {
              target.setDate(target.getDate() + 1);
            }

            await jadwalkanWekerObat(target, 'ARV', selectedSoundId);
            console.log(`[Notif] ✅ Dijadwalkan weker Notifee pada ${target.toLocaleTimeString()}`);
        } catch (notifErr) {
          console.log("Info: Gagal menyetel notifikasi lokal HP:", notifErr);
          // Error ditahan di sini agar tidak memunculkan alert "Server error" palsu
        }
      }

      const msg = `Alarm ${fmtTime} berhasil disimpan.${isEveryday ? '\\n\\nDijadwalkan otomatis untuk 30 hari.' : ''}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Alarm Disimpan ✅', msg);
      
      fetchData();
    } catch (e: any) {
      // Ini baru benar-benar error dari Server Laravel
      if (Platform.OS === 'web') window.alert('Gagal: ' + (e.response?.data?.message || 'Server error.'));
      else Alert.alert('Gagal', e.response?.data?.message || 'Server error.');
    }
    finally { setSavingSettings(false); }
  };

  const pendingRefill = refills.find((r: any) => r.status === 'pending' || r.status === 'menunggu' || r.status === 'disetujui');
  const displayTodayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return (
    <SafeAreaView edges={['top', 'left', 'right']} style={st.loadWrap}><StatusBar barStyle="dark-content" /><ActivityIndicator size="large" color={C.primary} /><Text style={st.loadTxt}>Memuat pengingat...</Text></SafeAreaView>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <CustomHeader title="Pengingat Obat" />

      {/* BANNER PERINGATAN OEM KETAT (Xiaomi/Oppo/Vivo/Poco/Realme/Huawei/dst) */}
      {showDeviceWarning && (
        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowPermissionGuide(true)} style={[st.deviceWarningBanner, { alignItems: 'center' }]}>
          <MaterialIcons name="warning-amber" size={28} color="#92400e" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[st.deviceWarningText, { fontWeight: 'bold', fontSize: 14 }]}>⚠️ Weker Berisiko Mati Sendiri!</Text>
            <Text style={{ color: '#92400e', fontSize: 12, marginTop: 4 }}>Pengguna {deviceBrandLabel}, sistem HP Anda dapat mematikan weker. Ketuk di sini untuk melihat Panduan Video Anti-Mati (Wajib).</Text>
          </View>
          <MaterialIcons name="play-circle-fill" size={24} color="#92400e" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        
        {/* HERO SECTION DENGAN GAMBAR BACKGROUND (Diperpanjang membungkus Jadwal Hari Ini) */}
        <ImageBackground 
          source={require('../../assets/img/bg_obat.jpeg')} 
          style={st.heroFull} 
          imageStyle={{ opacity: 0.15 }} // Opacity dinaikkan sedikit agar tekstur medis lebih terlihat
        >
          <View style={st.heroOverlayFull}>
            {/* Bagian Atas: Ringkasan Kepatuhan */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={st.heroT}>Tetap Kuat</Text>
                <Text style={st.heroS}>Kepatuhan ARV harian di {compliancePercent}%</Text>
              </View>
              <CircleProgress percent={compliancePercent} size={72} />
            </View>

            {/* Bagian Bawah: JADWAL HARI INI di dalam Background */}
            <View style={st.secH}>
              <Text style={[st.secT, { color: '#ffffff' }]}>Jadwal Hari Ini</Text>
              <Text style={[st.secD, { color: C.primaryFixedDim }]}>{displayTodayStr}</Text>
            </View>
            
            <View style={{ gap: S.md, marginTop: 8 }}>
              {todayAlarms.length > 0 ? (
                todayAlarms.slice(0, 5).map((alarm: any, idx: number) => {
                  const isTaken = alarm.status === 'sudah';
                  const isPending = !alarm.status || alarm.status === 'belum';

                  const [h, m] = alarm.waktu.split(':').map(Number);
                  const alarmTimeObj = new Date();
                  alarmTimeObj.setHours(h, m, 0, 0);
                  const isTimePassed = currentTimeForUI >= alarmTimeObj;

                  return (
                    <View style={st.doseCard} key={alarm.id || idx}>
                      <View style={st.dose}>
                        <View style={st.doseL}>
                          <View style={[st.doseIc, isTaken ? { backgroundColor: C.secondaryFixed } : { backgroundColor: C.surfaceContainer }]}>
                            <MaterialIcons name={isTaken ? 'check-circle' : 'schedule'} size={22} color={isTaken ? C.onSecondaryFixed : C.onSurface} />
                          </View>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={st.doseT} numberOfLines={1}>ARV — {alarm.waktu?.substring(0, 5)}</Text>
                            <Text style={st.doseSub} numberOfLines={1}>Nada: {alarm.nada_dering || 'Standar'}</Text>
                          </View>
                        </View>
                        
                        <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          {isTaken ? (
                            <View style={st.doseBdgTaken}><Text style={st.doseBdgTakenT}>DIMINUM ✓</Text></View>
                          ) : (
                            <View style={st.doseBdg}><Text style={st.doseBdgT}>{alarm.status || 'TERJADWAL'}</Text></View>
                          )}
                          
                          {isPending && (
                            <TouchableOpacity onPress={() => handleDeleteAlarm(alarm.id)} style={{ padding: 4 }}>
                              <MaterialIcons name="delete-outline" size={18} color={C.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      
                      {isPending && isTimePassed && (
                        <TouchableOpacity style={st.markTakenBtn} onPress={() => handleMarkAsTaken(alarm.id, alarm.jam || alarm.waktu)} activeOpacity={0.8}>
                          <MaterialIcons name="check-circle" size={18} color="#fff" />
                          <Text style={st.markTakenTxt}>Tandai Sudah Diminum</Text>
                        </TouchableOpacity>
                      )}
                      {isPending && !isTimePassed && (
                        <View style={[st.markTakenBtn, { backgroundColor: C.surfaceContainer }]}>
                          <MaterialIcons name="lock-clock" size={18} color={C.outline} />
                          <Text style={[st.markTakenTxt, { color: C.outline }]}>Tunggu Jam {alarm.waktu}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={st.doseCard}>
                  <View style={st.dose}>
                    <View style={st.doseL}>
                      <View style={[st.doseIc, { backgroundColor: C.surfaceContainer }]}><MaterialIcons name="done-all" size={24} color={C.onSurfaceVariant} /></View>
                      <View><Text style={st.doseT}>Belum ada jadwal</Text><Text style={st.doseSub}>Anda bisa mengaturnya di bawah</Text></View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ImageBackground>

        {/* SETTINGS ALARM */}
        <View style={st.sec}>
          <Text style={st.secT}>Pengaturan Alarm</Text>
          <View style={st.card}>
            <View style={st.sectionHeader}>
              <MaterialIcons name="settings-suggest" size={20} color={C.primary} />
              <Text style={st.sectionTitle}>Pengaturan Jadwal ARV</Text>
            </View>
            <Text style={{ fontSize: 12, color: C.outlineVariant, marginBottom: 12, marginTop: -4 }}>
              * Sistem saat ini mendukung 1 jadwal pengingat utama per hari.
            </Text>
            {Platform.OS === 'web' ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[st.pickerBtn, { flex: 1 }]}>
                  <MaterialIcons name="schedule" size={22} color={C.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerLbl}>Jam</Text>
                    {/* @ts-ignore */}
                    <input type="time" value={fmtTime} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); const d = new Date(selectedTime); d.setHours(h, m, 0, 0); setSelectedTime(d); }} style={{ border: 'none', background: 'transparent', fontSize: 16, fontWeight: 700, color: '#012D1D', outline: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }} />
                  </View>
                </View>
                <View style={[st.pickerBtn, { flex: 1 }]}>
                  <MaterialIcons name="event" size={22} color={C.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerLbl}>Tanggal</Text>
                    {/* @ts-ignore */}
                    <input type="date" value={fmtDate} onChange={(e) => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setSelectedDate(d); }} min={getLocalDateString()} style={{ border: 'none', background: 'transparent', fontSize: 16, fontWeight: 700, color: '#012D1D', outline: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }} />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={[st.pickerBtn, { flex: 1 }]} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
                    <MaterialIcons name="schedule" size={22} color={C.primary} />
                    <View><Text style={st.pickerLbl}>Jam</Text><Text style={st.pickerVal}>{fmtTime}</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.pickerBtn, { flex: 1 }]} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                    <MaterialIcons name="event" size={22} color={C.secondary} />
                    <View><Text style={st.pickerLbl}>Tanggal</Text><Text style={st.pickerVal}>{fmtDate}</Text></View>
                  </TouchableOpacity>
                </View>
                {showTimePicker && <DateTimePicker value={selectedTime} mode="time" is24Hour display="spinner" onChange={(e, d) => { 
                  if (Platform.OS === 'android') setShowTimePicker(false);
                  if (d) setSelectedTime(d); 
                }} />}
                {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" minimumDate={new Date(new Date().setHours(0,0,0,0))} onChange={(e, d) => { 
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (d) setSelectedDate(d); 
                }} />}
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm, paddingHorizontal: S.xs, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="event-repeat" size={20} color={isEveryday ? C.primary : C.outline} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.onSurface }}>Ulangi Setiap Hari</Text>
              </View>
              <Switch 
                value={isEveryday} 
                onValueChange={setIsEveryday} 
                trackColor={{ false: C.outlineVariant, true: C.primaryFixedDim }} 
                thumbColor={isEveryday ? C.primary : C.surface} 
              />
            </View>
            <Text style={{ fontSize: 10, color: C.outline, paddingHorizontal: S.xs, marginTop: -4 }}>
              {isEveryday ? '*Alarm pintar: jadwal otomatis hingga 30 hari ke depan.' : '*Alarm hanya 1 kali pada tanggal tersebut.'}
            </Text>
          </View>

          <View style={st.card}>
            <View style={st.cardH}><MaterialIcons name="music-note" size={20} color={C.secondary} /><Text style={st.cardHT}>Pilih Nada Dering</Text></View>
            <View style={{ flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {[
                { id: 'standar', name: 'Standar (Lembut)', icon: 'notifications' },
                { id: 'ceria', name: 'Ceria (Semangat)', icon: 'sentiment-satisfied' },
                { id: 'darurat', name: 'Darurat (Keras)', icon: 'warning' }
              ].map((sound) => (
                <TouchableOpacity 
                  key={sound.id}
                  style={[st.soundChip, selectedSoundId === sound.id && st.soundChipActive]}
                  onPress={() => { setSelectedSoundId(sound.id); playPreviewSound(sound.id); }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name={sound.icon as any} size={20} color={selectedSoundId === sound.id ? '#ffffff' : C.primary} />
                  <Text style={[st.soundChipTxt, selectedSoundId === sound.id && { color: '#ffffff' }]}>{sound.name}</Text>
                  {selectedSoundId === sound.id && isPlaying && (
                    <MaterialIcons name="volume-up" size={18} color="#ffffff" style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={st.listSubText}>*Klik untuk pratinjau suara.</Text>
          </View>

          <TouchableOpacity style={st.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={savingSettings}>
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={st.saveTxt}>{savingSettings ? 'Menyimpan...' : 'Simpan Alarm & Nada Dering'}</Text>
          </TouchableOpacity>

          {/* Tombol Cek Panduan Izin Alarm Secara Manual */}
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, padding: 10 }} 
            onPress={() => setShowPermissionGuide(true)}
          >
            <MaterialIcons name="info-outline" size={18} color={C.primary} />
            <Text style={{ color: C.primary, marginLeft: 6, fontWeight: 'bold' }}>Lihat Panduan Izin Weker (Wajib)</Text>
          </TouchableOpacity>
        </View>

        <View style={st.sec}>
          <Text style={st.secT}>Pengisian Ulang Obat</Text>
          <View style={st.card}>
            {/* Contoh Foto Obat (Placeholder Statis) */}
            <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ 
                width: '100%', height: 140, borderRadius: 12, 
                backgroundColor: C.surfaceContainer, 
                borderWidth: 1, borderColor: C.outlineVariant, borderStyle: 'dashed',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                overflow: 'hidden',
              }}>
                <MaterialIcons name="medication" size={40} color={C.outline} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.outline }}>Contoh Foto Obat ARV</Text>
                <Text style={{ fontSize: 10, color: C.outlineVariant, textAlign: 'center', paddingHorizontal: 24 }}>
                  Foto obat akan ditampilkan di sini saat refill disetujui
                </Text>
              </View>
            </View>

            {pendingRefill ? (
              <View style={[st.refBtn, { backgroundColor: C.outline }]}><MaterialIcons name="hourglass-top" size={20} color="#ffffff" /><Text style={st.refBtnT}>Menunggu Persetujuan Refill...</Text></View>
            ) : (
              <TouchableOpacity style={st.refBtn} onPress={handleRefill} activeOpacity={0.85} disabled={refillLoading}>
                <MaterialIcons name="local-pharmacy" size={20} color="#ffffff" /><Text style={st.refBtnT}>{refillLoading ? 'Memproses...' : 'Ajukan Refill Obat'}</Text>
              </TouchableOpacity>
            )}
            
            {refills.length > 0 && (
              <View style={{ gap: S.sm, marginTop: S.md }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.onSurface }}>Riwayat Refill</Text>
                {refills.slice(0, 5).map((r: any, i: number) => (
                  <View style={st.logC} key={r.id || i}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                      <MaterialIcons name="history" size={16} color={C.secondary} />
                      <Text style={st.logT}>Siklus ke-{r.siklus_ke} • {r.tanggal_refill} • <Text style={{ fontWeight: '700', color: r.status === 'approved' || r.status === 'selesai' ? '#16a34a' : r.status === 'pending' || r.status === 'menunggu' ? C.secondary : r.status === 'disetujui' ? C.primary : C.outline }}>{r.status}</Text></Text>
                    </View>
                    {r.status === 'disetujui' && !r.foto_bukti && (
                      <TouchableOpacity style={{ marginTop: 8, backgroundColor: C.primary, padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }} onPress={() => handleUploadRefillPhoto(r.id)} activeOpacity={0.8}>
                        <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Kirim Bukti Foto</Text>
                      </TouchableOpacity>
                    )}
                    {r.status === 'disetujui' && r.foto_bukti && (
                      <View style={{ marginTop: 8, backgroundColor: C.secondaryFixed, padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="check-circle" size={16} color={C.onSecondaryFixed} />
                        <Text style={{ color: C.onSecondaryFixed, fontSize: 12, fontWeight: '700' }}>Bukti Foto Terkirim, Menunggu Verifikasi</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Privacy Card */}
        <View style={st.privCard}>
          <View style={st.privImgWrap}>
            <MaterialIcons name="enhanced-encryption" size={32} color={C.outline} />
          </View>
          <Text style={st.privTxt}>Data kesehatan Anda terenkripsi dan tetap sepenuhnya pribadi.</Text>
        </View>
        <View style={{ height: 48 }} />
      </ScrollView>

      {/* MODAL PANDUAN IZIN ALARM */}
      <Modal visible={showPermissionGuide} transparent={true} animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { maxHeight: '85%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[st.modalTitle, { color: C.error, marginBottom: 0 }]}>⚠️ Izin Sistem Terbatas</Text>
              <TouchableOpacity onPress={() => setShowPermissionGuide(false)}>
                <MaterialIcons name="close" size={24} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 14, color: C.onSurfaceVariant, marginBottom: 15 }}>
              Agar weker bisa menyala otomatis saat layar HP terkunci, mohon ikuti panduan wajib ini:
            </Text>

            <ScrollView style={{ marginBottom: 15 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 20, backgroundColor: C.surfaceContainer, padding: 12, borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: C.primary }}>1. Baterai (Wajib)</Text>
                  {permBatteryOk && <MaterialIcons name="check-circle" size={20} color={C.primary} />}
                </View>
                <Text style={{ fontSize: 13, color: C.onSurface, marginBottom: 10 }}>Pilih "Tidak Dibatasi" / "Unrestricted" agar weker tetap jalan saat aplikasi ditutup.</Text>
                {!permBatteryOk ? (
                  <TouchableOpacity onPress={() => notifee.openBatteryOptimizationSettings()} style={{ backgroundColor: C.primary, padding: 8, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Buka Pengaturan Baterai</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: C.secondaryContainer, padding: 8, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: C.onSecondaryContainer, fontWeight: 'bold' }}>Selesai Diatur</Text>
                  </View>
                )}
              </View>

              <View style={{ marginBottom: 20, backgroundColor: C.surfaceContainer, padding: 12, borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: C.primary }}>2. Tampil di Atas Aplikasi</Text>
                  {permOverlayOk && <MaterialIcons name="check-circle" size={20} color={C.primary} />}
                </View>
                <Text style={{ fontSize: 13, color: C.onSurface, marginBottom: 10 }}>Aktifkan "Display over other apps" agar notifikasi bisa membongkar lock screen.</Text>
                {!permOverlayOk ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => Linking.openSettings()} style={{ flex: 1, backgroundColor: C.primary, padding: 8, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Buka Pengaturan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPermOverlayOk(true)} style={{ backgroundColor: C.surfaceVariant, padding: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="check" size={18} color={C.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ backgroundColor: C.secondaryContainer, padding: 8, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: C.onSecondaryContainer, fontWeight: 'bold' }}>Selesai Diatur</Text>
                  </View>
                )}
              </View>

              <View style={{ marginBottom: 10, backgroundColor: C.surfaceContainer, padding: 12, borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: C.primary }}>3. Mulai Otomatis</Text>
                  {permAutoStartOk && <MaterialIcons name="check-circle" size={20} color={C.primary} />}
                </View>
                <Text style={{ fontSize: 13, color: C.onSurface, marginBottom: 10 }}>Khusus Oppo/Vivo/Xiaomi: nyalakan "Auto-start" agar sistem tidak mematikan weker.</Text>
                {!permAutoStartOk ? (
                  <TouchableOpacity onPress={() => notifee.openPowerManagerSettings()} style={{ backgroundColor: C.primary, padding: 8, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Buka Pengaturan Auto-start</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: C.secondaryContainer, padding: 8, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: C.onSecondaryContainer, fontWeight: 'bold' }}>Selesai Diatur / Tidak Perlu</Text>
                  </View>
                )}
              </View>

              {isAggressiveOEM() && (
                <View style={{ marginBottom: 10, backgroundColor: C.surfaceContainer, padding: 12, borderRadius: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: C.error }}>4. Swipe Aplikasi (PENTING!)</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: C.onSurface, marginBottom: 10 }}>Wajib swipe aplikasi ini di layar Recent Apps (seperti contoh video di bawah) agar alarm tidak dimatikan paksa oleh sistem HP.</Text>
                  <View style={{ height: 350, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#000' }}>
                    <TutorialVideo />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[st.btnPri, { flex: 1, backgroundColor: C.error }]} onPress={() => setShowPermissionGuide(false)}>
                <Text style={st.btnPriT}>Saya Sudah Mengatur Semuanya</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL GEJALA HARIAN */}
      <Modal visible={showSymptomModal} transparent={true} animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <Text style={st.modalTitle}>Pengecekan Gejala Harian</Text>
            <Text style={st.modalSubtitle}>Apakah Anda merasakan gejala atau keluhan fisik hari ini?</Text>
            
            <TextInput
              style={st.symptomInput}
              placeholder="Ceritakan keluhan Anda di sini (opsional)..."
              value={symptomText}
              onChangeText={setSymptomText}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#94a3b8"
            />
            
            <View style={st.modalBtnRow}>
              <TouchableOpacity style={st.modalBtnSkip} onPress={handleProceedWithoutSymptoms}>
                <Text style={st.modalBtnSkipText}>Tidak Ada Keluhan (Lanjut Foto)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[st.modalBtnSave, !symptomText.trim() && { opacity: 0.5 }]} 
                onPress={handleSaveSymptomsAndProceed}
                disabled={isSubmittingSymptom || !symptomText.trim()}
              >
                <Text style={st.modalBtnSaveText}>
                  {isSubmittingSymptom ? 'Menyimpan...' : 'Simpan & Lanjut Foto'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={st.modalCloseBtn} onPress={() => { setShowSymptomModal(false); setActiveAlarmId(null); }}>
               <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ── Styles (Tema Material 3 / Emerald-Mint) ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  deviceWarningBanner: { backgroundColor: '#fef3c7', padding: 12, flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: S.margin, marginTop: S.md, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  deviceWarningText: { flex: 1, color: '#92400e', fontSize: 13, lineHeight: 18 },
  loadWrap: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  loadTxt: { marginTop: S.md, fontSize: 16, color: C.outline },
  scroll: { paddingHorizontal: S.margin, paddingTop: S.lg },
  
  // Hero Image Background Style (Diperpanjang)
  heroFull: { 
    backgroundColor: C.primaryContainer, 
    borderRadius: 16, 
    marginBottom: S.lg, 
    overflow: 'hidden',
    elevation: 4,
    shadowColor: C.primaryContainer, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 
  },
  heroOverlayFull: { 
    padding: S.lg,
    backgroundColor: 'rgba(27, 67, 50, 0.5)', // Dibuat sedikit lebih gelap agar elemen di dalamnya sangat kontras
  },
  heroT: { fontSize: 24, fontWeight: '700', lineHeight: 32, color: '#ffffff', marginBottom: S.xs },
  heroS: { fontSize: 14, lineHeight: 20, color: C.primaryFixedDim, opacity: 0.9 },
  
  sec: { gap: S.md, marginBottom: S.lg },
  secH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  secT: { fontSize: 20, fontWeight: '700', lineHeight: 28, color: C.onBackground },
  secD: { fontSize: 12, fontWeight: '600', color: C.outline },
  
  doseCard: { backgroundColor: C.surfaceContainerLowest, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', elevation: 1, overflow: 'hidden' }, // Border disesuaikan untuk background gelap
  dose: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: S.md },
  doseL: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  doseIc: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doseT: { fontSize: 14, fontWeight: '700', color: C.onSurface },
  doseSub: { fontSize: 11, fontWeight: '500', color: C.outline, marginTop: 1 },
  
  doseBdg: { backgroundColor: C.surfaceContainer, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  doseBdgT: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: C.onSurfaceVariant, textTransform: 'uppercase' },
  doseBdgTaken: { backgroundColor: C.secondaryFixed, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  doseBdgTakenT: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: C.onSecondaryFixed, textTransform: 'uppercase' },
  
  markTakenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primary, paddingVertical: 12, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  markTakenTxt: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  
  refBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12 },
  refBtnT: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  logC: { flexDirection: 'column', alignItems: 'stretch', backgroundColor: C.surfaceContainerLowest, padding: S.sm, borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant },
  logT: { fontSize: 12, color: C.onSurface, flex: 1 },
  
  privCard: { backgroundColor: C.surfaceContainer, borderRadius: 16, padding: S.xl, borderWidth: 1, borderColor: C.outlineVariant, alignItems: 'center', gap: S.md },
  privImgWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.outlineVariant },
  privTxt: { fontSize: 12, color: C.primary, textAlign: 'center', maxWidth: 220 },
  
  card: { backgroundColor: C.surfaceContainerLow, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.outlineVariant, gap: 12 },
  cardH: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  cardHT: { fontSize: 14, fontWeight: '700', color: C.onSurface },
  
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.primaryFixed, paddingVertical: 12, paddingHorizontal: S.sm, borderRadius: 12 },
  pickerLbl: { fontSize: 10, fontWeight: '600', color: C.onPrimaryFixed, opacity: 0.8 },
  pickerVal: { fontSize: 16, fontWeight: '700', color: C.primary },
  
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, backgroundColor: C.secondary, paddingVertical: 14, borderRadius: 12 },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  
  soundChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceContainerLowest, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant },
  soundChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  soundChipTxt: { fontSize: 13, fontWeight: '700', color: C.primary },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: S.lg },
  modalContent: { backgroundColor: C.surfaceContainerLowest, width: '100%', borderRadius: 20, padding: S.lg, position: 'relative', elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.primary, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: C.onSurfaceVariant, marginBottom: S.md, lineHeight: 20 },
  symptomInput: { backgroundColor: C.surfaceContainerLow, borderRadius: 12, padding: S.sm, fontSize: 14, color: C.onSurface, minHeight: 100, borderWidth: 1, borderColor: C.outlineVariant, marginBottom: S.lg },
  modalBtnRow: { flexDirection: 'column', gap: S.sm },
  modalBtnSkip: { backgroundColor: C.surfaceContainer, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnSkipText: { fontSize: 14, fontWeight: '700', color: C.onSurfaceVariant },
  modalBtnSave: { backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnSaveText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  modalCloseBtn: { position: 'absolute', top: S.md, right: S.md, padding: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'flex-start', gap: 8, alignItems: 'center', marginBottom: S.sm, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.onSurface, letterSpacing: -0.5 },
  listSubText: { fontSize: 10, color: C.outline, marginTop: 4 },
  
  // Custom Modal Button Styles added for the permission guide
  btnPri: { backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPriT: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});

export default MedicationReminderScreen;
