import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../src/api';

// ── Design Tokens ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff',
  onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  secondary: '#6b4ab2', background: '#f8f9ff',
  error: '#ba1a1a', botBg: '#f1f5f9', botText: '#475569',
  success: '#16a34a',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

// ── Types ──
interface ActiveChat {
  id: number; pasien_nama: string; pasien_id: number; status: string;
  chat_status: string; tanggal: string; waktu: string; chats_count: number;
  last_message: string; last_sender: string | null; last_message_at: string;
}
interface ChatMessage {
  id: number | string; pesan: string; sender: 'pasien' | 'nakes' | 'bot';
  waktu: string; nakes_nama?: string | null;
}

type Phase = 'list' | 'chat';

const NakesChatScreen: React.FC = () => {
  const scrollRef = useRef<ScrollView>(null);
  const [phase, setPhase] = useState<Phase>('list');

  // List phase
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chat phase
  const [selectedChat, setSelectedChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatStatus, setChatStatus] = useState<string>('bot');

  useFocusEffect(useCallback(() => {
    if (phase === 'list') fetchActiveChats();
  }, [phase]));

  useEffect(() => {
    if (phase !== 'chat' || !selectedChat) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [phase, selectedChat]);

  // ═══ API ═══

  const fetchActiveChats = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/nakes/active-chats');
      setActiveChats(res.data.data || []);
    } catch (e: any) { console.log('[NakesChat] error:', e.message); }
    finally { setIsLoading(false); }
  };

  const openChat = (chat: ActiveChat) => {
    setSelectedChat(chat);
    setChatStatus(chat.chat_status);
    setPhase('chat');
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const res = await api.get(`/chat/${selectedChat.id}/messages`);
      setMessages(res.data.data.messages || []);
      setChatStatus(res.data.data.konsultasi?.chat_status || 'bot');
    } catch (e: any) { console.log('[NakesChat] fetch msg error:', e.message); }
  };

  const handleTakeOver = async () => {
    if (!selectedChat) return;
    Alert.alert('Ambil Alih Chat', 'Chatbot akan dinonaktifkan dan Anda akan membalas pasien secara langsung.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ambil Alih', style: 'destructive', onPress: async () => {
        try {
          await api.post(`/chat/${selectedChat.id}/takeover`);
          setChatStatus('nakes');
          await fetchMessages();
          Alert.alert('Berhasil', 'Anda telah mengambil alih chat dari bot.');
        } catch (e: any) { Alert.alert('Gagal', e.response?.data?.message || 'Gagal mengambil alih.'); }
      }},
    ]);
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !selectedChat || isSending) return;
    if (chatStatus === 'bot') { Alert.alert('Mode Bot', 'Ambil alih chat terlebih dahulu sebelum mengirim pesan.'); return; }
    setIsSending(true);
    const optimistic: ChatMessage = { id: `temp-${Date.now()}`, pesan: trimmed, sender: 'nakes', waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, optimistic]);
    setInputText('');
    try {
      await api.post('/chat/send', { konsultasi_id: selectedChat.id, pesan: trimmed });
      await fetchMessages();
    } catch (e: any) { Alert.alert('Gagal', 'Pesan gagal dikirim.'); }
    finally { setIsSending(false); }
  };

  const goBack = () => { setPhase('list'); setSelectedChat(null); setMessages([]); fetchActiveChats(); };

  // ═══ RENDER ═══

  if (phase === 'chat') return renderChatPhase();
  return renderListPhase();

  function renderListPhase() {
    return (
      <SafeAreaView style={st.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={st.header}>
          <Text style={st.headerTitle}>👨‍⚕️ Chat Pasien</Text>
          <TouchableOpacity onPress={fetchActiveChats} style={st.refreshBtn}><MaterialIcons name="refresh" size={22} color={C.primary} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={st.listScroll} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={st.centerState}><ActivityIndicator color={C.primary} /><Text style={st.emptySubtext}>Memuat chat...</Text></View>
          ) : activeChats.length === 0 ? (
            <View style={st.centerState}>
              <MaterialIcons name="inbox" size={56} color={C.outlineVariant} />
              <Text style={st.emptyText}>Belum ada chat masuk</Text>
              <Text style={st.emptySubtext}>Chat dari pasien akan muncul di sini</Text>
            </View>
          ) : (
            activeChats.map(chat => (
              <TouchableOpacity key={chat.id} style={st.chatItem} onPress={() => openChat(chat)} activeOpacity={0.7}>
                <View style={st.chatItemAvatar}><MaterialIcons name="person" size={24} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={st.chatItemName}>{chat.pasien_nama}</Text>
                    <Text style={st.chatItemTime}>{chat.last_message_at}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={[st.chatBadge, chat.chat_status === 'bot' ? st.chatBadgeBot : st.chatBadgeNakes]}>
                      <Text style={[st.chatBadgeText, chat.chat_status === 'bot' ? { color: C.botText } : { color: C.success }]}>
                        {chat.chat_status === 'bot' ? '🤖 Bot' : '✅ Nakes'}
                      </Text>
                    </View>
                    {chat.chats_count > 0 && <View style={st.countBadge}><Text style={st.countText}>{chat.chats_count}</Text></View>}
                  </View>
                  <Text style={st.chatItemMsg} numberOfLines={1}>{chat.last_message}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  function renderChatPhase() {
    return (
      <SafeAreaView style={st.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={st.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={goBack} style={st.iconBtn}><MaterialIcons name="arrow-back" size={24} color="#64748b" /></TouchableOpacity>
            <View style={st.chatItemAvatar}><MaterialIcons name="person" size={20} color="#fff" /></View>
            <View>
              <Text style={st.nakesName}>{selectedChat?.pasien_nama || 'Pasien'}</Text>
              <Text style={st.nakesRole}>{chatStatus === 'bot' ? '🤖 Mode Bot Aktif' : '✅ Mode Nakes'}</Text>
            </View>
          </View>
          {chatStatus === 'bot' && (
            <TouchableOpacity style={st.takeoverBtn} onPress={handleTakeOver} activeOpacity={0.85}>
              <MaterialIcons name="swap-horiz" size={16} color="#fff" />
              <Text style={st.takeoverText}>Ambil Alih</Text>
            </TouchableOpacity>
          )}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scrollRef} contentContainerStyle={st.chatScroll} showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {chatStatus === 'bot' && (
              <View style={st.botWarningBanner}>
                <MaterialIcons name="smart-toy" size={18} color={C.botText} />
                <Text style={st.botWarningText}>Chatbot sedang aktif. Tekan "Ambil Alih" untuk membalas manual.</Text>
              </View>
            )}

            {messages.length === 0 && (
              <View style={st.centerState}><MaterialIcons name="chat" size={48} color={C.outlineVariant} /><Text style={st.emptySubtext}>Belum ada pesan</Text></View>
            )}

            {messages.map(msg => {
              const isNakes = msg.sender === 'nakes';
              const isBot = msg.sender === 'bot';
              return (
                <View key={msg.id} style={[st.bubbleRow, isNakes && st.bubbleRowRight]}>
                  <View style={[st.bubbleCol, isNakes && st.bubbleColRight]}>
                    {!isNakes && (
                      <View style={st.senderLabel}>
                        <MaterialIcons name={isBot ? 'smart-toy' : 'person'} size={12} color={isBot ? C.botText : C.primary} />
                        <Text style={[st.senderLabelText, !isBot && { color: C.primary }]}>{isBot ? 'Bot' : msg.nakes_nama || 'Pasien'}</Text>
                      </View>
                    )}
                    <View style={[st.bubble, isNakes ? st.bubbleNakesSelf : isBot ? st.bubbleBotStyle : st.bubblePasien]}>
                      <Text style={[st.bubbleText, isNakes && { color: '#fff' }]}>{msg.pesan}</Text>
                    </View>
                    <Text style={[st.timeText, isNakes && { textAlign: 'right' }]}>{msg.waktu}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={st.inputBar}>
            <View style={st.inputWrap}>
              <TextInput style={st.textInput} placeholder={chatStatus === 'bot' ? 'Ambil alih dulu untuk mengirim...' : 'Ketik pesan...'}
                placeholderTextColor="#94a3b8" value={inputText} onChangeText={setInputText}
                returnKeyType="send" onSubmitEditing={handleSend} editable={chatStatus === 'nakes'} />
            </View>
            <TouchableOpacity style={[st.sendBtn, (chatStatus === 'bot' || !inputText.trim() || isSending) && { opacity: 0.4 }]}
              onPress={handleSend} disabled={chatStatus === 'bot' || !inputText.trim() || isSending}>
              {isSending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="send" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.margin, paddingVertical: 14, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.primary },
  refreshBtn: { padding: 8, borderRadius: 20, backgroundColor: `${C.primary}10` },
  iconBtn: { padding: 4 },

  // List phase
  listScroll: { padding: S.margin, paddingBottom: 100 },
  centerState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: C.onSurfaceVariant },
  emptySubtext: { fontSize: 13, color: C.outline },

  chatItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: S.md, marginBottom: S.sm, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  chatItemAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  chatItemName: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  chatItemTime: { fontSize: 11, color: C.outline },
  chatItemMsg: { fontSize: 12, color: C.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' },

  chatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  chatBadgeBot: { backgroundColor: '#f1f5f9' },
  chatBadgeNakes: { backgroundColor: '#f0fdf4' },
  chatBadgeText: { fontSize: 10, fontWeight: '700' },
  countBadge: { backgroundColor: C.primary, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Chat phase
  nakesName: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  nakesRole: { fontSize: 11, fontWeight: '500', color: '#64748b' },
  takeoverBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.error, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  takeoverText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  chatScroll: { paddingHorizontal: S.margin, paddingTop: S.md, paddingBottom: S.md, gap: S.sm },

  botWarningBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: S.sm, borderWidth: 1, borderColor: '#fde68a' },
  botWarningText: { fontSize: 12, color: '#92400e', flex: 1, lineHeight: 18 },

  senderLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2, marginLeft: 4 },
  senderLabelText: { fontSize: 10, fontWeight: '600', color: C.botText },

  bubbleRow: { maxWidth: '85%', marginBottom: 4 },
  bubbleRowRight: { alignSelf: 'flex-end' },
  bubbleCol: { gap: 2 },
  bubbleColRight: { alignItems: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleNakesSelf: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleBotStyle: { backgroundColor: C.botBg, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  bubblePasien: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: `${C.primary}30` },
  bubbleText: { fontSize: 15, lineHeight: 22, color: C.onSurface },
  timeText: { fontSize: 10, color: '#94a3b8', marginHorizontal: 4 },

  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  inputWrap: { flex: 1 },
  textInput: { backgroundColor: '#f8fafc', borderRadius: 9999, paddingHorizontal: 20, paddingVertical: 10, fontSize: 14, color: C.onSurface },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});

export default NakesChatScreen;
