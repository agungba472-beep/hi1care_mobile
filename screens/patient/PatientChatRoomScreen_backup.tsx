import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../src/api';
import { initEcho } from '../../src/echo';

// ── Design Tokens (Tema Emerald/Mint Material 3) ──
const C = {
  surface: '#f9f9f8', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#f3f4f3',
  surfaceContainer: '#edeeed', surfaceContainerHigh: '#e7e8e7',
  onSurface: '#191c1c', onSurfaceVariant: '#414844',
  outline: '#717973', outlineVariant: '#c1c8c2',
  primary: '#012d1d', onPrimary: '#ffffff', primaryContainer: '#1b4332',
  onPrimaryContainer: '#86af99', primaryFixed: '#c1ecd4', onPrimaryFixed: '#012d1d', primaryFixedDim: '#a5d0b9',
  secondary: '#4c6452', onSecondary: '#ffffff', secondaryContainer: '#cce6d0',
  secondaryFixed: '#cee9d3', onSecondaryFixed: '#092012', secondaryFixedDim: '#b3cdb7',
  background: '#f9f9f8', onBackground: '#191c1c',
  online: '#10b981', offline: '#9ca3af'
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
          setOpponentRole('Pasien WEAR');
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
      <StatusBar barStyle="dark-content" backgroundColor={C.surfaceContainerLowest} />
      
      {/* HEADER DINAMIS */}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={C.onSurface} />
          </TouchableOpacity>
          <View style={st.headerAvatar}>
            <MaterialIcons name={myRole === 'nakes' ? 'person' : 'medical-services'} size={22} color={C.onPrimaryFixed} />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={st.headerName}>{opponentName}</Text>
              {/* TITIK STATUS ONLINE/OFFLINE */}
              <View style={[
                st.statusDot, 
                { backgroundColor: isOpponentOnline ? C.online : C.offline }
              ]} />
              <Text style={[
                st.statusText, 
                { color: isOpponentOnline ? C.online : C.offline }
              ]}>
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
                <View style={st.emptyIconWrap}>
                  <MaterialIcons name="forum" size={48} color={C.primaryFixed} />
                </View>
                <Text style={st.emptyText}>Mulai Konsultasi</Text>
                <Text style={st.emptySub}>Kirim pesan untuk memulai percakapan.</Text>
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
                        <MaterialIcons name={myRole === 'nakes' ? 'person' : 'medical-services'} size={14} color={C.primary} />
                        <Text style={st.senderLabelText}>{opponentName}</Text>
                      </View>
                    )}
                    <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleOpponent]}>
                      <Text style={[st.bubbleText, isMe && { color: '#ffffff' }]}>{msg.pesan}</Text>
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
              placeholderTextColor={C.outline}
              value={newMessage}
              onChangeText={setNewMessage}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline
            />
          </View>
          <TouchableOpacity 
            style={[st.sendBtn, (!newMessage.trim() || isSending) && { opacity: 0.5 }]} 
            onPress={handleSend} 
            disabled={!newMessage.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialIcons name="send" size={20} color="#ffffff" style={{ marginLeft: 4 }} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles (Tema Emerald/Mint Material 3) ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 16, paddingVertical: 14, 
    backgroundColor: C.surfaceContainerLowest, 
    borderBottomWidth: 1, borderBottomColor: C.outlineVariant, 
    elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 
  },
  backBtn: { padding: 4 },
  headerAvatar: { 
    width: 42, height: 42, borderRadius: 21, 
    backgroundColor: C.primaryFixed, 
    alignItems: 'center', justifyContent: 'center' 
  },
  headerName: { fontSize: 16, fontWeight: '700', color: C.onSurface },
  headerRole: { fontSize: 12, fontWeight: '500', color: C.outline, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  statusText: { fontSize: 11, marginLeft: 4, fontWeight: '600' },
  
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chatScroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 16 },
  
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surfaceContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { fontSize: 18, fontWeight: '700', color: C.onSurface },
  emptySub: { fontSize: 14, color: C.outline, textAlign: 'center' },
  
  senderLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 },
  senderLabelText: { fontSize: 12, fontWeight: '700', color: C.primary },
  
  bubbleRow: { maxWidth: '85%', marginBottom: 4 },
  bubbleRowRight: { alignSelf: 'flex-end' },
  bubbleCol: { gap: 4 },
  bubbleColRight: { alignItems: 'flex-end' },
  
  bubble: { paddingHorizontal: 16, paddingVertical: 12, maxWidth: '100%' },
  bubbleOpponent: { 
    backgroundColor: C.surfaceContainerLow, 
    borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: C.outlineVariant 
  },
  bubbleMe: { 
    backgroundColor: C.primary, 
    borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 4,
    elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 
  },
  
  bubbleText: { fontSize: 15, lineHeight: 22, color: C.onSurface },
  timeText: { fontSize: 11, color: C.outline, marginHorizontal: 4, fontWeight: '500' },
  
  inputBar: { 
    flexDirection: 'row', alignItems: 'center', gap: 12, 
    paddingHorizontal: 16, paddingVertical: 12, 
    backgroundColor: C.surfaceContainerLowest, 
    borderTopWidth: 1, borderTopColor: C.outlineVariant 
  },
  inputWrap: { flex: 1 },
  textInput: { 
    backgroundColor: C.surfaceContainerLow, 
    borderRadius: 24, 
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, 
    fontSize: 15, color: C.onSurface, 
    maxHeight: 120, 
    borderWidth: 1, borderColor: C.outlineVariant 
  },
  sendBtn: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: C.primary, 
    alignItems: 'center', justifyContent: 'center', 
    elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 
  },
});
