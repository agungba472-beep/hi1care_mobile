import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert, ActivityIndicator, FlatList, Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../src/api';
import { initEcho } from '../../src/echo';
import CustomHeader from '../../components/CustomHeader';

// ── Design Tokens ──
const C = {
  bg: '#f0f4ff',
  surface: '#ffffff',
  primary: '#012D1D',
  primaryLight: '#e8f0fe',
  primaryDark: '#002d6e',
  onPrimary: '#ffffff',
  accent: '#00A86B',
  accentLight: '#f3eefe',
  onSurface: '#0d1c2e',
  onSurfaceVariant: '#434652',
  outline: '#737784',
  outlineVariant: '#c3c6d5',
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#dc2626',
  errorLight: '#fee2e2',
  gradientStart: '#012D1D',
  gradientEnd: '#00A86B',
  cardShadow: '#012D1D',
} as const;

const { width: SCREEN_W } = Dimensions.get('window');

// ── Types ──
interface MyConsultation {
  id: number; nakes_nama: string; nakes_profesi: string; nakes_user_id?: number; tanggal: string;
  waktu: string; status: string; chat_status: string; last_message: string; kategori?: string;
}
interface NakesSchedule {
  id: number; nakes_id: number; hari: string; jam_mulai: string; jam_selesai: string;
  nakes: { id: number; nama: string; profesi: string; user?: { id: number; nama: string } };
}

// ── Helpers ──
const isConsultationActive = (c: MyConsultation): boolean => {
  if (c.status === 'selesai') return false;
  if (c.status === 'diterima' || c.chat_status === 'nakes') return true;
  try {
    const now = new Date();
    const [h, m] = c.waktu.split(':').map(Number);
    const consultDate = new Date(c.tanggal);
    consultDate.setHours(h, m, 0, 0);
    return now >= consultDate;
  } catch { return false; }
};

// ── Component ──
const ChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // Nakes schedules (for booking)
  const [nakesSchedules, setNakesSchedules] = useState<NakesSchedule[]>([]);
  const [selectedNakesId, setSelectedNakesId] = useState<number | null>(null);

  // Booking form
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // DateTimePicker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);

  // Chat Langsung
  const [isChatLangsung, setIsChatLangsung] = useState<number | null>(null);

  // Consultations
  const [myConsultations, setMyConsultations] = useState<MyConsultation[]>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(true);
  const [filterConsultation, setFilterConsultation] = useState<'semua'|'livechat'|'booking'>('semua');

  // Status Online
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  // ── WebSocket Presence ──
  React.useEffect(() => {
    let echoInstance: any = null;
    const setupWebSocket = async () => {
      try {
        echoInstance = await initEcho();
        echoInstance.join('presence-klinik')
          .here((users: any[]) => setOnlineUsers(users))
          .joining((user: any) => setOnlineUsers((prev) => [...prev, user]))
          .leaving((user: any) => setOnlineUsers((prev) => prev.filter((u) => u.id !== user.id)));
      } catch (err) { console.log('WebSocket presence error:', err); }
    };
    setupWebSocket();
    return () => {
      if (echoInstance) {
        echoInstance.leave('presence-klinik');
        echoInstance.disconnect(); // Tutup socket-nya juga, bukan cuma leave channel
      }
    };
  }, []);

  // ── Fetch on focus ──
  useFocusEffect(useCallback(() => {
    fetchNakesSchedules();
    fetchMyConsultations();
  }, []));

  const fetchNakesSchedules = async () => {
    try {
      const res = await api.get('/patient/nakes-schedules');
      setNakesSchedules(res.data.data || []);
    } catch (e: any) { console.log('[Konsultasi] fetch nakes err:', e.message); }
  };

  const fetchMyConsultations = async () => {
    setIsLoadingConsultations(true);
    try {
      const res = await api.get('/patient/my-consultations');
      setMyConsultations(res.data.data || []);
    } catch (e: any) { console.log('[Konsultasi] fetch consultations err:', e.message); }
    finally { setIsLoadingConsultations(false); }
  };

  const handleBooking = async () => {
    if (!selectedNakesId) { Alert.alert('Pilih Nakes', 'Silakan pilih tenaga kesehatan terlebih dahulu.'); return; }
    if (!bookDate.trim()) { Alert.alert('Tanggal Kosong', 'Silakan isi tanggal konsultasi (YYYY-MM-DD).'); return; }
    if (!bookTime.trim()) { Alert.alert('Waktu Kosong', 'Silakan isi waktu konsultasi (HH:MM).'); return; }

    setIsBooking(true);
    try {
      const res = await api.post('/patient/booking', {
        nakes_id: selectedNakesId,
        tanggal: bookDate.trim(),
        waktu: bookTime.trim(),
        kategori: 'booking',
      });
      const apiMsg = res.data?.message;
      if (apiMsg === 'Melanjutkan sesi chat yang sudah ada') {
        Alert.alert('Info', 'Anda sudah memiliki jadwal/konsultasi aktif dengan tenaga kesehatan ini. Nakes harus menyelesaikan sesi sebelumnya terlebih dahulu.');
      } else {
        Alert.alert('Booking Berhasil!', 'Konsultasi Anda berhasil dijadwalkan. Silakan cek riwayat di bawah.');
      }
      setBookDate(''); setBookTime(''); setKeluhan(''); setSelectedNakesId(null); setSelectedDateObj(null);
      fetchMyConsultations();
    } catch (e: any) {
      let errorMessage = 'Terjadi kesalahan, silakan coba lagi.';
      const rawMessage = e.response?.data?.message;
      if (rawMessage) {
        if (rawMessage.includes('tanggal field must be a valid date')) {
          errorMessage = 'Format tanggal tidak valid. Silakan pilih tanggal yang benar.';
        } else if (rawMessage.includes('waktu field is required')) {
          errorMessage = 'Waktu tidak boleh kosong.';
        } else {
          errorMessage = rawMessage;
        }
      }
      Alert.alert('Booking Gagal', errorMessage);
    } finally { setIsBooking(false); }
  };

  const handleEnterChat = (consultationId: number) => {
    navigation.navigate('PatientChatRoom', { konsultasiId: consultationId });
  };

  const handleChatLangsung = async (schedule: NakesSchedule) => {
    setIsChatLangsung(schedule.nakes_id);
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const waktu = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const res = await api.post('/patient/booking', {
        nakes_id: schedule.nakes_id,
        tanggal: today,
        waktu: waktu,
        kategori: 'livechat',
      });
      const newId = res.data.data?.id;
      if (newId) {
        navigation.navigate('PatientChatRoom', { konsultasiId: newId });
      } else {
        Alert.alert('Berhasil', 'Chat dibuat. Silakan buka dari Riwayat di bawah.');
        fetchMyConsultations();
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || 'Tidak bisa memulai chat langsung.');
    } finally { setIsChatLangsung(null); }
  };

  const selectedNakes = nakesSchedules.find(n => n.nakes_id === selectedNakesId);

  const filteredConsultations = myConsultations.filter(c => {
    if (filterConsultation === 'semua') return true;
    if (filterConsultation === 'livechat') return c.kategori === 'livechat';
    if (filterConsultation === 'booking') return c.kategori !== 'livechat';
    return true;
  });

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── HEADER ── */}
      <CustomHeader title="Konsultasi Chat" showBackButton={false} hideBell={false} />

      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══════════════════════════════════════════════════ */}
        {/* SEGMEN 1: CHATBOT AI BANNER                       */}
        {/* ═══════════════════════════════════════════════════ */}
        <View style={st.aiCard}>
          <View style={st.aiCardGradient}>
            <View style={st.aiIconCircle}>
              <MaterialIcons name="smart-toy" size={32} color={C.onPrimary} />
            </View>
            <View style={st.aiTextBlock}>
              <Text style={st.aiTitle}>Tanya WEAR Bot</Text>
              <Text style={st.aiSubtitle}>
                Dapatkan jawaban instan seputar ARV dan HIV 24/7.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={st.aiButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <MaterialIcons name="chat" size={18} color={C.primary} />
            <Text style={st.aiButtonText}>Mulai Chatbot</Text>
            <MaterialIcons name="arrow-forward" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════ */}
        {/* SEGMEN 2: BOOKING KONSULTASI LIVE                  */}
        {/* ═══════════════════════════════════════════════════ */}
        <View style={st.sectionHeader}>
          <MaterialIcons name="event-note" size={20} color={C.primary} />
          <Text style={st.sectionTitle}>Booking Konsultasi Live</Text>
        </View>

        <View style={st.bookingCard}>
          {/* Nakes Picker */}
          <Text style={st.fieldLabel}>Pilih Tenaga Kesehatan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.nakesScroll}>
            {nakesSchedules.length === 0 ? (
              <View style={st.emptyNakes}>
                <MaterialIcons name="person-off" size={20} color={C.outlineVariant} />
                <Text style={st.emptyNakesText}>Belum ada jadwal nakes</Text>
              </View>
            ) : (
              nakesSchedules.map(s => {
                const isSelected = selectedNakesId === s.nakes_id;
                const nakesName = s.nakes?.user?.nama || s.nakes?.nama || 'Nakes';
                const isOnline = s.nakes?.user?.id ? onlineUsers.some(u => u.id === s.nakes.user?.id) : false;

                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[st.nakesChip, isSelected && st.nakesChipActive]}
                    onPress={() => setSelectedNakesId(s.nakes_id)}
                    activeOpacity={0.7}
                  >
                    <View style={[st.nakesChipAvatar, isSelected && st.nakesChipAvatarActive]}>
                      <MaterialIcons name="person" size={16} color={isSelected ? C.onPrimary : C.primary} />
                      {/* TITIK STATUS ONLINE/OFFLINE DI AVATAR */}
                      <View style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: isOnline ? '#10b981' : '#9ca3af',
                        borderWidth: 1.5, borderColor: isSelected ? C.primary : '#f8fafc'
                      }} />
                    </View>
                    <View>
                      <Text style={[st.nakesChipName, isSelected && st.nakesChipNameActive]} numberOfLines={1}>
                        {nakesName}
                      </Text>
                      <Text style={[st.nakesChipInfo, isSelected && st.nakesChipInfoActive]}>
                        {s.nakes?.profesi || '-'} • {s.hari}
                      </Text>
                      <Text style={[st.nakesChipTime, isSelected && st.nakesChipTimeActive]}>
                        {s.jam_mulai} - {s.jam_selesai}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={st.checkMark}>
                        <MaterialIcons name="check-circle" size={18} color={C.onPrimary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Date & Time Fields */}
          <View style={st.fieldRow}>
            <View style={st.fieldHalf}>
              <Text style={st.fieldLabel}>Tanggal</Text>
              <TouchableOpacity style={st.inputWrap} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                <MaterialIcons name="calendar-today" size={18} color={C.outline} />
                <Text style={[st.input, { color: bookDate ? C.onSurface : '#a0aec0', paddingVertical: 14 }]}>
                  {bookDate || 'Pilih Tanggal'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={st.fieldHalf}>
              <Text style={st.fieldLabel}>Waktu</Text>
              <TouchableOpacity style={st.inputWrap} onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
                <MaterialIcons name="schedule" size={18} color={C.outline} />
                <Text style={[st.input, { color: bookTime ? C.onSurface : '#a0aec0', paddingVertical: 14 }]}>
                  {bookTime || 'Pilih Waktu'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDateObj || new Date()}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(e, d) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (d) {
                  setSelectedDateObj(d);
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  setBookDate(`${yyyy}-${mm}-${dd}`);
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedDateObj || new Date()}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={(e, d) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (d) {
                  const hh = String(d.getHours()).padStart(2, '0');
                  const min = String(d.getMinutes()).padStart(2, '0');
                  setBookTime(`${hh}:${min}`);
                }
              }}
            />
          )}

          {/* Keluhan */}
          <Text style={st.fieldLabel}>Keluhan Singkat (Opsional)</Text>
          <View style={[st.inputWrap, { minHeight: 72, alignItems: 'flex-start', paddingTop: 12 }]}>
            <MaterialIcons name="edit-note" size={18} color={C.outline} style={{ marginTop: 2 }} />
            <TextInput
              style={[st.input, { minHeight: 56, textAlignVertical: 'top' }]}
              placeholder="Tuliskan keluhan Anda..."
              placeholderTextColor="#a0aec0"
              value={keluhan}
              onChangeText={setKeluhan}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[st.bookingBtn, isBooking && { opacity: 0.6 }]}
            onPress={handleBooking}
            activeOpacity={0.85}
            disabled={isBooking}
          >
            {isBooking ? (
              <ActivityIndicator color={C.onPrimary} size="small" />
            ) : (
              <>
                <MaterialIcons name="event-available" size={20} color={C.onPrimary} />
                <Text style={st.bookingBtnText}>Buat Janji Konsultasi</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════ */}
        {/* SEGMEN 2.5: CHAT LANGSUNG (tanpa booking)          */}
        {/* ═══════════════════════════════════════════════════ */}
        <View style={st.sectionHeader}>
          <MaterialIcons name="flash-on" size={20} color={C.warning} />
          <Text style={st.sectionTitle}>Chat Langsung</Text>
        </View>

        <View style={st.directChatCard}>
          <Text style={st.directChatDesc}>
            Mulai chat sekarang tanpa perlu booking jadwal. Cocok untuk pertanyaan mendesak.
          </Text>
          {nakesSchedules.length === 0 ? (
            <View style={st.emptyDirectChat}>
              <MaterialIcons name="person-search" size={28} color={C.outlineVariant} />
              <Text style={st.emptyDirectChatText}>Belum ada nakes tersedia</Text>
            </View>
          ) : (
            nakesSchedules
              .filter((s, i, arr) => arr.findIndex(x => x.nakes_id === s.nakes_id) === i)
              .map(s => {
                const nakesName = s.nakes?.user?.nama || s.nakes?.nama || 'Nakes';
                const isLoading = isChatLangsung === s.nakes_id;
                const isOnline = s.nakes?.user?.id ? onlineUsers.some(u => u.id === s.nakes.user?.id) : false;

                return (
                  <View key={`direct-${s.nakes_id}`} style={st.directNakesRow}>
                    <View style={st.directNakesAvatar}>
                      <MaterialIcons name="person" size={18} color={C.primary} />
                      {/* TITIK STATUS ONLINE/OFFLINE DI AVATAR */}
                      <View style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: isOnline ? '#10b981' : '#9ca3af',
                        borderWidth: 1.5, borderColor: '#fff'
                      }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[st.directNakesName, { flexShrink: 1 }]} numberOfLines={1}>{nakesName}</Text>
                        <Text style={{ fontSize: 10, color: isOnline ? '#10b981' : '#9ca3af', fontWeight: '600', flexShrink: 0 }}>
                          {isOnline ? 'Online' : 'Offline'}
                        </Text>
                      </View>
                      <Text style={st.directNakesProfesi}>{s.nakes?.profesi || '-'}</Text>
                    </View>
                    <TouchableOpacity
                      style={[st.directChatBtn, isLoading && { opacity: 0.6 }]}
                      onPress={() => handleChatLangsung(s)}
                      activeOpacity={0.8}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={C.onPrimary} />
                      ) : (
                        <>
                          <MaterialIcons name="chat" size={14} color={C.onPrimary} />
                          <Text style={st.directChatBtnText}>Chat Sekarang</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
          )}
        </View>

        {/* ═══════════════════════════════════════════════════ */}
        {/* SEGMEN 3: RIWAYAT & JADWAL KONSULTASI              */}
        {/* ═══════════════════════════════════════════════════ */}
        <View style={st.sectionHeader}>
          <MaterialIcons name="history" size={20} color={C.primary} />
          <Text style={st.sectionTitle}>Riwayat & Jadwal Konsultasi</Text>
        </View>

        <View style={st.filterRow}>
          <TouchableOpacity onPress={() => setFilterConsultation('semua')} style={[st.filterChip, filterConsultation === 'semua' && st.filterChipActive]}>
            <Text style={[st.filterChipText, filterConsultation === 'semua' && st.filterChipTextActive]}>Semua</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterConsultation('livechat')} style={[st.filterChip, filterConsultation === 'livechat' && st.filterChipActive]}>
            <Text style={[st.filterChipText, filterConsultation === 'livechat' && st.filterChipTextActive]}>Chat Langsung</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterConsultation('booking')} style={[st.filterChip, filterConsultation === 'booking' && st.filterChipActive]}>
            <Text style={[st.filterChipText, filterConsultation === 'booking' && st.filterChipTextActive]}>Konsultasi</Text>
          </TouchableOpacity>
        </View>

        {isLoadingConsultations ? (
          <View style={st.loadingWrap}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={st.loadingText}>Memuat jadwal...</Text>
          </View>
        ) : filteredConsultations.length === 0 ? (
          <View style={st.emptyCard}>
            <View style={st.emptyIconCircle}>
              <MaterialIcons name="event-busy" size={36} color={C.outlineVariant} />
            </View>
            <Text style={st.emptyTitle}>Belum Ada Konsultasi</Text>
            <Text style={st.emptySub}>Tidak ada riwayat chat atau konsultasi yang cocok.</Text>
          </View>
        ) : (
          filteredConsultations.map(c => {
            const active = isConsultationActive(c);
            const isOnline = c.nakes_user_id ? onlineUsers.some(u => u.id === c.nakes_user_id) : false;

            return (
              <View key={c.id} style={[st.consultCard, active && st.consultCardActive]}>
                {active && <View style={st.activeStripe} />}
                <View style={st.consultHeader}>
                  <View style={[st.consultAvatar, active && st.consultAvatarActive]}>
                    <MaterialIcons name="medical-services" size={20} color={active ? C.onPrimary : C.primary} />
                    {/* TITIK STATUS ONLINE/OFFLINE DI AVATAR */}
                    <View style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 10, height: 10, borderRadius: 5,
                      backgroundColor: isOnline ? '#10b981' : '#9ca3af',
                      borderWidth: 1.5, borderColor: active ? C.primary : C.primaryLight
                    }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[st.consultName, { flexShrink: 1 }]} numberOfLines={1}>{c.nakes_nama}</Text>
                      {c.kategori === 'livechat' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 }}>
                          <MaterialIcons name="flash-on" size={10} color="#b45309" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#b45309' }}>Live</Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 10, color: isOnline ? '#10b981' : '#9ca3af', fontWeight: '600', flexShrink: 0 }}>
                        {isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                    <Text style={st.consultProfesi}>{c.nakes_profesi}</Text>
                  </View>
                  <View style={[st.statusBadge, active ? st.statusActive : c.status === 'pending' ? st.statusPending : st.statusDefault]}>
                    <Text style={[st.statusText, active && { color: C.onPrimary }]}>
                      {active ? 'Sesi Terbuka' : c.status === 'pending' ? 'Menunggu' : c.status}
                    </Text>
                  </View>
                </View>

                <View style={st.consultMeta}>
                  <View style={st.metaItem}>
                    <MaterialIcons name="calendar-today" size={14} color={active ? C.primary : C.outline} />
                    <Text style={[st.metaText, active && { color: C.onSurface }]}>{c.tanggal}</Text>
                  </View>
                  <View style={st.metaItem}>
                    <MaterialIcons name="schedule" size={14} color={active ? C.primary : C.outline} />
                    <Text style={[st.metaText, active && { color: C.onSurface }]}>{c.waktu}</Text>
                  </View>
                </View>

                <View style={st.lastMsgWrap}>
                  <MaterialIcons name="chat-bubble-outline" size={12} color={C.outline} />
                  <Text style={st.lastMsg} numberOfLines={1}>
                    {c.last_message && c.last_message !== 'Belum ada pesan' ? c.last_message : 'Sesi baru dikonfirmasi, silakan sapa pasien.'}
                  </Text>
                </View>

                {(active || c.status === 'selesai') && (
                  <TouchableOpacity
                    style={[st.enterChatBtn, c.status === 'selesai' && { backgroundColor: C.outlineVariant, shadowColor: C.outlineVariant }]}
                    onPress={() => handleEnterChat(c.id)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name={c.status === 'selesai' ? "history" : "login"} size={18} color={c.status === 'selesai' ? C.onSurface : C.onPrimary} />
                    <Text style={[st.enterChatText, c.status === 'selesai' && { color: C.onSurface }]}>
                      {c.status === 'selesai' ? 'Lihat Riwayat Chat' : 'Masuk Ruang Chat'}
                    </Text>
                    <MaterialIcons name="arrow-forward" size={16} color={c.status === 'selesai' ? C.onSurface : C.onPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const RADIUS = 20;
const SHADOW = {
  shadowColor: C.cardShadow,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 5,
};

const st = StyleSheet.create({
  // ── Layout ──
  safe: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },

  // ── Header ──
  header: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.onSurface, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: C.outline, marginTop: 1 },

  // ── Segment 1: AI Banner ──
  aiCard: {
    backgroundColor: C.primary,
    borderRadius: RADIUS,
    marginTop: 20,
    overflow: 'hidden',
    ...SHADOW,
    shadowColor: '#012D1D',
    shadowOpacity: 0.25,
  },
  aiCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 16,
  },
  aiIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  aiTextBlock: { flex: 1 },
  aiTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  aiSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 19 },
  aiButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 16,
    paddingVertical: 13, borderRadius: 14,
  },
  aiButtonText: { fontSize: 15, fontWeight: '700', color: C.primary },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 28, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.onSurface },

  // ── Segment 2: Booking Card ──
  bookingCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS,
    padding: 20,
    ...SHADOW,
  },
  nakesScroll: { marginBottom: 16 },
  emptyNakes: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 20,
  },
  emptyNakesText: { fontSize: 13, color: C.outline },
  nakesChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 14, padding: 12, marginRight: 10,
    borderWidth: 1.5, borderColor: '#e8edf5',
    minWidth: 180,
  },
  nakesChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  nakesChipAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nakesChipAvatarActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  nakesChipName: { fontSize: 13, fontWeight: '700', color: C.onSurface, maxWidth: 110 },
  nakesChipNameActive: { color: '#fff' },
  nakesChipInfo: { fontSize: 11, color: C.outline, marginTop: 1 },
  nakesChipInfoActive: { color: 'rgba(255,255,255,0.75)' },
  nakesChipTime: { fontSize: 10, color: C.outlineVariant, marginTop: 1 },
  nakesChipTimeActive: { color: 'rgba(255,255,255,0.6)' },
  checkMark: { position: 'absolute', top: 8, right: 8 },

  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.onSurfaceVariant, marginBottom: 6, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 0,
    borderWidth: 1, borderColor: '#e8edf5',
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 14, color: C.onSurface, paddingVertical: 12 },
  bookingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.primary,
    borderRadius: 14, paddingVertical: 15, marginTop: 6,
    ...SHADOW, shadowOpacity: 0.2,
  },
  bookingBtnText: { fontSize: 15, fontWeight: '700', color: C.onPrimary },

  // ── Segment 3: Consultations ──
  loadingWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 13, color: C.outline },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS,
    padding: 32,
    alignItems: 'center',
    ...SHADOW,
  },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#f0f4ff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.onSurface },
  emptySub: { fontSize: 13, color: C.outline, textAlign: 'center', marginTop: 6, lineHeight: 19, maxWidth: 260 },

  filterRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#e8edf5', borderWidth: 1, borderColor: '#d3dbe8',
  },
  filterChipActive: {
    backgroundColor: C.primary, borderColor: C.primary,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.outline },
  filterChipTextActive: { color: C.onPrimary },

  consultCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS,
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOW,
  },
  consultCardActive: {
    borderWidth: 1.5,
    borderColor: C.primary,
    shadowOpacity: 0.18,
  },
  activeStripe: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
    backgroundColor: C.primary,
    borderTopLeftRadius: RADIUS,
    borderBottomLeftRadius: RADIUS,
  },
  consultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consultAvatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  consultAvatarActive: { backgroundColor: C.primary },
  consultName: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  consultProfesi: { fontSize: 12, color: C.outline, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: '700', color: C.outline },
  statusActive: { backgroundColor: C.primary },
  statusPending: { backgroundColor: C.warningLight },
  statusDefault: { backgroundColor: '#f0f4ff' },

  consultMeta: { flexDirection: 'row', gap: 20, marginTop: 12, paddingLeft: 56 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: C.outline },

  lastMsgWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingLeft: 56,
  },
  lastMsg: { fontSize: 12, color: C.onSurfaceVariant, fontStyle: 'italic', flex: 1 },

  enterChatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.success,
    borderRadius: 12, paddingVertical: 13, marginTop: 14,
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  enterChatText: { fontSize: 14, fontWeight: '700', color: C.onPrimary },

  // ── Chat Langsung ──
  directChatCard: {
    backgroundColor: C.surface,
    borderRadius: RADIUS,
    padding: 20,
    ...SHADOW,
  },
  directChatDesc: {
    fontSize: 13, color: C.outline, lineHeight: 19, marginBottom: 14,
  },
  emptyDirectChat: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 16, justifyContent: 'center',
  },
  emptyDirectChatText: { fontSize: 13, color: C.outlineVariant },
  directNakesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f4ff',
  },
  directNakesAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  directNakesName: { fontSize: 14, fontWeight: '700', color: C.onSurface },
  directNakesProfesi: { fontSize: 11, color: C.outline, marginTop: 1 },
  directChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.success,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  directChatBtnText: { fontSize: 12, fontWeight: '700', color: C.onPrimary },
});

export default ChatScreen;
