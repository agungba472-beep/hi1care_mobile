import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform,
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

// ── Local Bot Responses ──
const FAQ: { q: string; a: string }[] = [
  { q: 'Apa itu ARV?', a: 'ARV (Antiretroviral) adalah obat yang digunakan untuk mengendalikan replikasi virus HIV dalam tubuh. ARV tidak menyembuhkan HIV, tetapi menekan jumlah virus sehingga sistem imun tetap kuat dan Anda bisa hidup sehat.' },
  { q: 'Kapan minum ARV?', a: 'ARV harus diminum setiap hari pada jam yang sama. Konsistensi sangat penting — jangan melewatkan dosis. Gunakan fitur Alarm di aplikasi ini untuk membantu Anda mengingat jadwal minum obat.' },
  { q: 'Efek samping ARV?', a: 'Efek samping umum meliputi: mual, sakit kepala, kelelahan, dan diare. Biasanya ringan dan membaik setelah beberapa minggu. Jika efek samping berat atau tidak membaik, segera konsultasikan ke tenaga kesehatan Anda.' },
  { q: 'Cara refill obat?', a: 'Anda bisa mengajukan permintaan refill obat melalui menu Alarm di aplikasi ini. Klik tombol "Ajukan Refill" dan tim kesehatan akan memproses permintaan Anda. Pastikan untuk mengajukan sebelum obat habis.' },
  { q: 'HIV bisa sembuh?', a: 'Saat ini belum ada obat yang bisa menyembuhkan HIV sepenuhnya. Namun, dengan terapi ARV yang konsisten, virus dapat ditekan hingga tidak terdeteksi (undetectable). Status U=U (Undetectable = Untransmittable) artinya risiko penularan sangat rendah.' },
  { q: 'Konsultasi nakes?', a: 'Anda bisa berkonsultasi langsung dengan tenaga kesehatan melalui menu Chat. Gunakan fitur "Chat Langsung" untuk memulai percakapan tanpa perlu booking, atau buat janji konsultasi untuk jadwal tertentu.' },
];

const getAutoReply = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (lower.includes('arv') && (lower.includes('apa') || lower.includes('apakah'))) return FAQ[0].a;
  if (lower.includes('minum') || lower.includes('kapan') || lower.includes('jadwal')) return FAQ[1].a;
  if (lower.includes('efek') || lower.includes('samping')) return FAQ[2].a;
  if (lower.includes('refill') || lower.includes('obat') || lower.includes('isi ulang')) return FAQ[3].a;
  if (lower.includes('sembuh') || lower.includes('hilang')) return FAQ[4].a;
  if (lower.includes('konsultasi') || lower.includes('nakes') || lower.includes('dokter')) return FAQ[5].a;
  return 'Terima kasih atas pertanyaan Anda. Untuk informasi lebih detail, silakan konsultasikan langsung dengan tenaga kesehatan melalui fitur Chat Langsung di menu Konsultasi. Saya siap membantu pertanyaan seputar ARV, HIV, efek samping obat, dan jadwal pengobatan.';
};

const ChatbotScreen: React.FC = () => {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'welcome', text: 'Halo! Saya HI!-BOT 🤖\nSaya siap membantu menjawab pertanyaan Anda seputar ARV dan HIV. Pilih topik di bawah atau ketik pertanyaan Anda.', isUser: false },
  ]);
  const [inputText, setInputText] = useState('');

  const addMessage = (text: string, isUser: boolean) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${isUser ? 'u' : 'b'}`, text, isUser }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = (text?: string) => {
    const msg = (text || inputText).trim();
    if (!msg) return;
    addMessage(msg, true);
    setInputText('');
    setTimeout(() => addMessage(getAutoReply(msg), false), 600);
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={C.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={st.headerAvatar}>
          <MaterialIcons name="smart-toy" size={24} color={C.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>HI!-BOT</Text>
          <Text style={st.headerSub}>Asisten AI • Aktif 24/7</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={st.chatScroll}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Messages */}
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

          {/* FAQ Chips */}
          {messages.length <= 2 && (
            <View style={st.chipWrap}>
              <Text style={st.chipLabel}>Pertanyaan Populer:</Text>
              {FAQ.map((f, i) => (
                <TouchableOpacity key={i} style={st.chip} onPress={() => handleSend(f.q)} activeOpacity={0.7}>
                  <Text style={st.chipText}>{f.q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={st.inputBar}>
          <View style={st.inputWrap}>
            <TextInput
              style={st.textInput}
              placeholder="Ketik pertanyaan Anda..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />
          </View>
          <TouchableOpacity
            style={[st.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
            activeOpacity={0.85}
          >
            <MaterialIcons name="send" size={20} color="#fff" />
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
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.onSurface },
  headerSub: { fontSize: 11, color: C.outline, marginTop: 1 },

  chatScroll: { padding: 16, paddingBottom: 8, gap: 12 },

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

  chipWrap: { marginTop: 8, gap: 8 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: C.outline, marginBottom: 2 },
  chip: {
    backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
    borderWidth: 1, borderColor: C.primary + '30',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: C.primary },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: '#e8edf5',
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

export default ChatbotScreen;
