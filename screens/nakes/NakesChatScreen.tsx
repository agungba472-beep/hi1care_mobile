import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../src/api';
import CustomHeader from '../../components/CustomHeader';

// ── Design Tokens ──
const C = {
  primary: '#012D1D', 
  accent: '#00A86B',
  surface: '#ffffff', 
  background: '#f0f4ff', 
  outline: '#737784',
  onSurface: '#0d1c2e',
  outlineVariant: '#c3c6d5',
};

export default function NakesChatScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<'semua'|'livechat'|'booking'>('semua');
  const [refreshing, setRefreshing] = useState(false);

  // ── Mengambil Daftar Chat dari Backend ──
  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/nakes/active-chats');
      
      if (res.data.status === 'success') {
        setChatHistory(res.data.data || []);
      }
    } catch (error) {
      console.error('Gagal mengambil riwayat chat:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChatHistory();
  }, []);

  // Refresh data setiap kali halaman ini dibuka
  useFocusEffect(
    useCallback(() => {
      fetchChatHistory();
    }, [])
  );

  // ── Tampilan Setiap Kartu Pasien (WhatsApp Style) ──
  const renderItem = ({ item }: { item: any }) => {
    const isLiveChat = item.kategori === 'livechat';
    const hasUnread = item.last_sender === 'pasien';

    return (
      <TouchableOpacity
        style={st.card}
        onPress={() => navigation.navigate('PatientChatRoom', { konsultasiId: item.id })}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={[st.avatar, hasUnread && st.avatarUnread]}>
          <MaterialIcons name="person" size={24} color={hasUnread ? C.surface : C.primary} />
        </View>

        {/* Info Tengah */}
        <View style={st.info}>
          {/* Baris 1: Nama Pasien + Waktu */}
          <View style={st.topRow}>
            <Text style={[st.name, hasUnread && st.nameUnread]} numberOfLines={1}>
              {item.pasien_nama || 'Pasien WEAR'}
            </Text>
            <Text style={[st.timeText, hasUnread && { color: C.accent }]}>
              {item.last_message_at || ''}
            </Text>
          </View>

          {/* Baris 2: Pesan Terakhir + Badge */}
          <View style={st.bottomRow}>
            <Text style={[st.lastMsg, hasUnread && st.lastMsgUnread]} numberOfLines={1}>
              {item.last_sender === 'bot' ? '🤖 ' : item.last_sender === 'nakes' ? 'Anda: ' : ''}
              {item.last_message && item.last_message !== 'Belum ada pesan' ? item.last_message : 'Sesi baru dikonfirmasi, silakan sapa pasien.'}
            </Text>
            <View style={st.badges}>
              <View style={[st.statusBadge, item.status === 'selesai' ? st.statusSelesai : st.statusActive]}>
                <Text style={st.statusText}>{item.status === 'selesai' ? 'Selesai' : 'Aktif'}</Text>
              </View>
              {isLiveChat && (
                <View style={st.badgeLive}>
                  <MaterialIcons name="flash-on" size={10} color="#f59e0b" />
                  <Text style={st.badgeLiveText}>Live</Text>
                </View>
              )}
              {hasUnread && <View style={st.unreadDot} />}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      
      {/* HEADER */}
      <CustomHeader title="Chat Konsultasi Pasien" showBackButton={false} hideBell={false} />

      {/* KONTEN */}
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ marginTop: 10, color: C.outline }}>Memuat daftar obrolan...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={st.list} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
          }
        >
          {/* FILTER ROW */}
          <View style={st.filterRow}>
            <TouchableOpacity onPress={() => setFilterCategory('semua')} style={[st.filterChip, filterCategory === 'semua' && st.filterChipActive]}>
              <Text style={[st.filterChipText, filterCategory === 'semua' && st.filterChipTextActive]}>Semua</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterCategory('livechat')} style={[st.filterChip, filterCategory === 'livechat' && st.filterChipActive]}>
              <Text style={[st.filterChipText, filterCategory === 'livechat' && st.filterChipTextActive]}>Chat Langsung</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterCategory('booking')} style={[st.filterChip, filterCategory === 'booking' && st.filterChipActive]}>
              <Text style={[st.filterChipText, filterCategory === 'booking' && st.filterChipTextActive]}>Konsultasi</Text>
            </TouchableOpacity>
          </View>

          {chatHistory.filter(c => {
            if (filterCategory === 'semua') return true;
            if (filterCategory === 'livechat') return c.kategori === 'livechat';
            if (filterCategory === 'booking') return c.kategori !== 'livechat';
            return true;
          }).length === 0 ? (
            <View style={[st.center, { marginTop: 100 }]}>
              <View style={st.emptyIcon}>
                <MaterialIcons name="chat-bubble-outline" size={40} color={C.outlineVariant} />
              </View>
              <Text style={st.emptyTitle}>Belum Ada Obrolan</Text>
              <Text style={st.emptyText}>Tidak ada obrolan yang cocok dengan filter.</Text>
            </View>
          ) : (
            <>
              {/* SECTION: LIVE CHAT */}
              {(filterCategory === 'semua' || filterCategory === 'livechat') && chatHistory.filter(item => item.kategori === 'livechat').length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 8, paddingHorizontal: 16, textTransform: 'uppercase' }}>
                    Chat Langsung (Live)
                  </Text>
                  <View style={{ backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f4ff' }}>
                    {chatHistory.filter(item => item.kategori === 'livechat').map(item => <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>)}
                  </View>
                </View>
              )}

              {/* SECTION: BOOKING */}
              {(filterCategory === 'semua' || filterCategory === 'booking') && chatHistory.filter(item => item.kategori !== 'livechat').length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 8, paddingHorizontal: 16, textTransform: 'uppercase' }}>
                    Konsultasi Booking
                  </Text>
                  <View style={{ backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f4ff' }}>
                    {chatHistory.filter(item => item.kategori !== 'livechat').map(item => <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>)}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  // ── Empty State ──
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.onSurface, marginBottom: 6 },
  emptyText: { fontSize: 13, color: C.outline, textAlign: 'center' },

  // ── Filter Row ──
  filterRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#e8edf5', borderWidth: 1, borderColor: '#d3dbe8',
  },
  filterChipActive: {
    backgroundColor: C.primary, borderColor: C.primary,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.outline },
  filterChipTextActive: { color: C.surface },

  // ── Card (WhatsApp Style Row) ──
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f4ff',
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarUnread: {
    backgroundColor: C.primary,
  },
  info: { flex: 1 },

  // Baris Atas: Nama + Waktu
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600', color: C.onSurface, flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '800' },
  timeText: { fontSize: 12, color: C.outline, fontWeight: '500' },

  // Baris Bawah: Pesan + Badge
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { fontSize: 13, color: C.outline, flex: 1, marginRight: 8 },
  lastMsgUnread: { color: C.onSurface, fontWeight: '600' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeLive: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  badgeLiveText: { fontSize: 10, fontWeight: '700', color: '#b45309' },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent,
  },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  statusActive: { backgroundColor: '#e8f0fe' },
  statusSelesai: { backgroundColor: '#e6f4ea' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#5f6368' },
});
