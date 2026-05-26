import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, StatusBar, ActivityIndicator, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import api from '../src/api';

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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSoundName, setSelectedSoundName] = useState('Belum dipilih');
  const [selectedSoundUri, setSelectedSoundUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const fmtTime = useMemo(() => {
    const h = selectedTime.getHours().toString().padStart(2, '0');
    const m = selectedTime.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }, [selectedTime]);

  const fmtDate = useMemo(() => {
    const y = selectedDate.getFullYear();
    const mo = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const d = selectedDate.getDate().toString().padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }, [selectedDate]);

  // ── Load saved settings from AsyncStorage ──
  useFocusEffect(useCallback(() => {
    const loadSavedSettings = async () => {
      try {
        const [savedTime, savedDate, savedSoundName, savedSoundUri] = await Promise.all([
          AsyncStorage.getItem('saved_alarm_time'),
          AsyncStorage.getItem('saved_alarm_date'),
          AsyncStorage.getItem('saved_sound_name'),
          AsyncStorage.getItem('saved_sound_uri'),
        ]);
        if (savedTime) {
          const parsed = new Date(savedTime);
          if (!isNaN(parsed.getTime())) setSelectedTime(parsed);
        }
        if (savedDate) {
          const parsed = new Date(savedDate);
          if (!isNaN(parsed.getTime())) setSelectedDate(parsed);
        }
        if (savedSoundName) setSelectedSoundName(savedSoundName);
        if (savedSoundUri) setSelectedSoundUri(savedSoundUri);
      } catch (e) {
        console.log('[MedReminder] Gagal memuat pengaturan tersimpan:', e);
      }
    };
    loadSavedSettings();
  }, []));

  // ── Fetch Data ──
  // Parameter silent mencegah UI berkedip (hilang) saat memperbarui data dari aksi pengguna
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
    } catch (e: any) { 
      console.log('[MedReminder]', e.response?.data || e.message); 
    } finally { 
      if (!silent) setLoading(false); 
    }
  }, []);
  
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // ── Refill (Web Safe) ──
  const handleRefill = async () => {
    setRefillLoading(true);
    try { 
      await api.post('/patient/refill/request'); 
      if (Platform.OS === 'web') {
        setTimeout(() => window.alert('Berhasil ✅ Permintaan refill berhasil diajukan.'), 50);
      } else {
        Alert.alert('Berhasil ✅', 'Permintaan refill berhasil diajukan.'); 
      }
      fetchData(true); // Update diam-diam
    } catch (e: any) { 
      if (Platform.OS === 'web') {
        setTimeout(() => window.alert('Gagal: ' + (e.response?.data?.message || 'Tidak dapat mengajukan refill.')), 50);
      } else {
        Alert.alert('Gagal', e.response?.data?.message || 'Tidak dapat mengajukan refill.'); 
      }
    } finally { setRefillLoading(false); }
  };

  // ── Mark alarm as taken (Web Safe) ──
  const handleMarkAsTaken = async (alarmId: number) => {
    if (Platform.OS === 'web') {
      // Menggunakan setTimeout untuk mencegah pemblokiran thread UI oleh alert browser bawaan
      setTimeout(async () => {
        const confirm = window.confirm('Apakah Anda yakin sudah meminum obat ini?');
        if (confirm) {
          try {
            await api.post(`/patient/alarms/${alarmId}/taken`);
            setTimeout(() => window.alert('Berhasil ✅ Obat berhasil ditandai sebagai diminum.'), 10);
            fetchData(true); // Update diam-diam
          } catch (e: any) {
            setTimeout(() => window.alert('Gagal: ' + (e.response?.data?.message || 'Tidak dapat memperbarui status alarm.')), 10);
          }
        }
      }, 50);
    } else {
      Alert.alert(
        'Konfirmasi Minum Obat',
        'Apakah Anda yakin sudah meminum obat ini?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya, Sudah Diminum',
            onPress: async () => {
              try {
                await api.post(`/patient/alarms/${alarmId}/taken`);
                Alert.alert('Berhasil ✅', 'Obat berhasil ditandai sebagai diminum.');
                fetchData(true); // Update diam-diam
              } catch (e: any) {
                Alert.alert('Gagal', e.response?.data?.message || 'Tidak dapat memperbarui status alarm.');
              }
            },
          },
        ]
      );
    }
  };

  // ── Audio (Web Safe) ──
  const pickAudio = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        const name = a.name || 'Custom Audio';
        const uri = a.uri;
        setSelectedSoundName(name);
        setSelectedSoundUri(uri);
        await stopSound();
        await AsyncStorage.setItem('saved_sound_name', name);
        await AsyncStorage.setItem('saved_sound_uri', uri);
      }
    } catch { 
      if (Platform.OS === 'web') setTimeout(() => window.alert('Gagal memilih file audio.'), 50);
      else Alert.alert('Error', 'Gagal memilih file audio.'); 
    }
  };

  const playSound = async () => {
    if (!selectedSoundUri) { 
      if (Platform.OS === 'web') setTimeout(() => window.alert('Pilih file audio terlebih dahulu.'), 50);
      else Alert.alert('Info', 'Pilih file audio terlebih dahulu.'); 
      return; 
    }
    try {
      await stopSound();
      const { sound } = await Audio.Sound.createAsync({ uri: selectedSoundUri }, { shouldPlay: true });
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((s) => { if ('didJustFinish' in s && s.didJustFinish) { setIsPlaying(false); sound.unloadAsync(); soundRef.current = null; } });
    } catch { 
      if (Platform.OS === 'web') setTimeout(() => window.alert('Tidak dapat memutar audio.'), 50);
      else Alert.alert('Error', 'Tidak dapat memutar audio.'); 
    }
  };

  const stopSound = async () => {
    if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; }
    setIsPlaying(false);
  };

  // ── Save (Web Safe & Date Format Fixed) ──
  const handleSave = async () => {
    setSavingSettings(true);
    try {
      // 1. Simpan ke AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('saved_alarm_time', selectedTime.toISOString()),
        AsyncStorage.setItem('saved_alarm_date', selectedDate.toISOString()),
        AsyncStorage.setItem('saved_sound_name', selectedSoundName),
        AsyncStorage.setItem('saved_sound_uri', selectedSoundUri || ''),
      ]);

      // 2. Format jam & tanggal dengan manual dan pasti benar untuk API Laravel (H:i dan Y-m-d)
      const jamFormat = selectedTime.getHours().toString().padStart(2, '0') + ':' + selectedTime.getMinutes().toString().padStart(2, '0');
      const tglFormat = selectedDate.getFullYear() + '-' + (selectedDate.getMonth() + 1).toString().padStart(2, '0') + '-' + selectedDate.getDate().toString().padStart(2, '0');

      // 3. Kirim ke API Laravel
      await api.post('/patient/alarms/settings', { 
        waktu: jamFormat, 
        tanggal: tglFormat, 
        nada_dering: selectedSoundName 
      });

      // 4. Daftarkan Notifikasi (HANYA AKTIF JIKA DIBUKA DI HP)
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await Notifications.cancelAllScheduledNotificationsAsync();
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Waktunya Minum ARV! 💊',
              body: `Halo, ini pengingat jadwal minum obat Anda (${jamFormat}). Tetap semangat dan jaga kesehatan!`,
              sound: true,
            },
            trigger: {
              hour: selectedTime.getHours(),
              minute: selectedTime.getMinutes(),
              repeats: true,
            } as any,
          });
        }
      }

      // 5. Alert Sukses
      const successMessage = `Alarm ${jamFormat} berhasil disimpan.\n\n${Platform.OS === 'web' ? '(Peringatan: Notifikasi pop-up otomatis hanya muncul jika dibuka lewat Aplikasi HP)' : 'Alarm akan menggunakan suara standar notifikasi HP Anda.'}`;
      
      if (Platform.OS === 'web') {
        setTimeout(() => window.alert(successMessage), 50);
      } else {
        Alert.alert('Alarm Berhasil Diatur ✅', successMessage);
      }
      
      fetchData(true); // Update diam-diam
    } catch (e: any) {
      console.log('[MedReminder] Save error:', e.response?.data || e.message);
      const errorMsg = e.response?.data?.message || 'Gagal menyimpan pengaturan ke server.';
      if (Platform.OS === 'web') setTimeout(() => window.alert('Gagal: ' + errorMsg), 50);
      else Alert.alert('Gagal', errorMsg);
    }
    finally { setSavingSettings(false); }
  };

  // ── Pickers ──
  const onTimeChange = (event: any, d?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'set' && d) setSelectedTime(d);
  };
  const onDateChange = (event: any, d?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && d) setSelectedDate(d);
  };

  const onWebTimeChange = (e: any) => {
    const val = e.target.value; 
    if (val) {
      const [h, m] = val.split(':').map(Number);
      const d = new Date(selectedTime);
      d.setHours(h, m, 0, 0);
      setSelectedTime(d);
    }
  };
  const onWebDateChange = (e: any) => {
    const val = e.target.value;
    if (val) {
      const d = new Date(val + 'T00:00:00');
      if (!isNaN(d.getTime())) setSelectedDate(d);
    }
  };

  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const todayAlarms = alarms.filter((a: any) => !a.tanggal || a.tanggal === new Date().toISOString().split('T')[0]);
  const pendingRefill = refills.find((r: any) => r.status === 'pending' || r.status === 'menunggu'); 

  if (loading) return (
    <SafeAreaView style={st.loadWrap}><StatusBar barStyle="dark-content" /><ActivityIndicator size="large" color={C.primary} /><Text style={st.loadTxt}>Memuat pengingat...</Text></SafeAreaView>
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <View style={st.header}><Text style={st.headerT}>Pengingat Obat</Text></View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Hero */}
        <View style={st.hero}>
          <View style={{ flex: 1 }}>
            <Text style={st.heroT}>Tingkat Kepatuhan</Text>
            <Text style={st.heroS}>{compliancePercent >= 80 ? 'Luar biasa! Pertahankan rutinitas Anda.' : 'Ayo tingkatkan konsistensi Anda!'}</Text>
          </View>
          <CircleProgress percent={compliancePercent} size={72} />
        </View>

        <View style={st.sec}>
          <View style={st.secH}><Text style={st.secT}>Jadwal Hari Ini</Text><Text style={st.secD}>{todayStr}</Text></View>
          {todayAlarms.length > 0 ? (
            todayAlarms.map((alarm: any, idx: number) => {
              const isTaken = alarm.status === 'sudah';
              const isPending = !alarm.status || alarm.status === 'belum';
              return (
                <View style={st.doseCard} key={alarm.id || idx}>
                  <View style={st.dose}>
                    <View style={st.doseL}>
                      <View style={[st.doseIc, isTaken && { backgroundColor: '#dcfce7' }]}>
                        <MaterialIcons name={isTaken ? 'check-circle' : 'schedule'} size={24} color={isTaken ? '#16a34a' : C.onSecondaryFixed} />
                      </View>
                      <View><Text style={st.doseT}>ARV — {alarm.waktu}</Text><Text style={st.doseSub}>1 Dosis (Oral)</Text></View>
                    </View>
                    {isTaken ? (
                      <View style={st.doseBdgTaken}><Text style={st.doseBdgTakenT}>SUDAH DIMINUM</Text></View>
                    ) : (
                      <View style={st.doseBdg}><Text style={st.doseBdgT}>{alarm.status || 'TERJADWAL'}</Text></View>
                    )}
                  </View>
                  {isPending && (
                    <TouchableOpacity style={st.markTakenBtn} onPress={() => handleMarkAsTaken(alarm.id)} activeOpacity={0.8}>
                      <MaterialIcons name="check-circle" size={18} color="#fff" />
                      <Text style={st.markTakenTxt}>Tandai Sudah Diminum</Text>
                    </TouchableOpacity>
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

          {/* Setting Alarm */}
          <View style={st.card}>
            <View style={st.cardH}><MaterialIcons name="alarm-on" size={22} color={C.primary} /><Text style={st.cardHT}>Setel Waktu Alarm</Text></View>
            {Platform.OS === 'web' ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[st.pickerBtn, { flex: 1 }]}>
                  <MaterialIcons name="schedule" size={22} color={C.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerLbl}>Jam</Text>
                    {/* @ts-ignore */}
                    <input type="time" value={fmtTime} onChange={onWebTimeChange} style={{ border: 'none', background: 'transparent', fontSize: 18, fontWeight: '700', color: '#0043a2', outline: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }} />
                  </View>
                </View>
                <View style={[st.pickerBtn, { flex: 1 }]}>
                  <MaterialIcons name="event" size={22} color={C.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.pickerLbl}>Tanggal</Text>
                    {/* @ts-ignore */}
                    <input type="date" value={fmtDate} onChange={onWebDateChange} min={new Date().toISOString().split('T')[0]} style={{ border: 'none', background: 'transparent', fontSize: 18, fontWeight: '700', color: '#0043a2', outline: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }} />
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
                {showTimePicker && <DateTimePicker value={selectedTime} mode="time" is24Hour display="default" onChange={onTimeChange} />}
                {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />}
              </>
            )}
          </View>

          {/* Custom Ringtone */}
          <View style={st.card}>
            <View style={st.cardH}><MaterialIcons name="music-note" size={22} color={C.secondary} /><Text style={st.cardHT}>Nada Dering</Text></View>
            <View style={st.audioInfo}>
              <MaterialIcons name={selectedSoundUri ? 'audiotrack' : 'music-off'} size={20} color={selectedSoundUri ? C.primary : C.outline} />
              <Text style={[st.audioName, selectedSoundUri && { color: C.primary, fontWeight: '700' }]} numberOfLines={1}>{selectedSoundName}</Text>
            </View>
            <TouchableOpacity style={st.audioPickBtn} onPress={pickAudio} activeOpacity={0.8}>
              <MaterialIcons name="folder-open" size={20} color={C.onPrimary} />
              <Text style={st.audioPickTxt}>Pilih Audio dari Perangkat</Text>
            </TouchableOpacity>
            {selectedSoundUri && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[st.previewBtn, { flex: 1, backgroundColor: isPlaying ? C.outline : C.secondaryContainer }]} onPress={isPlaying ? stopSound : playSound} activeOpacity={0.8}>
                  <MaterialIcons name={isPlaying ? 'stop' : 'play-arrow'} size={22} color={isPlaying ? '#fff' : C.onSecondaryFixed} />
                  <Text style={[st.previewTxt, isPlaying && { color: '#fff' }]}>{isPlaying ? 'Stop' : 'Preview Nada'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={[st.audioInfo, { backgroundColor: '#eff6ff' }]}>
              <MaterialIcons name="info-outline" size={16} color={C.primary} />
              <Text style={[st.audioName, { fontSize: 12 }]}>Saat app ditutup, alarm menggunakan suara standar HP.</Text>
            </View>
          </View>

          {/* Save */}
          <View>
            <TouchableOpacity style={st.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={savingSettings}>
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={st.saveTxt}>{savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan Alarm'}</Text>
            </TouchableOpacity>
          </View>
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

        {/* Privacy */}
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
  dose: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: S.md },
  doseL: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  doseIc: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.secondaryFixed, alignItems: 'center', justifyContent: 'center' },
  doseT: { fontSize: 16, fontWeight: '600', color: C.onSurface },
  doseSub: { fontSize: 12, fontWeight: '500', color: C.outline },
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
  audioInfo: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surfaceContainerLow, padding: 12, borderRadius: 10 },
  audioName: { fontSize: 13, color: C.onSurfaceVariant, flex: 1, lineHeight: 20 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, backgroundColor: C.primaryContainer, paddingVertical: 16, borderRadius: 12, elevation: 6 },
  saveTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  audioPickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, backgroundColor: C.primary, paddingVertical: 12, borderRadius: 10 },
  audioPickTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, paddingVertical: 12, borderRadius: 10 },
  previewTxt: { fontSize: 14, fontWeight: '600', color: C.onSecondaryFixed },
});

export default MedicationReminderScreen;