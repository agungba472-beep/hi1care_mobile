import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import api from '../src/api';

// ── Design Tokens ──
const C = {
  bg: '#f0f4ff', surface: '#ffffff', primary: '#0043a2', primaryLight: '#e8f0fe',
  onPrimary: '#ffffff', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5', secondary: '#6b4ab2',
  botBg: '#f1f5f9', botText: '#475569', success: '#16a34a',
} as const;

interface ChatMessage {
  id: number | string; pesan: string; sender: 'pasien' | 'nakes' | 'bot';
  waktu: string; nakes_nama?: string | null;
}

type RouteParams = { PatientChatRoom: { konsultasiId: number } };

const PatientChatRoomScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'PatientChatRoom'>>();
  const konsultasiId = route.params?.konsultasiId;
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<{ nakes_nama: string; nakes_profesi: string; chat_status: string }>({
    nakes_nama: 'Tenaga Kesehatan', nakes_profesi: '', chat_status: 'bot',
  });

  // Polling messages
  useEffect(() => {
    if (!konsultasiId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [konsultasiId]);

  const fetchMessages = async () => {
    if (!konsultasiId) return;
    try {
      const res = await api.get(`/chat/${konsultasiId}/messages`);
      const data = res.data.data;
      setMessages(data.messages || []);
      if (data.konsultasi) {
        setChatInfo({
          nakes_nama: data.konsultasi.nakes_nama || 'Tenaga Kesehatan',
          nakes_profesi: data.konsultasi.nakes_profesi || '',
          chat_status: data.konsultasi.chat_status || 'bot',
        });
      }
    } catch (e: any) { console.log('[PatientChat] fetch err:', e.message); }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !konsultasiId || isSending) return;
    setIsSending(true);
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`, pesan: trimmed, sender: 'pasien',
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, optimistic]);
    setInputText('');
    try {
      await api.post('/chat/send', { konsultasi_id: konsultasiId, pesan: trimmed });
      await fetchMessages();
    } catch (e: any) { Alert.alert('Gagal', 'Pesan gagal dikirim.'); }
    finally { setIsSending(false); }
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={C.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={st.avatarWrap}>
          <View style={st.avatar}>
            <MaterialIcons name="person" size={22} color="#fff" />
          </View>
          <View style={st.onlineDot} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.nakesName} numberOfLines={1}>{chatInfo.nakes_nama}</Text>
          <Text style={st.nakesRole}>
            {chatInfo.chat_status === 'bot' ? '🤖 Mode Chatbot' : `👨‍⚕️ ${chatInfo.nakes_profesi}`}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={st.chatScroll}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Mode Banner */}
          <View style={[st.modeBanner, chatInfo.chat_status === 'nakes' && st.modeBannerNakes]}>
            <MaterialIcons
              name={chatInfo.chat_status === 'bot' ? 'smart-toy' : 'medical-services'}
              size={18}
              color={chatInfo.chat_status === 'bot' ? C.botText : C.primary}
            />
            <Text style={[st.modeBannerText, chatInfo.chat_status === 'nakes' && { color: C.primary }]}>
              {chatInfo.chat_status === 'bot'
                ? 'Chatbot aktif — Nakes akan mengambil alih jika diperlukan'
                : `Anda terhubung langsung dengan ${chatInfo.nakes_nama}`}
            </Text>
          </View>

          {messages.length === 0 && (
            <View style={st.emptyChat}>
              <MaterialIcons name="chat" size={48} color={C.outlineVariant} />
              <Text style={st.emptyChatText}>Kirim pesan pertama Anda!</Text>
            </View>
          )}

          {/* Messages */}
          {messages.map(msg => {
            const isUser = msg.sender === 'pasien';
            const isBot = msg.sender === 'bot';
            return (
              <View key={msg.id} style={[st.bubbleRow, isUser && st.bubbleRowUser]}>
                <View style={[st.bubbleCol, isUser && st.bubbleColUser]}>
                  {!isUser && (
                    <View style={st.senderLabel}>
                      <MaterialIcons name={isBot ? 'smart-toy' : 'medical-services'} size={12} color={isBot ? C.botText : C.secondary} />
                      <Text style={[st.senderLabelText, !isBot && { color: C.secondary }]}>
                        {isBot ? 'HI!-CARE Bot' : msg.nakes_nama || 'Nakes'}
                      </Text>
                    </View>
                  )}
                  <View style={[st.bubble, isUser ? st.bubbleUser : isBot ? st.bubbleBot : st.bubbleNakes]}>
                    <Text style={[st.bubbleText, isUser && { color: '#fff' }]}>{msg.pesan}</Text>
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
            <TextInput
              style={st.textInput}
              placeholder="Ketik pesan..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>
          <TouchableOpacity
            style={[st.sendBtn, (!inputText.trim() || isSending) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.85}
          >
            {isSending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: '#e8edf5', elevation: 2,
  },
  backBtn: { padding: 4 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(42,92,190,0.2)',
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff',
  },
  nakesName: { fontSize: 16, fontWeight: '700', color: C.onSurface, maxWidth: 200 },
  nakesRole: { fontSize: 11, fontWeight: '500', color: '#64748b' },

  chatScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 14 },

  modeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.botBg, borderRadius: 14, padding: 12, marginBottom: 4,
  },
  modeBannerNakes: { backgroundColor: `${C.primary}0D`, borderWidth: 1, borderColor: `${C.primary}1A` },
  modeBannerText: { fontSize: 12, color: C.botText, flex: 1, lineHeight: 18 },

  emptyChat: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyChatText: { fontSize: 14, color: C.outline },

  senderLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2, marginLeft: 4 },
  senderLabelText: { fontSize: 10, fontWeight: '600', color: C.botText },

  bubbleRow: { maxWidth: '85%' },
  bubbleRowUser: { alignSelf: 'flex-end' },
  bubbleCol: { gap: 4 },
  bubbleColUser: { alignItems: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleUser: {
    backgroundColor: C.primary, borderBottomRightRadius: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  bubbleBot: {
    backgroundColor: C.botBg, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e8edf5', elevation: 1,
  },
  bubbleNakes: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e8edf5', elevation: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 22, color: C.onSurface },
  timeText: { fontSize: 10, color: '#94a3b8' },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8edf5',
  },
  inputWrap: { flex: 1 },
  textInput: {
    backgroundColor: '#f4f7fc', borderRadius: 9999,
    paddingHorizontal: 18, paddingVertical: 10, fontSize: 14, color: C.onSurface,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
});

export default PatientChatRoomScreen;
