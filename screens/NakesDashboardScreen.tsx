import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../src/api';

const C = {
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  secondary: '#6b4ab2', secondaryContainer: '#b191fd',
  background: '#f8f9ff', surface: '#ffffff', outline: '#737784',
  error: '#ba1a1a', success: '#16a34a', warning: '#eab308'
};

const NakesDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, pendRes] = await Promise.all([
        api.get('/nakes/dashboard'),
        api.get('/nakes/consultations/pending')
      ]);
      setDashboard(dashRes.data.data);
      setPending(pendRes.data.data || []);
    } catch (error) {
      console.log('Error fetching Nakes Dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleRespond = async (id: number, status: 'diterima' | 'ditolak') => {
    const isWeb = Platform.OS === 'web';
    const msg = `Apakah Anda yakin ingin ${status === 'diterima' ? 'MENERIMA' : 'MENOLAK'} konsultasi ini?`;
    
    if (isWeb) {
      if (window.confirm(msg)) {
        try {
          await api.post(`/nakes/consultations/${id}/respond`, { status });
          window.alert(`Konsultasi ${status}`);
          fetchData();
        } catch (e) { window.alert('Gagal memperbarui status'); }
      }
    } else {
      // Import Alert from react-native if used here (handled via global alert for simplicity in this example)
      try {
        await api.post(`/nakes/consultations/${id}/respond`, { status });
        alert(`Konsultasi berhasil ${status}`);
        fetchData();
      } catch (e) { alert('Gagal memperbarui status'); }
    }
  };

  if (loading) return (
    <SafeAreaView style={st.center}><ActivityIndicator size="large" color={C.primary} /><Text>Memuat Dashboard...</Text></SafeAreaView>
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      <View style={st.header}><Text style={st.headerT}>Dashboard Tenaga Kesehatan</Text></View>
      
      <ScrollView contentContainerStyle={st.scroll}>
        {/* Welcome Card */}
        <View style={st.hero}>
          <Text style={st.heroTitle}>Halo, {dashboard?.profil?.user?.nama || 'Nakes'}!</Text>
          <Text style={st.heroSub}>{dashboard?.profil?.profesi || 'Tenaga Kesehatan'}</Text>
          
          <View style={st.statsRow}>
            <View style={st.statBox}>
              <Text style={st.statNum}>{dashboard?.statistik?.menunggu_persetujuan || 0}</Text>
              <Text style={st.statLbl}>Menunggu</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statNum}>{dashboard?.statistik?.jadwal_hari_ini || 0}</Text>
              <Text style={st.statLbl}>Jadwal Hari Ini</Text>
            </View>
          </View>
        </View>

        {/* Pending Consultations */}
        <Text style={st.sectionTitle}>Permintaan Konsultasi Masuk</Text>
        {pending.length === 0 ? (
          <Text style={st.emptyText}>Tidak ada permintaan baru.</Text>
        ) : (
          pending.map((item) => (
            <View key={item.id} style={st.card}>
              <View style={st.cardRow}>
                <MaterialIcons name="person" size={40} color={C.outline} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.cardTitle}>{item.pasien?.master?.nama || item.pasien?.user?.nama}</Text>
                  <Text style={st.cardSub}>Jadwal: {item.tanggal} | {item.waktu}</Text>
                </View>
              </View>
              <View style={st.actionRow}>
                <TouchableOpacity style={[st.btn, { backgroundColor: C.error }]} onPress={() => handleRespond(item.id, 'ditolak')}>
                  <Text style={st.btnText}>Tolak</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.btn, { backgroundColor: C.success }]} onPress={() => handleRespond(item.id, 'diterima')}>
                  <Text style={st.btnText}>Terima</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Today's Schedule */}
        <Text style={[st.sectionTitle, { marginTop: 20 }]}>Jadwal Konsultasi Hari Ini</Text>
        {dashboard?.jadwal_hari_ini?.length === 0 ? (
          <Text style={st.emptyText}>Tidak ada jadwal hari ini.</Text>
        ) : (
          dashboard?.jadwal_hari_ini?.map((item: any) => (
            <View key={item.id} style={st.card}>
              <View style={st.cardRow}>
                <MaterialIcons name="event-available" size={30} color={C.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.cardTitle}>{item.pasien?.master?.nama || item.pasien?.user?.nama}</Text>
                  <Text style={st.cardSub}>Pukul: {item.waktu}</Text>
                </View>
                <TouchableOpacity style={[st.btn, { backgroundColor: C.primary }]} onPress={() => navigation.navigate('NakesChatScreen', { chatId: item.id })}>
                  <Text style={st.btnText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  safe: { flex: 1, backgroundColor: C.background },
  header: { padding: 16, backgroundColor: C.surface, elevation: 2, alignItems: 'center' },
  headerT: { fontSize: 18, fontWeight: 'bold', color: C.primary },
  scroll: { padding: 16 },
  hero: { backgroundColor: C.primaryContainer, padding: 20, borderRadius: 12, marginBottom: 20 },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: C.onPrimary },
  heroSub: { fontSize: 14, color: '#d1dcff', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 8, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: 'bold', color: C.onPrimary },
  statLbl: { fontSize: 12, color: C.onPrimary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  emptyText: { color: C.outline, fontStyle: 'italic', marginBottom: 20 },
  card: { backgroundColor: C.surface, padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardSub: { fontSize: 13, color: C.outline },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});

export default NakesDashboardScreen;