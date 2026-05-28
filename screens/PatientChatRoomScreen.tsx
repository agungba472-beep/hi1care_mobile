import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../src/api';

// [WEBSOCKET] Import fungsi Echo
import { initEcho } from '../src/echo';

// ── Design Tokens ──
const C = {
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  surface: '#f8f9ff', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  botBg: '#f1f5f9', botText: '#475569',
  success: '#16a34a',
} as const;

// ── Types ──
interface ChatMessage {
  id: number | string;
  sender: 'pasien' | 'nakes' | 'bot';
  pesan: string;
  nakes_nama?: string | null;
  waktu: string;
}

export default function PatientChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);

  // konsultasiId dikirim dari ChatScreen (riwayat konsultasi)
  const konsultasiId: number = route.params?.konsultasiId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatStatus, setChatStatus] = useState<string>('bot');
  const [nakesNama, setNakesNama] = useState<string>('Nakes');
  const [nakesProfesi, setNakesProfesi] = useState<string>('-');

  // ── Fetch messages dari backend ──
  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${konsultasiId}/messages`);
      if (res.data.status === 'success') {
        setMessages(res.data.data.messages || []);
        setChatStatus(res.data.data.konsultasi?.chat_status || 'bot');
        setNakesNama(res.data.data.konsultasi?.nakes_nama || 'Nakes');
        setNakesProfesi(res.data.data.konsultasi?.nakes_profesi || '-');
      }
    } catch (error: any) {
      console.error('Gagal mengambil chat:', error?.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch awal + polling setiap 5 detik sebagai fallback
  useEffect(() => {
    if (!konsultasiId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [konsultasiId]);

  // 2. [WEBSOCKET] Subscribe ke channel konsultasi untuk real-time
  useEffect(() => {
    let echoInstance: any = null;

    const setupWebSocket = async () => {
      if (!konsultasiId) return;

      try {
        echoInstance = await initEcho();
        const channelName = `konsultasi.${konsultasiId}`;

        echoInstance.private(channelName)
          .listen('.message.sent', (event: any) => {
            const incoming: ChatMessage = event.chat;

            // Tambahkan pesan baru, hindari duplikasi
            setMessages((prev) => {
              const exists = prev.some(m => m.id === incoming.id);
              if (exists) return prev;
              return [...prev, incoming];
            });
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
          });
      } catch (err) {
        console.log('[Echo] WebSocket setup error:', err);
      }
    };

    setupWebSocket();

    return () => {
      if (echoInstance && konsultasiId) {
        echoInstance.leave(`konsultasi.${konsultasiId}`);
      }
    };
  }, [konsultasiId]);

  // 3. Kirim pesan
  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || isSending) return;

    // Optimistic update
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'pasien',
      pesan: trimmed,
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    setIsSending(true);
    try {
      await api.post('/chat/send', {
        konsultasi_id: konsultasiId,
        pesan: trimmed,
      });
      // Refetch untuk dapat bot reply juga
      await fetchMessages();
    } catch (error: any) {
      console.error('Gagal mengirim pesan:', error?.message);
      Alert.alert('Gagal', 'Pesan gagal dikirim. Cek koneksi internet Anda.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* HEADER */}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View style={st.headerAvatar}>
            <MaterialIcons name="medical-services" size={20} color="#fff" />
          </View>
          <View>
            <Text style={st.headerName}>{nakesNama}</Text>
            <Text style={st.headerRole}>
              {chatStatus === 'bot' ? '🤖 Mode Chatbot' : `✅ ${nakesProfesi}`}
            </Text>
          </View>
        </View>
      </View>

      {/* CHAT */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.loadingText}>Memuat percakapan...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={st.chatScroll}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {chatStatus === 'bot' && (
              <View style={st.botBanner}>
                <MaterialIcons name="smart-toy" size={18} color={C.botText} />
                <Text style={st.botBannerText}>
                  Anda sedang berbicara dengan chatbot. Nakes akan mengambil alih jika diperlukan.
                </Text>
              </View>
            )}

            {messages.length === 0 && (
              <View style={st.emptyState}>
                <MaterialIcons name="chat" size={48} color={C.outlineVariant} />
                <Text style={st.emptyText}>Belum ada pesan</Text>
                <Text style={st.emptySubtext}>Kirim pesan untuk memulai percakapan</Text>
              </View>
            )}

            {messages.map((msg) => {
              const isPasien = msg.sender === 'pasien';
              const isBot = msg.sender === 'bot';

              return (
                <View key={msg.id} style={[st.bubbleRow, isPasien && st.bubbleRowRight]}>
                  <View style={[st.bubbleCol, isPasien && st.bubbleColRight]}>
                    {!isPasien && (
                      <View style={st.senderLabel}>
                        <MaterialIcons
                          name={isBot ? 'smart-toy' : 'person'}
                          size={12}
                          color={isBot ? C.botText : C.primary}
                        />
                        <Text style={[st.senderLabelText, !isBot && { color: C.primary }]}>
                          {isBot ? 'HI!-BOT' : msg.nakes_nama || 'Nakes'}
                        </Text>
                      </View>
                    )}
                    <View style={[
                      st.bubble,
                      isPasien ? st.bubblePasien : isBot ? st.bubbleBot : st.bubbleNakes,
                    ]}>
                      <Text style={[st.bubbleText, isPasien && { color: '#fff' }]}>
                        {msg.pesan}
                      </Text>
                    </View>
                    <Text style={[st.timeText, isPasien && { textAlign: 'right' }]}>
                      {msg.waktu}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* INPUT */}
        <View style={st.inputBar}>
          <View style={st.inputWrap}>
            <TextInput
              style={st.textInput}
              placeholder="Ketik pesan..."
              placeholderTextColor="#94a3b8"
              value={newMessage}
              onChangeText={setNewMessage}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[st.sendBtn, (!newMessage.trim() || isSending) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', elevation: 2,
  },
  backBtn: { padding: 4 },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center',
  },
  headerName: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  headerRole: { fontSize: 11, fontWeight: '500', color: '#64748b' },

  // Chat area
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: C.outline },
  chatScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 8 },

  botBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#fde68a',
  },
  botBannerText: { fontSize: 12, color: '#92400e', flex: 1, lineHeight: 18 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: C.onSurfaceVariant },
  emptySubtext: { fontSize: 13, color: C.outline },

  // Bubbles
  senderLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2, marginLeft: 4 },
  senderLabelText: { fontSize: 10, fontWeight: '600', color: C.botText },

  bubbleRow: { maxWidth: '85%', marginBottom: 4 },
  bubbleRowRight: { alignSelf: 'flex-end' },
  bubbleCol: { gap: 2 },
  bubbleColRight: { alignItems: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubblePasien: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleBot: {
    backgroundColor: C.botBg, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  bubbleNakes: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: `${C.primary}30`,
  },
  bubbleText: { fontSize: 15, lineHeight: 22, color: C.onSurface },
  timeText: { fontSize: 10, color: '#94a3b8', marginHorizontal: 4 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  inputWrap: { flex: 1 },
  textInput: {
    backgroundColor: '#f8fafc', borderRadius: 9999,
    paddingHorizontal: 20, paddingVertical: 10,
    fontSize: 14, color: C.onSurface, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
});