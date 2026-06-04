import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../src/api';
import CustomHeader from '../components/CustomHeader';

// ── Design Tokens ──
const C = {
  primary: '#0043a2', surface: '#ffffff', background: '#f8f9ff', outline: '#737784'
};

export default function NakesChatScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // ── Mengambil Daftar Chat dari Backend ──
  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      // Memanggil API khusus Nakes untuk melihat daftar konsultasi aktif/riwayat
      const res = await api.get('/nakes/active-chats');
      
      if (res.data.status === 'success') {
        setChatHistory(res.data.data || []);
      }
    } catch (error) {
      console.error('Gagal mengambil riwayat chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data setiap kali halaman ini dibuka
  useFocusEffect(
    useCallback(() => {
      fetchChatHistory();
    }, [])
  );

  // ── Tampilan Setiap Kartu Pasien ──
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={st.card}
      // Navigasi ke Ruang Obrolan Universal dengan membawa ID Konsultasi
      onPress={() => navigation.navigate('PatientChatRoom', { konsultasiId: item.id })}
    >
      <View style={st.avatar}>
        <MaterialIcons name="person" size={24} color={C.primary} />
      </View>
      <View style={st.info}>
        <Text style={st.name}>
          {item.pasien?.master?.nama || item.pasien?.user?.nama || 'Pasien HI!-CARE'}
        </Text>
        <Text style={st.status}>Jadwal: {item.tanggal} | {item.waktu}</Text>
      </View>
      <View style={st.actionIcon}>
        <MaterialIcons name="chat" size={20} color={C.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      
      {/* HEADER */}
      <CustomHeader title="Chat Konsultasi Pasien" showBackButton={false} hideBell={true} />

      {/* KONTEN */}
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ marginTop: 10, color: C.outline }}>Memuat daftar obrolan...</Text>
        </View>
      ) : chatHistory.length === 0 ? (
        <View style={st.center}>
          <MaterialIcons name="chat-bubble-outline" size={48} color={C.outline} />
          <Text style={st.emptyText}>Belum ada riwayat obrolan.</Text>
        </View>
      ) : (
        <FlatList
          data={chatHistory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { padding: 16, backgroundColor: C.surface, elevation: 2, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, color: C.outline, fontSize: 16 },
  list: { padding: 16 },
  
  // Desain Kartu (Card)
  card: { 
    flexDirection: 'row', backgroundColor: C.surface, padding: 20, 
    borderRadius: 16, marginBottom: 16, alignItems: 'center', 
    elevation: 3, shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  avatar: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: '#eff4ff', justifyContent: 'center', alignItems: 'center', marginRight: 16,
    borderWidth: 1.5, borderColor: '#dce9ff'
  },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: '#0d1c2e', marginBottom: 4 },
  status: { fontSize: 13, color: C.outline, fontWeight: '500' },
  actionIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0'
  }
});