import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// ── Design Tokens ──
const C = {
  bg: '#f0f4ff', surface: '#ffffff', primary: '#0043a2', primaryLight: '#e8f0fe',
  onPrimary: '#ffffff', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  botBubble: '#f1f5ff', userBubble: '#0043a2',
} as const;

interface ChatMsg { id: string; text: string; isUser: boolean; }

const FAQ: { q: string; a: string }[] = [
  { 
    q: 'Apa itu ARV?', 
    a: 'ARV (Antiretroviral) adalah obat yang digunakan untuk mengendalikan replikasi virus HIV dalam tubuh. ARV tidak menyembuhkan, tetapi menekan jumlah virus sehingga sistem imun tetap kuat dan Anda bisa hidup sehat.' 
  },
  { 
    q: 'Kapan minum ARV?', 
    a: 'ARV harus diminum setiap hari pada jam yang sama secara konsisten. Gunakan fitur Alarm di aplikasi HI!-CARE ini untuk membantu Anda mengingat jadwal minum obat.' 
  },
  { 
    q: 'Apa efek samping ARV?', 
    a: 'Efek samping umum meliputi: mual, sakit kepala, kelelahan, dan diare. Biasanya ringan dan membaik setelah tubuh beradaptasi. Jika efek samping terasa sangat berat, segera hubungi Tenaga Kesehatan Anda.' 
  },
  { 
    q: 'Bagaimana prosedur Refill Obat?', 
    a: 'Tidak perlu khawatir! Sistem HI!-CARE dan Admin Puskesmas akan memberikan pengingat (notifikasi) secara otomatis kepada Anda saat jadwal stok obat sudah hampir habis.' 
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
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'welcome', text: 'Halo! Saya HI!-BOT 🤖\nSaya siap membantu menjawab pertanyaan Anda. Silakan pilih topik pertanyaan di bawah ini:', isUser: false },
  ]);

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

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      
      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={C.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={st.headerAvatar}>
          <MaterialIcons name="smart-toy" size={24} color={C.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>HI!-BOT</Text>
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
                <MaterialIcons name="smart-toy" size={14} color={C.primary} />
              </View>
            )}
            <View style={[st.bubble, msg.isUser ? st.bubbleUser : st.bubbleBot]}>
              <Text style={[st.bubbleText, msg.isUser && { color: '#fff' }]}>{msg.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Area Tombol Quick Replies (Pengganti Keyboard) ── */}
      <View style={st.quickReplyContainer}>
        <Text style={st.quickReplyTitle}>Pilih Pertanyaan:</Text>
        
        <ScrollView style={st.quickReplyScroll} showsVerticalScrollIndicator={false}>
          {/* Render 3 Tombol FAQ */}
          {FAQ.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={st.chip} 
              onPress={() => handleSend(item.q)} 
              activeOpacity={0.7}
            >
              <Text style={st.chipText}>{item.q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.onSurface },
  headerSub: { fontSize: 11, color: C.outline, marginTop: 1 },

  chatScroll: { padding: 16, paddingBottom: 16, gap: 12 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  bubbleRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  botMiniAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '90%' },
  bubbleBot: {
    backgroundColor: C.surface, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e8edf5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  bubbleUser: {
    backgroundColor: C.userBubble, borderBottomRightRadius: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  bubbleText: { fontSize: 14, lineHeight: 21, color: C.onSurface },

  // Style untuk Container Quick Replies di bawah
  quickReplyContainer: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: '#e8edf5',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    maxHeight: '45%', // Membatasi agar tombol tidak menutupi seluruh layar chat
  },
  quickReplyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    marginBottom: 10,
  },
  quickReplyScroll: {
    gap: 8,
  },
  chip: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1, 
    borderColor: C.primary + '30',
  },
  chipText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: C.primary,
    lineHeight: 18,
  },
  liveChatChip: {
    backgroundColor: '#059669', // Warna Hijau agar kontras dan terlihat sebagai opsi manusia
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  liveChatChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default ChatbotScreen;