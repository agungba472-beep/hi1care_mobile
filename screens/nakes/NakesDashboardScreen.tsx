import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../src/api';
import CustomHeader from '../../components/CustomHeader';

const C = {
  primary: '#012D1D', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  secondary: '#00A86B', secondaryContainer: '#b191fd',
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
      <CustomHeader title="Dashboard Tenaga Kesehatan" showBackButton={false} hideBell={false} />
      
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <View style={st.hero}>
          <View style={st.heroHeader}>
            <View>
              <Text style={st.heroGreeting}>Selamat datang,</Text>
              <Text style={st.heroTitle}>{dashboard?.profil?.user?.nama || 'Nakes'}!</Text>
              <Text style={st.heroSub}>{dashboard?.profil?.profesi || 'Tenaga Kesehatan'} WEAR</Text>
            </View>
            <View style={st.heroAvatar}>
              <MaterialIcons name="health-and-safety" size={32} color={C.primary} />
            </View>
          </View>
        </View>

        {/* Summary Cards Grid */}
        <Text style={st.sectionTitle}>Ringkasan Pasien</Text>
        <View style={st.gridRow}>
          <TouchableOpacity 
            style={st.gridCard} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NakesPatients')}
          >
            <View style={[st.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <MaterialIcons name="groups" size={24} color="#012D1D" />
            </View>
            <Text style={st.gridNum}>{dashboard?.statistik?.total_pasien || '0'}</Text>
            <Text style={st.gridLbl}>Total Pasien</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={st.gridCard} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NakesChatTab')}
          >
            <View style={[st.iconWrap, { backgroundColor: '#fef2f2' }]}>
              <MaterialIcons name="chat" size={24} color="#dc2626" />
            </View>
            <Text style={st.gridNum}>{dashboard?.statistik?.pesan_baru || '0'}</Text>
            <Text style={st.gridLbl}>Pesan Baru</Text>
          </TouchableOpacity>
        </View>

        <View style={st.gridRow}>
          <TouchableOpacity 
            style={st.gridCard} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NakesPatients')}
          >
            <View style={[st.iconWrap, { backgroundColor: '#fefce8' }]}>
              <MaterialIcons name="warning" size={24} color="#ca8a04" />
            </View>
            <Text style={st.gridNum}>{dashboard?.statistik?.perlu_perhatian || '0'}</Text>
            <Text style={st.gridLbl}>Perlu Perhatian</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={st.gridCard} 
            activeOpacity={0.8}
            onPress={() => {
              import('react-native').then(rn => {
                rn.Alert.alert('Jadwal Tugas', 'Fitur jadwal secara kalender sedang dalam tahap penyempurnaan.');
              });
            }}
          >
            <View style={[st.iconWrap, { backgroundColor: '#f0fdf4' }]}>
              <MaterialIcons name="event-available" size={24} color="#16a34a" />
            </View>
            <Text style={st.gridNum}>{dashboard?.statistik?.jadwal_hari_ini || '0'}</Text>
            <Text style={st.gridLbl}>Jadwal Hari Ini</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Consultations */}
        <Text style={[st.sectionTitle, { marginTop: 8 }]}>Permintaan Konsultasi Masuk</Text>
        {pending.length === 0 ? (
          <View style={st.emptyBox}>
            <MaterialIcons name="check-circle-outline" size={32} color={C.outline} />
            <Text style={st.emptyText}>Semua permintaan telah diproses.</Text>
          </View>
        ) : (
          pending.map((item) => (
            <View key={item.id} style={st.card}>
              <View style={st.cardRow}>
                <View style={st.cardAvatar}>
                  <MaterialIcons name="person" size={24} color={C.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={st.cardTitle}>{item.pasien?.master?.nama || item.pasien?.user?.nama}</Text>
                  <Text style={st.cardSub}>Jadwal: {item.tanggal} | {item.waktu}</Text>
                </View>
              </View>
              <View style={st.actionRow}>
                <TouchableOpacity style={[st.btn, st.btnOutline]} onPress={() => handleRespond(item.id, 'ditolak')}>
                  <Text style={[st.btnText, { color: C.error }]}>Tolak</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.btn, st.btnPrimary]} onPress={() => handleRespond(item.id, 'diterima')}>
                  <Text style={[st.btnText, { color: '#fff' }]}>Terima Jadwal</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Today's Schedule */}
        <Text style={[st.sectionTitle, { marginTop: 24 }]}>Jadwal Konsultasi Hari Ini</Text>
        {dashboard?.jadwal_hari_ini?.length === 0 ? (
          <View style={st.emptyBox}>
            <MaterialIcons name="event-busy" size={32} color={C.outline} />
            <Text style={st.emptyText}>Tidak ada jadwal hari ini.</Text>
          </View>
        ) : (
          dashboard?.jadwal_hari_ini?.map((item: any) => (
            <View key={item.id} style={st.card}>
              <View style={st.cardRow}>
                <View style={[st.cardAvatar, { backgroundColor: '#f0fdf4' }]}>
                  <MaterialIcons name="forum" size={24} color="#16a34a" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={st.cardTitle}>{item.pasien?.master?.nama || item.pasien?.user?.nama}</Text>
                  <Text style={st.cardSub}>Pukul {item.waktu} - {item.tanggal}</Text>
                </View>
                <TouchableOpacity 
                  style={st.chatCircleBtn} 
                  onPress={() => navigation.navigate('PatientChatRoom', { konsultasiId: item.id })}
                >
                  <MaterialIcons name="chat" size={20} color="#fff" />
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
  scroll: { padding: 20, paddingBottom: 40 },
  
  hero: { 
    backgroundColor: C.primary, padding: 24, borderRadius: 20, marginBottom: 24, 
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroGreeting: { fontSize: 14, color: '#d1dcff', marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: C.onPrimary, marginBottom: 4, letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: '#d1dcff', fontWeight: '500' },
  heroAvatar: { 
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff', 
    justifyContent: 'center', alignItems: 'center', elevation: 4 
  },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0d1c2e', marginBottom: 16 },
  
  gridRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  gridCard: { 
    flex: 1, backgroundColor: C.surface, padding: 16, borderRadius: 16, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#f1f5f9'
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridNum: { fontSize: 24, fontWeight: '800', color: '#0d1c2e', marginBottom: 4 },
  gridLbl: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  emptyBox: { 
    alignItems: 'center', justifyContent: 'center', padding: 32, 
    backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' 
  },
  emptyText: { color: '#64748b', marginTop: 12, fontSize: 14, fontWeight: '500' },
  
  card: { 
    backgroundColor: C.surface, padding: 20, borderRadius: 16, marginBottom: 16, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#f1f5f9'
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardAvatar: { 
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff4ff', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#dce9ff' 
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0d1c2e', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2' },
  btnPrimary: { backgroundColor: C.success, shadowColor: C.success, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  btnText: { fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },

  chatCircleBtn: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 
  }
});

export default NakesDashboardScreen;
