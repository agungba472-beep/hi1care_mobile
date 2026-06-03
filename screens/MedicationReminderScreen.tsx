import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, StatusBar, ActivityIndicator, Alert, Platform, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
// Nada dering bawaan (tidak perlu DocumentPicker)
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import api from '../src/api';

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

const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff', surfaceContainerHighest: '#d5e3fc',
  surfaceVariant: '#d5e3fc', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff', primaryFixed: '#dae2ff', primaryFixedDim: '#b1c5ff',
  secondary: '#6b4ab2', onSecondary: '#ffffff', secondaryContainer: '#b191fd',
  secondaryFixed: '#eaddff', onSecondaryFixed: '#24005b', secondaryFixedDim: '#d1bcff',
  tertiary: '#42495c', error: '#ba1a1a', background: '#f8f9ff', onBackground: '#0d1c2e',
} as const;
const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

const CircleProgress: React.FC<{ percent: number; size: number }> = ({ percent, size }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: 'rgba(255,255,255,0.2)' }} />
    <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: '#fff', borderRightColor: percent < 100 ? 'rgba(255,255,255,0.2)' : '#fff', transform: [{ rotate: '-90deg' }] }} />
  </View>
);

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
  const todayAlarms = alarms.filter((a: any) => !a.tanggal || a.tanggal === localTodayStr);

  // ── WEB AUDIO: AUTO PRELOAD saat komponen mount (tanpa perlu gesture) ──
  // Buffer loading boleh dari background, tapi AudioContext tetap perlu gesture untuk unlock
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const preloadBuffers = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        // Buat ctx dulu — mungkin suspended, tapi buffer bisa preload dulu
        const ctx = new AudioCtx();
        webAudioCtxRef.current = ctx;

        const soundFiles = [
          { id: 'standar', url: '/assets/?unstable_path=./assets/sounds/standard.wav' },
          { id: 'ceria',   url: '/assets/?unstable_path=./assets/sounds/ceria.mp3' },
          { id: 'darurat', url: '/assets/?unstable_path=./assets/sounds/darurat.mp3' },
        ];

        for (const s of soundFiles) {
          try {
            const response = await fetch(s.url);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              webAudioBuffersRef.current[s.id] = audioBuffer;
              console.log(`[WebAudio] ✅ Preloaded: ${s.id}`);
            }
          } catch (err) {
            console.log(`[WebAudio] ❌ Gagal preload ${s.id}:`, err);
          }
        }

        const loaded = Object.keys(webAudioBuffersRef.current).length;
        if (loaded > 0) {
          console.log(`[WebAudio] Buffer siap: ${loaded}/3`);
          // Belum set Ready=true — tunggu user gesture untuk unlock ctx
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

  // ── FUNGSI UNLOCK (dipanggil dari klik user) ──
  const initAndUnlockWebAudio = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    if (webAudioReadyRef.current) return;

    const ctx = webAudioCtxRef.current;
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      console.log(`[WebAudio] AudioContext state: ${ctx.state}`);

      // Jika buffer belum ada, load sekarang
      if (Object.keys(webAudioBuffersRef.current).length === 0) {
        const soundFiles = [
          { id: 'standar', url: '/assets/?unstable_path=./assets/sounds/standard.wav' },
          { id: 'ceria',   url: '/assets/?unstable_path=./assets/sounds/ceria.mp3' },
          { id: 'darurat', url: '/assets/?unstable_path=./assets/sounds/darurat.mp3' },
        ];
        for (const s of soundFiles) {
          try {
            const res = await fetch(s.url);
            if (res.ok) {
              const ab = await res.arrayBuffer();
              webAudioBuffersRef.current[s.id] = await ctx.decodeAudioData(ab);
              console.log(`[WebAudio] ✅ Loaded on unlock: ${s.id}`);
            }
          } catch (e) {}
        }
      }

      if (Object.keys(webAudioBuffersRef.current).length > 0) {
        webAudioReadyRef.current = true;
        console.log('[WebAudio] ✅ SIAP & UNLOCKED!');
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

        console.log(`[Web Alarm] Cek Jam: ${currentTimeStr} | Alarm hari ini: ${todayAlarms.length} | Cocok: ${activeAlarm ? 'YA ✅' : 'belum'}`);

        if (activeAlarm) {
          // Gunakan localStorage agar tidak bunyi berkali-kali di menit yang sama
          const lastPlayed = localStorage.getItem('last_played_alarm_time');
          if (lastPlayed !== currentTimeStr) {
            localStorage.setItem('last_played_alarm_time', currentTimeStr);
            
            // 1. Putar Suara via Web Audio API (BYPASS AUTOPLAY POLICY!)
            playWebAlarmSound(activeAlarm.nada_dering || 'standar');
            
            // 2. Munculkan Notifikasi Layar
            setTimeout(() => {
              window.alert(`⏰ WAKTUNYA MINUM OBAT ARV!\nJadwal: ${activeAlarm.waktu}\nNada: ${activeAlarm.nada_dering || 'standar'}`);
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

  const handleMarkAsTaken = async (alarmId: number) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm('Apakah Anda yakin sudah meminum obat ini?');
      if (confirm) {
        try {
          await api.post(`/patient/alarms/${alarmId}/taken`);
          window.alert('Berhasil ✅ Obat berhasil ditandai sebagai diminum.');
          fetchData();
        } catch (e: any) { window.alert('Gagal: ' + (e.response?.data?.message || 'Tidak dapat memperbarui status.')); }
      }
    } else {
      Alert.alert('Konfirmasi Minum Obat', 'Apakah Anda yakin sudah meminum obat ini?', [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Sudah Diminum',
          onPress: async () => {
            try {
              await api.post(`/patient/alarms/${alarmId}/taken`);
              Alert.alert('Berhasil ✅', 'Obat berhasil ditandai sebagai diminum.');
              fetchData();
            } catch (e: any) { Alert.alert('Gagal', e.response?.data?.message || 'Tidak dapat memperbarui status.'); }
          },
        },
      ]);
    }
  };

  // ── MANTRA AUDIO BAWAAN ──
  const playPreviewSound = async (id: string) => {
    // Init + Unlock web audio saat user klik preview (ini adalah user gesture!)
    await initAndUnlockWebAudio();

    // Matikan suara yang sedang diputar
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
    }
    
    // Matikan preview jika diklik suara yang sama dua kali
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
    // Init + Unlock web audio saat user klik Simpan (ini adalah user gesture!)
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
        nada_dering: selectedSoundId, // Mengirimkan 'standar', 'ceria', atau 'darurat'
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

      const msg = `Alarm ${fmtTime} berhasil disimpan.${isEveryday ? '\n\nDijadwalkan otomatis untuk 30 hari.' : ''}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Alarm Disimpan ✅', msg);
      
      fetchData();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert('Gagal: ' + (e.response?.data?.message || 'Server error.'));
      else Alert.alert('Gagal', e.response?.data?.message || 'Server error.');
    }
    finally { setSavingSettings(false); }
  };


  const pendingRefill = refills.find((r: any) => r.status === 'pending' || r.status === 'menunggu');
  const displayTodayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return (
    <SafeAreaView style={st.loadWrap}><StatusBar barStyle="dark-content" /><ActivityIndicator size="large" color={C.primary} /><Text style={st.loadTxt}>Memuat pengingat...</Text></SafeAreaView>
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <View style={st.header}><Text style={st.headerT}>Pengingat Obat</Text></View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.hero}>
          <View style={{ flex: 1 }}>
            <Text style={st.heroT}>Tingkat Kepatuhan</Text>
            <Text style={st.heroS}>{compliancePercent >= 80 ? 'Luar biasa! Pertahankan rutinitas Anda.' : 'Ayo tingkatkan konsistensi Anda!'}</Text>
          </View>
          <CircleProgress percent={compliancePercent} size={72} />
        </View>

        <View style={st.sec}>
          <View style={st.secH}><Text style={st.secT}>Jadwal Hari Ini</Text><Text style={st.secD}>{displayTodayStr}</Text></View>
          {todayAlarms.length > 0 ? (
            todayAlarms.map((alarm: any, idx: number) => {
              const isTaken = alarm.status === 'sudah';
              const isPending = !alarm.status || alarm.status === 'belum';

              // ── LOGIKA GEMBOK WAKTU ──
              const [h, m] = alarm.waktu.split(':').map(Number);
              const alarmTimeObj = new Date();
              alarmTimeObj.setHours(h, m, 0, 0);
              // Cek apakah waktu saat ini sudah MENGLEWATI atau SAMA DENGAN jam alarm
              const isTimePassed = currentTimeForUI >= alarmTimeObj;

              return (
                <View style={st.doseCard} key={alarm.id || idx}>
                  <View style={st.dose}>
                    <View style={st.doseL}>
                      <View style={[st.doseIc, isTaken && { backgroundColor: '#dcfce7' }]}>
                        <MaterialIcons name={isTaken ? 'check-circle' : 'schedule'} size={24} color={isTaken ? '#16a34a' : C.onSecondaryFixed} />
                      </View>
                      <View>
                        <Text style={st.doseT}>ARV — {alarm.waktu}</Text>
                        <Text style={st.doseSub}>Nada: {alarm.nada_dering || 'Default'}</Text>
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
                  
                  {/* TAMPILAN TOMBOL BERDASARKAN GEMBOK WAKTU */}
                  {isPending && isTimePassed && (
                    <TouchableOpacity style={st.markTakenBtn} onPress={() => handleMarkAsTaken(alarm.id)} activeOpacity={0.8}>
                      <MaterialIcons name="check-circle" size={18} color="#fff" />
                      <Text style={st.markTakenTxt}>Tandai Sudah Diminum</Text>
                    </TouchableOpacity>
                  )}
                  {isPending && !isTimePassed && (
                    <View style={[st.markTakenBtn, { backgroundColor: '#e2e8f0' }]}>
                      <MaterialIcons name="lock-clock" size={18} color="#64748b" />
                      <Text style={[st.markTakenTxt, { color: '#64748b' }]}>Tunggu Jam {alarm.waktu}</Text>
                    </View>
                  )}

                </View>
              );
            })
          ) : (
            <View style={st.dose}>
              <View style={st.doseL}>
                <View style={[st.doseIc, { backgroundColor: C.outlineVariant }]}><MaterialIcons name="done-all" size={24} color={C.onSurfaceVariant} /></View>
                <View><Text style={st.doseT}>Belum ada jadwal</Text><Text style={st.doseSub}>Anda bisa mengaturnya di bawah</Text></View>
              </View>
            </View>
          )}

          <View style={st.card}>
            <View style={st.cardH}><MaterialIcons name="alarm-on" size={22} color={C.primary} /><Text style={st.cardHT}>Setel Waktu Alarm</Text></View>
            {Platform.OS === 'web' ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[st.pickerBtn, { flex: 1 }]}>
                  <MaterialIcons name="schedule" size={22} color={C.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerLbl}>Jam</Text>
                    {/* @ts-ignore */}
                    <input type="time" value={fmtTime} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); const d = new Date(selectedTime); d.setHours(h, m, 0, 0); setSelectedTime(d); }} style={{ border: 'none', background: 'transparent', fontSize: 18, fontWeight: 700, color: '#0043a2', outline: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }} />
                  </View>
                </View>
                <View style={[st.pickerBtn, { flex: 1 }]}>
                  <MaterialIcons name="event" size={22} color={C.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerLbl}>Mulai Tanggal</Text>
                    {/* @ts-ignore */}
                    <input type="date" value={fmtDate} onChange={(e) => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setSelectedDate(d); }} min={getLocalDateString()} style={{ border: 'none', background: 'transparent', fontSize: 18, fontWeight: 700, color: '#0043a2', outline: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }} />
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
                    <View><Text style={st.pickerLbl}>Mulai Tanggal</Text><Text style={st.pickerVal}>{fmtDate}</Text></View>
                  </TouchableOpacity>
                </View>
                {showTimePicker && <DateTimePicker value={selectedTime} mode="time" is24Hour display="default" onChange={(e, d) => { setShowTimePicker(false); if(d) setSelectedTime(d); }} />}
                {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setSelectedDate(d); }} minimumDate={new Date()} />}
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm, paddingHorizontal: S.xs, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="event-repeat" size={20} color={isEveryday ? C.primary : C.outline} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.onSurface }}>Ulangi Setiap Hari</Text>
              </View>
              <Switch 
                value={isEveryday} 
                onValueChange={setIsEveryday} 
                trackColor={{ false: C.outlineVariant, true: C.primaryFixedDim }} 
                thumbColor={isEveryday ? C.primary : C.surface} 
              />
            </View>
            <Text style={{ fontSize: 11, color: C.outline, paddingHorizontal: S.xs, marginTop: -4 }}>
              {isEveryday ? '*Sistem akan membuat jadwal otomatis hingga 30 hari ke depan.' : '*Alarm hanya akan berbunyi 1 kali pada tanggal tersebut.'}
            </Text>
          </View>

          <View style={st.card}>
            <View style={st.cardH}><MaterialIcons name="music-note" size={22} color={C.secondary} /><Text style={st.cardHT}>Pilih Nada Dering</Text></View>
            
            <View style={{ flexDirection: 'column', gap: 10, marginTop: 4 }}>
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
                  <MaterialIcons name={sound.icon as any} size={20} color={selectedSoundId === sound.id ? '#fff' : C.primary} />
                  <Text style={[st.soundChipTxt, selectedSoundId === sound.id && { color: '#fff' }]}>{sound.name}</Text>
                  {selectedSoundId === sound.id && isPlaying && (
                    <MaterialIcons name="volume-up" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: C.outline, marginTop: 4 }}>*Klik pada nada untuk mendengar pratinjau.</Text>
          </View>

          <TouchableOpacity style={st.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={savingSettings}>
            <MaterialIcons name="save" size={20} color="#fff" />
            <Text style={st.saveTxt}>{savingSettings ? 'Menyimpan...' : 'Simpan Alarm & Nada Dering'}</Text>
          </TouchableOpacity>
        </View>

        {/* Refill */}
        <View style={st.sec}>
          <Text style={st.secT}>Pengisian Ulang Obat</Text>
          {pendingRefill ? (
            <View style={[st.refBtn, { backgroundColor: C.outline }]}><MaterialIcons name="hourglass-top" size={20} color="#fff" /><Text style={st.refBtnT}>Menunggu Persetujuan Refill...</Text></View>
          ) : (
            <TouchableOpacity style={st.refBtn} onPress={handleRefill} activeOpacity={0.85} disabled={refillLoading}>
              <MaterialIcons name="local-pharmacy" size={20} color="#fff" /><Text style={st.refBtnT}>{refillLoading ? 'Memproses...' : 'Ajukan Refill Obat'}</Text>
            </TouchableOpacity>
          )}
          {refills.length > 0 && (
            <View style={{ gap: S.sm, marginTop: S.md }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.onSurface }}>Riwayat Refill</Text>
              {refills.slice(0, 5).map((r: any, i: number) => (
                <View style={st.logC} key={r.id || i}><MaterialIcons name="history" size={16} color={C.secondary} />
                  <Text style={st.logT}>Siklus ke-{r.siklus_ke} • {r.tanggal_refill} • <Text style={{ fontWeight: '700', color: r.status === 'approved' || r.status === 'selesai' ? '#16a34a' : r.status === 'pending' || r.status === 'menunggu' ? C.secondary : C.outline }}>{r.status}</Text></Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={st.privCard}><MaterialIcons name="enhanced-encryption" size={36} color={C.primary} style={{ opacity: 0.5 }} /><Text style={st.privTxt}>Data kesehatan Anda terenkripsi dan tetap sepenuhnya pribadi.</Text></View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  loadWrap: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  loadTxt: { marginTop: S.md, fontSize: 16, color: C.outline },
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: S.margin, paddingTop: S.lg },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: S.margin, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerT: { fontSize: 20, fontWeight: '800', color: '#1d4ed8', letterSpacing: 0.5 },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primaryContainer, padding: S.lg, borderRadius: 12, elevation: 6, marginBottom: S.lg, overflow: 'hidden' },
  heroT: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: '#fff', marginBottom: S.xs },
  heroS: { fontSize: 16, lineHeight: 24, color: C.primaryFixedDim, opacity: 0.9 },
  sec: { gap: S.md, marginBottom: S.lg },
  secH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  secT: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: C.onBackground },
  secD: { fontSize: 12, fontWeight: '500', color: C.outline },
  doseCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1, overflow: 'hidden' },
  dose: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: S.md },
  doseL: { flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1 },
  doseIc: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.secondaryFixed, alignItems: 'center', justifyContent: 'center' },
  doseT: { fontSize: 16, fontWeight: '600', color: C.onSurface },
  doseSub: { fontSize: 12, fontWeight: '500', color: C.outline, marginTop: 2 },
  doseBdg: { backgroundColor: C.secondaryFixed, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  doseBdgT: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.onSecondaryFixed, textTransform: 'uppercase' },
  doseBdgTaken: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  doseBdgTakenT: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#16a34a', textTransform: 'uppercase' },
  markTakenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#16a34a', paddingVertical: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  markTakenTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  refBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, elevation: 4 },
  refBtnT: { fontSize: 16, fontWeight: '700', color: '#fff' },
  logC: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: '#fff', padding: S.md, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  logT: { fontSize: 14, color: C.onSurface, flex: 1 },
  privCard: { backgroundColor: '#eff6ff', borderRadius: 16, padding: S.xl, borderWidth: 1, borderColor: '#dbeafe', alignItems: 'center', gap: S.md },
  privTxt: { fontSize: 14, color: C.primary, textAlign: 'center', maxWidth: 200 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: S.md, borderWidth: 1, borderColor: '#e2e8f0', gap: 12, elevation: 1 },
  cardH: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  cardHT: { fontSize: 16, fontWeight: '600', color: C.onSurface },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.primaryFixed, paddingVertical: 14, paddingHorizontal: S.md, borderRadius: 10 },
  pickerLbl: { fontSize: 11, fontWeight: '500', color: C.outline, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerVal: { fontSize: 18, fontWeight: '700', color: C.primary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, backgroundColor: C.primaryContainer, paddingVertical: 16, borderRadius: 12, elevation: 6 },
  saveTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  // Style untuk Tombol Pilihan Nada Bawaan
  soundChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceContainer, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: C.outlineVariant },
  soundChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  soundChipTxt: { fontSize: 15, fontWeight: '600', color: C.primary },
});

export default MedicationReminderScreen;