import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Platform, ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../src/api';

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
} as const;

interface ChatMsg { id: string; text: string; isUser: boolean; }

const FAQ: { q: string; a: string }[] = [
  { 
    q: 'Apa itu ARV?', 
    a: 'ARV (Antiretroviral) adalah obat yang digunakan untuk mengendalikan replikasi virus HIV dalam tubuh. ARV tidak menyembuhkan, tetapi menekan jumlah virus sehingga sistem imun tetap kuat dan Anda bisa hidup sehat.' 
  },
  { 
    q: 'Kapan minum ARV?', 
    a: 'ARV harus diminum setiap hari pada jam yang sama secara konsisten. Gunakan fitur Alarm di aplikasi WEAR ini untuk membantu Anda mengingat jadwal minum obat.' 
  },
  { 
    q: 'Apa efek samping ARV?', 
    a: 'Efek samping umum meliputi: mual, sakit kepala, kelelahan, dan diare. Biasanya ringan dan membaik setelah tubuh beradaptasi. Jika efek samping terasa sangat berat, segera hubungi Tenaga Kesehatan Anda.' 
  },
  { 
    q: 'Bagaimana prosedur Refill Obat?', 
    a: 'Tidak perlu khawatir! Sistem WEAR dan Admin Puskesmas akan memberikan pengingat (notifikasi) secara otomatis kepada Anda saat jadwal stok obat sudah hampir habis.' 
  },
  { 
    q: 'Apakah HIV bisa sembuh?', 
    a: 'Saat ini belum ada obat yang bisa menyembuhkan HIV sepenuhnya. Namun, dengan terapi ARV yang rutin, virus dapat ditekan hingga tidak terdeteksi (Status U=U / Undetectable = Untransmittable).' 
  },
  { 
    q: 'Bagaimana cara Konsultasi dengan Nakes?', 
    a: 'Untuk berkonsultasi langsung dengan perawat atau dokter, Anda cukup menekan tombol hijau "Bicara dengan Nakes (Live Chat)" yang ada di bagian bawah layar ini.' 
  },
];

const getAutoReply = (question: string): string => {
  const found = FAQ.find(f => f.q === question);
  return found ? found.a : 'Maaf, saya tidak memiliki jawaban untuk itu.';
};

const ChatbotScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'welcome', text: 'Halo! Saya WEAR BOT 🤖\nSaya siap membantu menjawab pertanyaan Anda. Silakan pilih topik pertanyaan di bawah ini:', isUser: false },
  ]);

  const [isCheckingChat, setIsCheckingChat] = useState(false);

  const addMessage = (text: string, isUser: boolean) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${isUser ? 'u' : 'b'}`, text, isUser }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = (question: string) => {
    // 1. Tampilkan pertanyaan pasien di layar chat
    addMessage(question, true);
    // 2. Berikan delay sedikit agar terlihat seperti bot sedang "mengetik" balasannya
    setTimeout(() => addMessage(getAutoReply(question), false), 600);
  };

  const handleLiveChatClick = async () => {
    if (isCheckingChat) return;
    setIsCheckingChat(true);
    
    try {
      const res = await api.get('/patient/my-consultations');
      const consultations = res.data.data || [];
      
      const activeConsultation = consultations.find((c: any) => {
        if (c.kategori === 'livechat' && (c.status === 'diterima' || c.chat_status === 'nakes')) return true;
        try {
          // Jika ada booking hari ini yang sudah masuk waktunya, boleh juga dianggap aktif
          const now = new Date();
          const [h, m] = c.waktu.split(':').map(Number);
          const consultDate = new Date(c.tanggal);
          consultDate.setHours(h, m, 0, 0);
          return now >= consultDate && c.kategori === 'livechat';
        } catch { return false; }
      });

      if (activeConsultation) {
        // Punya jadwal aktif, langsung masuk ke ruang chat
        navigation.navigate('PatientChatRoom', { konsultasiId: activeConsultation.id });
      } else {
        // Tidak ada jadwal aktif, arahkan ke daftar Nakes
        navigation.navigate('MainTabs', { screen: 'Chat' }); 
      }
    } catch (e) {
      // Jika terjadi error (misal koneksi lambat), fallback ke ChatScreen biasa
      navigation.navigate('MainTabs', { screen: 'Chat' });
    } finally {
      setIsCheckingChat(false);
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surfaceContainerLowest} />
      
      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={C.onSurface} />
        </TouchableOpacity>
        <View style={st.headerAvatar}>
          <MaterialIcons name="smart-toy" size={22} color={C.onPrimaryFixed} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>WEAR BOT</Text>
          <Text style={st.headerSub}>Asisten AI Otomatis</Text>
        </View>
      </View>

      {/* ── Area Obrolan (Chat) ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={st.chatScroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[st.bubbleRow, msg.isUser && st.bubbleRowUser]}>
            {!msg.isUser && (
              <View style={st.botMiniAvatar}>
                <MaterialIcons name="smart-toy" size={16} color={C.primary} />
              </View>
            )}
            <View style={[st.bubble, msg.isUser ? st.bubbleUser : st.bubbleBot]}>
              <Text style={[st.bubbleText, msg.isUser && { color: '#ffffff' }]}>{msg.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Area Tombol Quick Replies (Pengganti Keyboard) ── */}
      <View style={st.quickReplyContainer}>
        <Text style={st.quickReplyTitle}>Pilih Pertanyaan:</Text>
        
        <ScrollView style={st.quickReplyScroll} showsVerticalScrollIndicator={false}>
          {FAQ.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={st.chip} 
              onPress={() => handleSend(item.q)} 
              activeOpacity={0.7}
            >
              <Text style={st.chipText}>{item.q}</Text>
              <MaterialIcons name="send" size={16} color={C.primary} style={{ opacity: 0.7 }} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tombol Hubungi Nakes (Live Chat) */}
        <TouchableOpacity 
          style={[st.liveChatChip, isCheckingChat && { opacity: 0.7 }]} 
          onPress={handleLiveChatClick}
          activeOpacity={0.8}
          disabled={isCheckingChat}
        >
          {isCheckingChat ? (
            <ActivityIndicator size="small" color={C.onPrimaryContainer} />
          ) : (
            <MaterialIcons name="headset-mic" size={20} color={C.onPrimaryContainer} />
          )}
          <Text style={st.liveChatChipText}>
            {isCheckingChat ? 'Memeriksa Jadwal...' : 'Bicara dengan Nakes (Live Chat)'}
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

// ── Styles (Tema Emerald/Mint Material 3) ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surfaceContainerLowest, 
    borderBottomWidth: 1, borderBottomColor: C.outlineVariant,
    elevation: 2,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3
  },
  backBtn: { padding: 4 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.onSurface, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontWeight: '500', color: C.outline, marginTop: 2 },

  chatScroll: { padding: 16, paddingBottom: 24, gap: 16 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  bubbleRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  botMiniAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  bubble: { 
    paddingHorizontal: 16, paddingVertical: 12, maxWidth: '90%',
  },
  bubbleBot: {
    backgroundColor: C.surfaceContainerLow, 
    borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  bubbleUser: {
    backgroundColor: C.primary, 
    borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 4,
    elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 22, color: C.onSurface },

  // Style untuk Container Quick Replies di bawah
  quickReplyContainer: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: C.outlineVariant,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    maxHeight: '48%', 
  },
  quickReplyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    marginBottom: 12,
  },
  quickReplyScroll: {
    gap: 8,
  },
  chip: {
    backgroundColor: C.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1, 
    borderColor: C.outlineVariant,
  },
  chipText: { 
    flex: 1,
    fontSize: 13, 
    fontWeight: '600', 
    color: C.primary,
    lineHeight: 18,
    marginRight: 8,
  },
  liveChatChip: {
    backgroundColor: C.primaryContainer, 
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
    elevation: 3,
    shadowColor: C.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  liveChatChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onPrimaryContainer,
  },
});

export default ChatbotScreen;
