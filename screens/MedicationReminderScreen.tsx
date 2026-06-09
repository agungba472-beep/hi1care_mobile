import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, 
  StatusBar, ActivityIndicator, Alert, Platform, Switch, ImageBackground 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/api';
import CustomHeader from '../components/CustomHeader';

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
  onSurface: '#191c1c', onSurfaceVariant: '#414844',
  outline: '#717973', outlineVariant: '#c1c8c2',
  primary: '#012d1d', onPrimary: '#ffffff', primaryContainer: '#1b4332',
  onPrimaryContainer: '#86af99', primaryFixed: '#c1ecd4', onPrimaryFixed: '#012d1d', primaryFixedDim: '#a5d0b9',
  secondary: '#4c6452', onSecondary: '#ffffff', secondaryContainer: '#cce6d0',
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

const MedicationReminderScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
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
  const soundRef = useRef<Audio.Sound | null>(null);

  // ── WEB AUDIO API: REFS UNTUK BYPASS AUTOPLAY POLICY ──
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webAudioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const webAudioReadyRef = useRef(false);

  // ── FIX 2: TIMER UNTUK UPDATE GEMBOK WAKTU SETIAP 5 DETIK ──
  const [currentTimeForUI, setCurrentTimeForUI] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeForUI(new Date()), 5000);
    return () => clearInterval(timer);
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
          { id: 'standar', module: require('../assets/sounds/standard.wav') },
          { id: 'ceria',   module: require('../assets/sounds/ceria.mp3') },
          { id: 'darurat', module: require('../assets/sounds/darurat.mp3') },
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

  useFocusEffect(useCallback(() => {
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
  }, []));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [aR, rR, dR] = await Promise.all([
        api.get('/patient/alarms'), api.get('/patient/refill-history'), api.get('/patient/dashboard'),
      ]);
      setAlarms(aR.data.data || []);
      setRefills(rR.data.data || []);
      const kep = dR.data.data?.pasien_info?.kepatuhan || [];
      if (kep.length > 0) {
        const diminum = kep.filter((k: any) => k.status === 'diminum').length;
        setCompliancePercent(Math.round((diminum / kep.length) * 100));
      }
    } catch (e) {} finally { setLoading(false); }
  }, []);
  
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

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

  const handleMarkAsTaken = async (alarmId: number) => {
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
        
      } catch (error: any) {
        console.log("Gagal kirim foto:", error);
        const errorMsg = error.response?.data?.message || "Gagal mengirim bukti, periksa koneksi internet.";
        if (Platform.OS === 'web') {
           window.alert("Gagal: " + errorMsg);
        } else {
           Alert.alert("Gagal", errorMsg);
        }
      }
    }
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
      if (id === 'ceria') soundAsset = require('../assets/sounds/ceria.mp3');
      else if (id === 'darurat') soundAsset = require('../assets/sounds/darurat.mp3');
      else soundAsset = require('../assets/sounds/standard.wav');

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
      await Promise.all([
        AsyncStorage.setItem('saved_alarm_time', selectedTime.toISOString()),
        AsyncStorage.setItem('saved_alarm_date', selectedDate.toISOString()),
        AsyncStorage.setItem('saved_sound_id', selectedSoundId),
        AsyncStorage.setItem('saved_is_everyday', isEveryday.toString()),
      ]);

      await api.post('/patient/alarms/settings', { 
        waktu: fmtTime, 
        tanggal: fmtDate, 
        nada_dering: selectedSoundId, 
        is_everyday: isEveryday 
      });

      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await Notifications.cancelAllScheduledNotificationsAsync();
          await Notifications.scheduleNotificationAsync({
            content: { title: 'Waktunya Minum ARV! 💊', body: `Halo, ini pengingat jadwal minum obat Anda (${fmtTime}).`, sound: true },
            trigger: { hour: selectedTime.getHours(), minute: selectedTime.getMinutes(), repeats: true } as any,
          });
        }
      }

      const msg = `Alarm ${fmtTime} berhasil disimpan.${isEveryday ? '\\n\\nDijadwalkan otomatis untuk 30 hari.' : ''}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Alarm Disimpan ✅', msg);
      
      fetchData();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert('Gagal: ' + (e.response?.data?.message || 'Server error.'));
      else Alert.alert('Gagal', e.response?.data?.message || 'Server error.');
    }
    finally { setSavingSettings(false); }
  };

  const pendingRefill = refills.find((r: any) => r.status === 'pending' || r.status === 'menunggu' || r.status === 'disetujui');
  const displayTodayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return (
    <SafeAreaView style={st.loadWrap}><StatusBar barStyle="dark-content" /><ActivityIndicator size="large" color={C.primary} /><Text style={st.loadTxt}>Memuat pengingat...</Text></SafeAreaView>
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <CustomHeader title="Pengingat Obat" />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        
        {/* HERO SECTION DENGAN GAMBAR BACKGROUND (Diperpanjang membungkus Jadwal Hari Ini) */}
        <ImageBackground 
          source={require('../assets/img/bg_obat.jpeg')} 
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
                todayAlarms.map((alarm: any, idx: number) => {
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
                            <MaterialIcons name={isTaken ? 'check-circle' : 'schedule'} size={24} color={isTaken ? C.onSecondaryFixed : C.onSurface} />
                          </View>
                          <View>
                            <Text style={st.doseT}>ARV — {alarm.waktu}</Text>
                            <Text style={st.doseSub}>Nada: {alarm.nada_dering || 'Standar'}</Text>
                          </View>
                        </View>
                        
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          {isTaken ? (
                            <View style={st.doseBdgTaken}><Text style={st.doseBdgTakenT}>SUDAH DIMINUM</Text></View>
                          ) : (
                            <View style={st.doseBdg}><Text style={st.doseBdgT}>{alarm.status || 'TERJADWAL'}</Text></View>
                          )}
                          
                          {isPending && (
                            <TouchableOpacity onPress={() => handleDeleteAlarm(alarm.id)} style={{ padding: 4 }}>
                              <MaterialIcons name="delete-outline" size={20} color={C.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      
                      {isPending && isTimePassed && (
                        <TouchableOpacity style={st.markTakenBtn} onPress={() => handleMarkAsTaken(alarm.id)} activeOpacity={0.8}>
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
            <View style={st.cardH}>
              <MaterialIcons name="notifications-active" size={20} color={C.primary} />
              <Text style={st.cardHT}>Setel Waktu & Tanggal</Text>
            </View>
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
                {showTimePicker && <DateTimePicker value={selectedTime} mode="time" is24Hour display="default" onChange={(e, d) => { setShowTimePicker(false); if(d) setSelectedTime(d); }} />}
                {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setSelectedDate(d); }} minimumDate={new Date()} />}
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
            <Text style={{ fontSize: 10, color: C.outline, marginTop: 4 }}>*Klik untuk pratinjau suara.</Text>
          </View>

          <TouchableOpacity style={st.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={savingSettings}>
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={st.saveTxt}>{savingSettings ? 'Menyimpan...' : 'Simpan Alarm & Nada Dering'}</Text>
          </TouchableOpacity>
        </View>

        {/* Refill */}
        <View style={st.sec}>
          <Text style={st.secT}>Pengisian Ulang Obat</Text>
          <View style={st.card}>
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
    </SafeAreaView>
  );
};

// ── Styles (Tema Material 3 / Emerald-Mint) ──
const st = StyleSheet.create({
  loadWrap: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  loadTxt: { marginTop: S.md, fontSize: 16, color: C.outline },
  safe: { flex: 1, backgroundColor: C.background },
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
  dose: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: S.md },
  doseL: { flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1 },
  doseIc: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  doseT: { fontSize: 16, fontWeight: '700', color: C.onSurface },
  doseSub: { fontSize: 12, fontWeight: '500', color: C.outline, marginTop: 2 },
  
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
});

export default MedicationReminderScreen;
