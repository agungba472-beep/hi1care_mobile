import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../src/api';
import { initEcho } from '../src/echo';

const C = {
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  surface: '#f8f9ff', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
} as const;

interface ChatMessage {
  id: number | string;
  sender: 'pasien' | 'nakes';
  pesan: string;
  waktu: string;
}

export default function PatientChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const konsultasiId: number = route.params?.konsultasiId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // State Dinamis (Pintar)
  const [myRole, setMyRole] = useState<'pasien' | 'nakes'>('pasien');
  const [opponentName, setOpponentName] = useState<string>('Memuat...');
  const [opponentRole, setOpponentRole] = useState<string>('-');
  const [opponentUserId, setOpponentUserId] = useState<number | null>(null);
  
  // Status Online
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${konsultasiId}/messages`);
      if (res.data.status === 'success') {
        const data = res.data.data.konsultasi;
        
        // 1. Tentukan Role Saya
        const role = data.current_role || 'pasien';
        setMyRole(role);

        // 2. Set Nama Lawan Bicara di Header
        if (role === 'nakes') {
          setOpponentName(data.pasien_nama || 'Pasien');
          setOpponentRole('Pasien HI!-CARE');
          setOpponentUserId(data.pasien_user_id);
        } else {
          setOpponentName(data.nakes_nama || 'Tenaga Kesehatan');
          setOpponentRole(`✅ ${data.nakes_profesi || 'Nakes'}`);
          setOpponentUserId(data.nakes_user_id);
        }

        // 3. Filter pesan bot
        const humanMessages = res.data.data.messages.filter((m: any) => m.sender !== 'bot');
        setMessages(humanMessages || []);
      }
    } catch (error: any) {
      console.error('Gagal mengambil chat:', error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!konsultasiId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [konsultasiId]);

    useEffect(() => {
    let echoInstance: any = null;
    const setupWebSocket = async () => {
      if (!konsultasiId) return;
      try {
        echoInstance = await initEcho();
        
        // Private Channel
        echoInstance.private(`konsultasi.${konsultasiId}`)
          .listen('.message.sent', (event: any) => {
            setMessages((prev) => {
              if (prev.some(m => m.id === event.chat.id)) return prev;
              return [...prev, event.chat];
            });
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
          });
          
        // Presence Channel
        echoInstance.join('presence-klinik')
          .here((users: any[]) => setOnlineUsers(users))
          .joining((user: any) => setOnlineUsers((prev) => [...prev, user]))
          .leaving((user: any) => setOnlineUsers((prev) => prev.filter((u) => u.id !== user.id)));

      } catch (err) { console.log('WebSocket error:', err); }
    };
    setupWebSocket();
    return () => { 
      if (echoInstance) {
        echoInstance.leave(`konsultasi.${konsultasiId}`);
        echoInstance.leave('presence-klinik');
      }
    };
  }, [konsultasiId]);

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || isSending) return;

    // Tampilkan di layar dengan role saya
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: myRole, // <--- Sudah Dinamis!
      pesan: trimmed,
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    setIsSending(true);
    try {
      await api.post('/chat/send', { konsultasi_id: konsultasiId, pesan: trimmed });
      fetchMessages();
    } catch (error) {
      setMessages((prev) => prev.filter(m => m.id !== optimistic.id));
      Alert.alert('Gagal', 'Pesan gagal dikirim.');
    } finally {
      setIsSending(false);
    }
  };

  const isOpponentOnline = onlineUsers.some((u) => u.id === opponentUserId);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* HEADER DINAMIS */}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View style={st.headerAvatar}>
            <MaterialIcons name={myRole === 'nakes' ? 'person' : 'medical-services'} size={20} color="#fff" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={st.headerName}>{opponentName}</Text>
              {/* TITIK STATUS ONLINE/OFFLINE */}
              <View style={{
                width: 8, height: 8, borderRadius: 4, marginLeft: 6,
                backgroundColor: isOpponentOnline ? '#10b981' : '#9ca3af'
              }} />
              <Text style={{ fontSize: 11, marginLeft: 4, color: isOpponentOnline ? '#10b981' : '#9ca3af', fontWeight: '500' }}>
                {isOpponentOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Text style={st.headerRole}>{opponentRole}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={st.chatScroll}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={st.emptyState}>
                <MaterialIcons name="chat" size={48} color={C.outlineVariant} />
                <Text style={st.emptyText}>Mulai Konsultasi</Text>
              </View>
            )}

            {messages.map((msg) => {
              // LOGIKA BUBBLE DINAMIS
              const isMe = msg.sender === myRole;

              return (
                <View key={msg.id} style={[st.bubbleRow, isMe && st.bubbleRowRight]}>
                  <View style={[st.bubbleCol, isMe && st.bubbleColRight]}>
                    {!isMe && (
                      <View style={st.senderLabel}>
                        <MaterialIcons name={myRole === 'nakes' ? 'person' : 'medical-services'} size={12} color={C.primary} />
                        <Text style={st.senderLabelText}>{opponentName}</Text>
                      </View>
                    )}
                    <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleOpponent]}>
                      <Text style={[st.bubbleText, isMe && { color: '#fff' }]}>{msg.pesan}</Text>
                    </View>
                    <Text style={[st.timeText, isMe && { textAlign: 'right' }]}>{msg.waktu}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={st.inputBar}>
          <View style={st.inputWrap}>
            <TextInput
              style={st.textInput}
              placeholder="Tulis pesan..."
              placeholderTextColor="#94a3b8"
              value={newMessage}
              onChangeText={setNewMessage}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline
            />
          </View>
          <TouchableOpacity style={[st.sendBtn, (!newMessage.trim() || isSending) && { opacity: 0.4 }]} onPress={handleSend} disabled={!newMessage.trim() || isSending}>
            {isSending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="send" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', elevation: 2 },
  backBtn: { padding: 4 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2a5cbe', alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 16, fontWeight: '700', color: '#0d1c2e' },
  headerRole: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chatScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#434652' },
  senderLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4, marginLeft: 4 },
  senderLabelText: { fontSize: 11, fontWeight: '600', color: '#0043a2' },
  bubbleRow: { maxWidth: '85%', marginBottom: 4 },
  bubbleRowRight: { alignSelf: 'flex-end' },
  bubbleCol: { gap: 4 },
  bubbleColRight: { alignItems: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#0043a2', borderBottomRightRadius: 4 },
  bubbleOpponent: { backgroundColor: '#ffffff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#0043a230', elevation: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: '#0d1c2e' },
  timeText: { fontSize: 10, color: '#94a3b8', marginHorizontal: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  inputWrap: { flex: 1 },
  textInput: { backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, fontSize: 14, color: '#0d1c2e', maxHeight: 100, borderWidth: 1, borderColor: '#e2e8f0' },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#0043a2', alignItems: 'center', justifyContent: 'center', elevation: 2 },
});