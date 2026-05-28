import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../src/api';

// [TAMBAHAN WEBSOCKET] Import fungsi Echo yang sudah dibuat
import { initEcho } from '../src/echo'; 

export default function PatientChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Asumsi parameter yang dikirim saat buka layar chat
  const nakesId = route.params?.nakes_id || route.params?.receiver_id; 

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<number | null>(null);

  // 1. Ambil riwayat chat awal & data profil diri sendiri
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const profileRes = await api.get('/profile'); 
        setMyId(profileRes.data.data.id); 
        
        const chatRes = await api.get(`/chat/${nakesId}`); // Sesuaikan endpoint ambil chat
        if (chatRes.data.success) {
          setMessages(chatRes.data.data);
        }
      } catch (error) {
        console.error("Gagal mengambil chat:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();
  }, [nakesId]);

  // 2. [TAMBAHAN WEBSOCKET] Berlangganan (Subscribe) ke Channel Obrolan Real-Time
  useEffect(() => {
    let echoInstance: any = null;

    const setupWebSocket = async () => {
      if (!myId || !nakesId) return;

      echoInstance = await initEcho();

      // Urutkan ID dari terkecil ke terbesar sesuai format backend (chat.2.5)
      const ids = [myId, nakesId].sort((a, b) => a - b);
      const channelName = `chat.${ids[0]}.${ids[1]}`;

      echoInstance.private(channelName)
        .listen('.message.sent', (event: any) => {
          const incomingMsg = event.chat;
          
          // Mencegah duplikasi: Jika yang masuk BUKAN pesan diri sendiri, tampilkan!
          if (incomingMsg.sender_id !== myId) {
            setMessages((prevMessages) => [...prevMessages, incomingMsg]);
            // Scroll ke bawah saat pesan masuk
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
          }
        });
    };

    setupWebSocket();

    // Cleanup: Tinggalkan channel saat user keluar dari layar chat
    return () => {
      if (echoInstance && myId && nakesId) {
        const ids = [myId, nakesId].sort((a, b) => a - b);
        echoInstance.leave(`chat.${ids[0]}.${ids[1]}`);
      }
    };
  }, [myId, nakesId]);

  // 3. Fungsi Mengirim Pesan
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    // A. Munculkan langsung di layar (Optimistic Update agar terasa super cepat)
    const tempMsg = {
      id: Date.now(), // ID sementara
      sender_id: myId,
      receiver_id: nakesId,
      message: newMessage,
      created_at: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // B. Kirim ke Server
    try {
      await api.post('/chat/send', {
        receiver_id: nakesId,
        message: tempMsg.message
      });
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
      Alert.alert("Error", "Gagal mengirim pesan, cek koneksi internet Anda.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat dengan Nakes</Text>
      </View>

      {/* CHAT AREA */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#0066B2" style={{ flex: 1 }} />
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === myId;
              return (
                <View key={msg.id || index} style={[styles.bubbleWrap, isMe ? styles.bubbleMeWrap : styles.bubbleOtherWrap]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
                      {msg.message}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* INPUT AREA */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ketik pesan..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <MaterialIcons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  scrollContent: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  bubbleWrap: { marginBottom: 12, width: '100%', flexDirection: 'row' },
  bubbleMeWrap: { justifyContent: 'flex-end' },
  bubbleOtherWrap: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: '#0066B2', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#E1E8ED', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15 },
  msgTextMe: { color: '#fff' },
  msgTextOther: { color: '#333' },
  inputContainer: {
    flexDirection: 'row', padding: 12, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center'
  },
  input: {
    flex: 1, backgroundColor: '#F5F7FA', borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    maxHeight: 100, color: '#333'
  },
  sendButton: {
    backgroundColor: '#0066B2', width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12
  }
});