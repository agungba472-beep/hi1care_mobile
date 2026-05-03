import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ── Design Tokens (DESIGN.md – Serene Assurance) ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff',
  onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff',
  secondary: '#6b4ab2', background: '#f8f9ff',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

// ── Types ──
interface ChatMessage {
  id: string;
  text: string;
  time: string;
  sender: 'user' | 'nakes';
  read?: boolean;
}

interface TipCard {
  title: string;
  description: string;
  onReadMore?: () => void;
}

interface ChatScreenProps {
  nakesName?: string;
  nakesRole?: string;
  nakesAvatarUri?: string;
  isOnline?: boolean;
  messages?: ChatMessage[];
  tipCard?: TipCard | null;
  onBack?: () => void;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  onMore?: () => void;
  onSend?: (text: string) => void;
  onAttach?: () => void;
  onImage?: () => void;
}

// ── Sample Data ──
const SAMPLE_MESSAGES: ChatMessage[] = [
  { id: '1', text: 'Selamat pagi. Bagaimana kabar Anda hari ini? Sudahkah jadwal minum obat pagi ini terpenuhi dengan baik?', time: '08:15', sender: 'nakes' },
  { id: '2', text: 'Selamat pagi, Bidan Siti. Kabar saya baik. Tadi pagi sudah saya minum jam 7 tepat. Cuma saya agak khawatir sedikit soal efek sampingnya.', time: '08:17', sender: 'user', read: true },
  { id: '3', text: 'Sangat bagus Anda tetap disiplin! Kekhawatiran itu wajar. Bisa ceritakan lebih detail apa yang Anda rasakan? Apakah mual atau sedikit pusing?', time: '08:20', sender: 'nakes' },
  { id: '4', text: 'Iya, terasa agak mual kalau perut kosong. Terima kasih sarannya, Bidan. Saya akan coba besok pagi dengan sarapan dulu.', time: '08:25', sender: 'user', read: true },
];

const SAMPLE_TIP: TipCard = {
  title: 'Tips Mengelola Mual',
  description: 'Cobalah minum obat setelah makan ringan atau sebelum tidur untuk mengurangi sensasi mual di siang hari.',
};

// ── Component ──
const ChatScreen: React.FC<ChatScreenProps> = ({
  nakesName = 'Bidan Siti', nakesRole = 'Konselor ARV',
  nakesAvatarUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCKiVXujqK8F9V9xrIgvvO_JBMlsEn-uV9MsCD7ux0huAFt8fLnFLClKUC7cR5QrBoqu5JqiTi9aGj3voEYhp7_WYIRmvsHZSA7DREXNY79pibpbbMIpb6i6yCvfu13c7_f7vlV9Wex_aXYA-s3XKP6KC_Akk7aUudPpAewKqxYEhvISfKIVu6wVtHj8KYdBrA-feKHldHhYrhC0P43ZrbIKYrKGuqg9ztL-gKR8Al3biAb83oCyIMqpWd1KKi6IVxNOBPGv0-RI00',
  isOnline = true, messages = SAMPLE_MESSAGES, tipCard = SAMPLE_TIP,
  onBack, onVideoCall, onVoiceCall, onMore, onSend, onAttach, onImage,
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setInputText('');
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ═══ TOP APP BAR ═══ */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={onBack} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View style={st.avatarWrap}>
            <Image source={{ uri: nakesAvatarUri }} style={st.avatar} />
            {isOnline && <View style={st.onlineDot} />}
          </View>
          <View>
            <Text style={st.nakesName}>{nakesName}</Text>
            <Text style={st.nakesRole}>{nakesRole}</Text>
          </View>
        </View>
        <View style={st.headerRight}>
          <TouchableOpacity onPress={onVideoCall} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="videocam" size={24} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onVoiceCall} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="call" size={24} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onMore} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="more-vert" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ CHAT CONTENT ═══ */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} contentContainerStyle={st.chatScroll} showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>

          {/* Privacy Badge */}
          <View style={st.privacyBadge}>
            <MaterialIcons name="verified-user" size={16} color={C.primary} />
            <Text style={st.privacyText}>Chat ini terlindungi enkripsi end-to-end</Text>
          </View>

          {/* Date Separator */}
          <View style={st.dateSep}>
            <View style={st.dateLine} />
            <Text style={st.dateText}>HARI INI</Text>
            <View style={st.dateLine} />
          </View>

          {/* Messages */}
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            // Insert tip card before last user message (index 3)
            const showTip = tipCard && idx === 3;
            return (
              <React.Fragment key={msg.id}>
                {showTip && (
                  <View style={st.tipCard}>
                    <View style={st.tipIconWrap}>
                      <MaterialIcons name="lightbulb" size={24} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.tipTitle}>{tipCard.title}</Text>
                      <Text style={st.tipDesc}>{tipCard.description}</Text>
                      <TouchableOpacity style={st.tipLink} onPress={tipCard.onReadMore} activeOpacity={0.7}>
                        <Text style={st.tipLinkText}>Baca Selengkapnya</Text>
                        <MaterialIcons name="chevron-right" size={14} color={C.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={[st.bubbleRow, isUser && st.bubbleRowUser]}>
                  <View style={[st.bubbleCol, isUser && st.bubbleColUser]}>
                    <View style={[st.bubble, isUser ? st.bubbleUser : st.bubbleNakes]}>
                      <Text style={[st.bubbleText, isUser && st.bubbleTextUser]}>{msg.text}</Text>
                    </View>
                    <View style={[st.timeRow, isUser && st.timeRowUser]}>
                      <Text style={st.timeText}>{msg.time}</Text>
                      {isUser && msg.read && (
                        <MaterialIcons name="done-all" size={14} color={C.primary} />
                      )}
                    </View>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </ScrollView>

        {/* ═══ INPUT BAR ═══ */}
        <View style={st.inputBar}>
          <TouchableOpacity onPress={onAttach} style={st.inputIconBtn} activeOpacity={0.7}>
            <MaterialIcons name="add-circle" size={26} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onImage} style={st.inputIconBtn} activeOpacity={0.7}>
            <MaterialIcons name="image" size={26} color="#94a3b8" />
          </TouchableOpacity>
          <View style={st.inputWrap}>
            <TextInput style={st.textInput} placeholder="Ketik pesan..." placeholderTextColor="#94a3b8"
              value={inputText} onChangeText={setInputText} returnKeyType="send" onSubmitEditing={handleSend} />
          </View>
          <TouchableOpacity style={st.sendBtn} onPress={handleSend} activeOpacity={0.85}>
            <MaterialIcons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 4 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(42,92,190,0.2)' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
    borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff',
  },
  nakesName: { fontSize: 16, fontWeight: '700', color: C.onSurface, lineHeight: 20 },
  nakesRole: { fontSize: 11, fontWeight: '500', color: '#64748b' },

  // Chat area
  chatScroll: { paddingHorizontal: S.margin, paddingTop: S.lg, paddingBottom: S.md, gap: S.lg },

  // Privacy badge
  privacyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    backgroundColor: C.surfaceContainerLow, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 9999, borderWidth: 1, borderColor: `${C.outlineVariant}4D`,
  },
  privacyText: { fontSize: 11, fontWeight: '500', color: C.onSurfaceVariant },

  // Date separator
  dateSep: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: `${C.outlineVariant}33` },
  dateText: { marginHorizontal: 16, fontSize: 11, fontWeight: '600', color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' },

  // Bubbles
  bubbleRow: { maxWidth: '85%' },
  bubbleRowUser: { alignSelf: 'flex-end' },
  bubbleCol: { gap: 4 },
  bubbleColUser: { alignItems: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleNakes: {
    backgroundColor: '#fff', borderBottomLeftRadius: 0,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  bubbleUser: {
    backgroundColor: C.primary, borderBottomRightRadius: 0,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  bubbleText: { fontSize: 16, lineHeight: 24, color: C.onSurface },
  bubbleTextUser: { color: C.onPrimary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 },
  timeRowUser: { marginRight: 4 },
  timeText: { fontSize: 10, color: '#94a3b8' },

  // Tip card
  tipCard: {
    flexDirection: 'row', gap: 16, alignItems: 'flex-start',
    backgroundColor: C.surfaceContainerLow, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: `${C.primary}1A`, maxWidth: '90%',
  },
  tipIconWrap: { backgroundColor: `${C.primary}1A`, padding: 8, borderRadius: 12 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: C.primary, marginBottom: 4 },
  tipDesc: { fontSize: 12, lineHeight: 18, color: C.onSurfaceVariant, marginBottom: 12 },
  tipLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tipLinkText: { fontSize: 12, fontWeight: '700', color: C.primary },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  inputIconBtn: { padding: 4 },
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
});

export default ChatScreen;
