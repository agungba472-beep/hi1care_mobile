import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';

// ── Design Tokens ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff',
  onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff',
  secondary: '#6b4ab2', background: '#f8f9ff',
  error: '#ba1a1a', botBg: '#f1f5f9', botText: '#475569',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

// ── Types ──
interface ChatMessage {
  id: number | string; pesan: string; sender: 'pasien' | 'nakes' | 'bot';
  waktu: string; nakes_nama?: string | null;
}
interface NakesSchedule {
  id: number; nakes_id: number; hari: string; jam_mulai: string; jam_selesai: string;
  nakes: { id: number; nama: string; profesi: string; user?: { nama: string } };
}
interface MyConsultation {
  id: number; nakes_nama: string; nakes_profesi: string; tanggal: string;
  waktu: string; status: string; chat_status: string; last_message: string;
}

type ScreenPhase = 'select_nakes' | 'chat';

// ── Component ──
const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);

  // Phase state
  const [phase, setPhase] = useState<ScreenPhase>('select_nakes');

  // Phase 1: Select Nakes
  const [nakesSchedules, setNakesSchedules] = useState<NakesSchedule[]>([]);
  const [myConsultations, setMyConsultations] = useState<MyConsultation[]>([]);
  const [isLoadingNakes, setIsLoadingNakes] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Phase 2: Chat
  const [konsultasiId, setKonsultasiId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatInfo, setChatInfo] = useState<{ nakes_nama: string; nakes_profesi: string; chat_status: string }>({
    nakes_nama: '', nakes_profesi: '', chat_status: 'bot',
  });

  // ── Fetch data on focus ──
  useFocusEffect(useCallback(() => {
    if (phase === 'select_nakes') { fetchNakesSchedules(); fetchMyConsultations(); }
  }, [phase]));

  // ── Polling for messages ──
  useEffect(() => {
    if (phase !== 'chat' || !konsultasiId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [phase, konsultasiId]);

  // ═══ API CALLS ═══

  const fetchNakesSchedules = async () => {
    setIsLoadingNakes(true);
    try {
      const res = await api.get('/patient/nakes-schedules');
      setNakesSchedules(res.data.data || []);
    } catch (e: any) { console.log('[Chat] fetch nakes error:', e.message); }
    finally { setIsLoadingNakes(false); }
  };

  const fetchMyConsultations = async () => {
    try {
      const res = await api.get('/patient/my-consultations');
      setMyConsultations(res.data.data || []);
    } catch (e: any) { console.log('[Chat] fetch consultations error:', e.message); }
  };

  const handleBooking = async (schedule: NakesSchedule) => {
    setIsBooking(true);
    try {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const res = await api.post('/patient/booking', {
        nakes_id: schedule.nakes_id,
        tanggal: tomorrow.toISOString().split('T')[0],
        waktu: schedule.jam_mulai,
      });
      const newId = res.data.data?.id;
      Alert.alert('Booking Berhasil! 🎉', `Konsultasi berhasil dijadwalkan.`);
      setShowBookingModal(false);
      if (newId) { enterChat(newId); }
      else { fetchMyConsultations(); }
    } catch (e: any) {
      Alert.alert('Booking Gagal', e.response?.data?.message || 'Silakan coba lagi.');
    } finally { setIsBooking(false); }
  };

  const enterChat = (id: number) => {
    setKonsultasiId(id);
    setPhase('chat');
  };

  const fetchMessages = async () => {
    if (!konsultasiId) return;
    try {
      const res = await api.get(`/chat/${konsultasiId}/messages`);
      const data = res.data.data;
      setMessages(data.messages || []);
      if (data.konsultasi) {
        setChatInfo({
          nakes_nama: data.konsultasi.nakes_nama,
          nakes_profesi: data.konsultasi.nakes_profesi,
          chat_status: data.konsultasi.chat_status,
        });
      }
    } catch (e: any) { console.log('[Chat] fetch messages error:', e.message); }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !konsultasiId || isSending) return;
    setIsSending(true);
    const optimistic: ChatMessage = { id: `temp-${Date.now()}`, pesan: trimmed, sender: 'pasien', waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, optimistic]);
    setInputText('');
    try {
      await api.post('/chat/send', { konsultasi_id: konsultasiId, pesan: trimmed });
      await fetchMessages();
    } catch (e: any) { Alert.alert('Gagal', 'Pesan gagal dikirim.'); }
    finally { setIsSending(false); }
  };

  const goBack = () => { setPhase('select_nakes'); setKonsultasiId(null); setMessages([]); };

  // ═══ RENDER ═══

  if (phase === 'chat') return renderChatPhase();
  return renderSelectPhase();

  // ── Phase 1: Select Nakes ──
  function renderSelectPhase() {
    return (
      <SafeAreaView style={st.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={st.header}>
          <Text style={st.headerTitle}>💬 Chat & Konsultasi</Text>
        </View>
        <ScrollView contentContainerStyle={st.selectScroll} showsVerticalScrollIndicator={false}>
          {/* Booking CTA */}
          <TouchableOpacity style={st.bookingCta} onPress={() => setShowBookingModal(true)} activeOpacity={0.85}>
            <View style={st.bookingCtaIcon}><MaterialIcons name="add-circle" size={28} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={st.bookingCtaTitle}>Booking Konsultasi Baru</Text>
              <Text style={st.bookingCtaSub}>Pilih jadwal nakes & mulai chat</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={C.primary} />
          </TouchableOpacity>

          {/* Active Consultations */}
          <Text style={st.sectionTitle}>Konsultasi Aktif</Text>
          {myConsultations.length === 0 ? (
            <View style={st.emptyState}>
              <MaterialIcons name="chat-bubble-outline" size={48} color={C.outlineVariant} />
              <Text style={st.emptyText}>Belum ada konsultasi aktif</Text>
              <Text style={st.emptySubtext}>Booking jadwal untuk memulai chat</Text>
            </View>
          ) : (
            myConsultations.map(c => (
              <TouchableOpacity key={c.id} style={st.consultCard} onPress={() => enterChat(c.id)} activeOpacity={0.7}>
                <View style={st.consultIcon}>
                  <MaterialIcons name="person" size={24} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={st.consultName}>{c.nakes_nama}</Text>
                    <View style={[st.statusBadge, c.chat_status === 'bot' ? st.badgeBot : st.badgeNakes]}>
                      <Text style={[st.statusBadgeText, c.chat_status === 'bot' ? st.badgeBotText : st.badgeNakesText]}>
                        {c.chat_status === 'bot' ? '🤖 Bot' : '👨‍⚕️ Nakes'}
                      </Text>
                    </View>
                  </View>
                  <Text style={st.consultProfesi}>{c.nakes_profesi} • {c.tanggal}</Text>
                  <Text style={st.consultLastMsg} numberOfLines={1}>{c.last_message}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={C.outline} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Booking Modal */}
        <Modal visible={showBookingModal} animationType="slide" transparent>
          <View style={st.modalOverlay}>
            <View style={st.modalContent}>
              <View style={st.modalHeader}>
                <Text style={st.modalTitle}>Pilih Jadwal Nakes</Text>
                <TouchableOpacity onPress={() => setShowBookingModal(false)}><MaterialIcons name="close" size={24} color={C.onSurfaceVariant} /></TouchableOpacity>
              </View>
              <Text style={st.modalSubtitle}>Pilih jadwal yang tersedia untuk booking:</Text>
              {isLoadingNakes ? (
                <View style={{ paddingVertical: S.xl, alignItems: 'center' }}><ActivityIndicator color={C.primary} /><Text style={{ marginTop: S.sm, fontSize: 12, color: C.outline }}>Memuat...</Text></View>
              ) : nakesSchedules.length === 0 ? (
                <View style={{ paddingVertical: S.xl, alignItems: 'center' }}><MaterialIcons name="event-busy" size={48} color={C.outlineVariant} /><Text style={{ marginTop: S.md, fontSize: 14, color: C.outline, textAlign: 'center' }}>Belum ada jadwal tersedia.</Text></View>
              ) : (
                <FlatList data={nakesSchedules} keyExtractor={i => String(i.id)} style={{ maxHeight: 350 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={st.scheduleCard} onPress={() => handleBooking(item)} activeOpacity={0.7} disabled={isBooking}>
                      <View style={st.scheduleLeft}>
                        <View style={st.scheduleIconWrap}><MaterialIcons name="person" size={20} color={C.primary} /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={st.scheduleName}>{item.nakes?.user?.nama || item.nakes?.nama || 'Nakes'}</Text>
                          <Text style={st.scheduleProfesi}>{item.nakes?.profesi || '-'}</Text>
                          <Text style={st.scheduleTime}>{item.hari} • {item.jam_mulai} - {item.jam_selesai}</Text>
                        </View>
                      </View>
                      <View style={st.bookBtn}><Text style={st.bookBtnText}>{isBooking ? '...' : 'Book'}</Text></View>
                    </TouchableOpacity>
                  )} />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── Phase 2: Live Chat ──
  function renderChatPhase() {
    return (
      <SafeAreaView style={st.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        {/* Chat Header */}
        <View style={st.header}>
          <View style={st.headerLeft}>
            <TouchableOpacity onPress={goBack} style={st.iconBtn}><MaterialIcons name="arrow-back" size={24} color="#64748b" /></TouchableOpacity>
            <View style={st.avatarWrap}>
              <View style={[st.avatar, { backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialIcons name="person" size={22} color="#fff" />
              </View>
              <View style={st.onlineDot} />
            </View>
            <View>
              <Text style={st.nakesName} numberOfLines={1}>{chatInfo.nakes_nama || 'Tenaga Kesehatan'}</Text>
              <Text style={st.nakesRole}>{chatInfo.chat_status === 'bot' ? '🤖 Mode Chatbot' : `👨‍⚕️ ${chatInfo.nakes_profesi}`}</Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scrollRef} contentContainerStyle={st.chatScroll} showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {/* Privacy Badge */}
            <View style={st.privacyBadge}>
              <MaterialIcons name="verified-user" size={16} color={C.primary} />
              <Text style={st.privacyText}>Chat ini terlindungi enkripsi end-to-end</Text>
            </View>
            {/* Mode Banner */}
            <View style={[st.modeBanner, chatInfo.chat_status === 'nakes' && st.modeBannerNakes]}>
              <MaterialIcons name={chatInfo.chat_status === 'bot' ? 'smart-toy' : 'medical-services'} size={18} color={chatInfo.chat_status === 'bot' ? C.botText : C.primary} />
              <Text style={[st.modeBannerText, chatInfo.chat_status === 'nakes' && { color: C.primary }]}>
                {chatInfo.chat_status === 'bot' ? 'Chatbot aktif — Nakes akan mengambil alih jika diperlukan' : `Anda terhubung langsung dengan ${chatInfo.nakes_nama}`}
              </Text>
            </View>

            {messages.length === 0 && !isLoadingChat && (
              <View style={st.emptyChat}>
                <MaterialIcons name="chat" size={48} color={C.outlineVariant} />
                <Text style={st.emptyChatText}>Kirim pesan pertama Anda!</Text>
              </View>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const isUser = msg.sender === 'pasien';
              const isBot = msg.sender === 'bot';
              return (
                <View key={msg.id} style={[st.bubbleRow, isUser && st.bubbleRowUser]}>
                  <View style={[st.bubbleCol, isUser && st.bubbleColUser]}>
                    {/* Sender label for bot/nakes */}
                    {!isUser && (
                      <View style={st.senderLabel}>
                        <MaterialIcons name={isBot ? 'smart-toy' : 'medical-services'} size={12} color={isBot ? C.botText : C.secondary} />
                        <Text style={[st.senderLabelText, !isBot && { color: C.secondary }]}>{isBot ? 'HI!-CARE Bot' : msg.nakes_nama || 'Nakes'}</Text>
                      </View>
                    )}
                    <View style={[st.bubble, isUser ? st.bubbleUser : isBot ? st.bubbleBot : st.bubbleNakes]}>
                      <Text style={[st.bubbleText, isUser && st.bubbleTextUser]}>{msg.pesan}</Text>
                    </View>
                    <Text style={[st.timeText, isUser && { textAlign: 'right' }]}>{msg.waktu}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Input Bar */}
          <View style={st.inputBar}>
            <View style={st.inputWrap}>
              <TextInput style={st.textInput} placeholder="Ketik pesan..." placeholderTextColor="#94a3b8"
                value={inputText} onChangeText={setInputText} returnKeyType="send" onSubmitEditing={handleSend} />
            </View>
            <TouchableOpacity style={[st.sendBtn, (!inputText.trim() || isSending) && { opacity: 0.5 }]} onPress={handleSend} activeOpacity={0.85} disabled={!inputText.trim() || isSending}>
              {isSending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="send" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
};

// ── Styles ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.margin, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.primary },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(42,92,190,0.2)' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },
  nakesName: { fontSize: 16, fontWeight: '700', color: C.onSurface, maxWidth: 200 },
  nakesRole: { fontSize: 11, fontWeight: '500', color: '#64748b' },

  // Select phase
  selectScroll: { padding: S.margin, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.onSurface, marginTop: S.lg, marginBottom: S.md },
  bookingCta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: `${C.primary}0A`, borderRadius: 16, padding: S.md, borderWidth: 1.5, borderColor: `${C.primary}30`, borderStyle: 'dashed' },
  bookingCtaIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center' },
  bookingCtaTitle: { fontSize: 16, fontWeight: '700', color: C.primary },
  bookingCtaSub: { fontSize: 12, color: C.onSurfaceVariant },

  // Consultation cards
  consultCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  consultIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  consultName: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  consultProfesi: { fontSize: 12, color: C.outline, marginTop: 2 },
  consultLastMsg: { fontSize: 12, color: C.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  badgeBot: { backgroundColor: '#f1f5f9' }, badgeBotText: { color: '#475569' },
  badgeNakes: { backgroundColor: '#eff6ff' }, badgeNakesText: { color: C.primary },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: C.onSurfaceVariant },
  emptySubtext: { fontSize: 13, color: C.outline },

  // Chat phase
  chatScroll: { paddingHorizontal: S.margin, paddingTop: S.lg, paddingBottom: S.md, gap: S.lg },
  privacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: C.surfaceContainerLow, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1, borderColor: `${C.outlineVariant}4D`, marginBottom: S.sm },
  privacyText: { fontSize: 11, fontWeight: '500', color: C.onSurfaceVariant },

  modeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.botBg, borderRadius: 12, padding: 12, marginBottom: S.sm },
  modeBannerNakes: { backgroundColor: `${C.primary}0D`, borderWidth: 1, borderColor: `${C.primary}1A` },
  modeBannerText: { fontSize: 12, color: C.botText, flex: 1, lineHeight: 18 },

  emptyChat: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyChatText: { fontSize: 14, color: C.outline },

  // Bubbles
  senderLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2, marginLeft: 4 },
  senderLabelText: { fontSize: 10, fontWeight: '600', color: C.botText },
  bubbleRow: { maxWidth: '85%' },
  bubbleRowUser: { alignSelf: 'flex-end' },
  bubbleCol: { gap: 4 },
  bubbleColUser: { alignItems: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleUser: {
    backgroundColor: C.primary, borderBottomRightRadius: 0,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  bubbleBot: {
    backgroundColor: C.botBg, borderBottomLeftRadius: 0,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  bubbleNakes: {
    backgroundColor: '#fff', borderBottomLeftRadius: 0,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  bubbleText: { fontSize: 16, lineHeight: 24, color: C.onSurface },
  bubbleTextUser: { color: C.onPrimary },
  timeText: { fontSize: 10, color: '#94a3b8' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  inputWrap: { flex: 1 },
  textInput: {
    backgroundColor: '#f8fafc', borderRadius: 9999,
    paddingHorizontal: 20, paddingVertical: 10, fontSize: 14, color: C.onSurface,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: S.lg, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.onSurface },
  modalSubtitle: { fontSize: 14, color: C.onSurfaceVariant, marginBottom: S.md },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surfaceContainerLow, borderRadius: 12, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: C.outlineVariant },
  scheduleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  scheduleIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center' },
  scheduleName: { fontSize: 14, fontWeight: '700', color: C.onSurface },
  scheduleProfesi: { fontSize: 12, color: C.secondary, fontWeight: '600' },
  scheduleTime: { fontSize: 11, color: C.outline, marginTop: 2 },
  bookBtn: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

export default ChatScreen;
