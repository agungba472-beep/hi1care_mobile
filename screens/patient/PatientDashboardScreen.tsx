import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import api from '../../src/api';

// ── Design Tokens (Tema Emerald/Mint Sesuai Referensi) ──
const C = {
  surface: '#f9f9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f3',
  surfaceContainerHigh: '#e7e8e7',
  onSurface: '#191c1c',
  onSurfaceVariant: '#414844',
  outline: '#717973',
  outlineVariant: '#c1c8c2',
  primary: '#012d1d',
  primaryContainer: '#1b4332',
  onPrimaryContainer: '#86af99',
  secondary: '#4c6452',
  onSecondary: '#ffffff',
  background: '#f9f9f8',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, gutter: 16, margin: 16 } as const;
const { width: SCREEN_W } = Dimensions.get('window');
const BENTO_HALF = (SCREEN_W - S.margin * 2 - S.gutter) / 2;
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// ── Circular Progress (Diperbarui dengan warna tema baru) ──
const CircularProgress: React.FC<{ percent: number; size: number; strokeWidth: number }> = ({
  percent, size, strokeWidth,
}) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: C.surfaceContainerHigh,
      }} />
      {/* Progress */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: C.primary,
        borderTopColor: offset > circumference * 0.75 ? C.surfaceContainerHigh : C.primary,
        transform: [{ rotate: '-90deg' }],
      }} />
      <MaterialIcons name="verified" size={28} color={C.primary} />
    </View>
  );
};

// ── Component ──
const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // LOGIKA ASLI ANDA (TIDAK DIUBAH SAMA SEKALI)
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [compliancePercent, setCompliancePercent] = useState(0);
  const [alarmsToday, setAlarmsToday] = useState<any[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/patient/dashboard');
      const d = res.data.data;
      setUserName(d.user?.nama || 'Pasien');

      // Persentase kepatuhan kumulatif bulan ini dari backend
      setCompliancePercent(d.kepatuhan_percentage || 0);

      setAlarmsToday(d.jadwal_hari_ini || []);
      setUnreadCount(d.unread_notif_count || 0);
    } catch (err: any) {
      console.log('[Dashboard] Error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const handleMarkAsTaken = (id?: number, scheduledTimeStr?: string) => {
    if (!id) return;
    
    // Validasi 15 menit
    if (scheduledTimeStr) {
      const now = new Date();
      const [schedHour, schedMin] = scheduledTimeStr.substring(0, 5).split(':').map(Number);
      
      const alarmDate = new Date();
      alarmDate.setHours(schedHour, schedMin, 0, 0);
      
      const diffMinutes = Math.floor((now.getTime() - alarmDate.getTime()) / 60000);
      
      if (diffMinutes > 15) {
        const msg = 'Maaf, Anda telah melewati batas waktu toleransi 15 menit dari jadwal minum obat Anda. Status Anda hari ini tercatat sebagai Terlewat.';
        if (Platform.OS === 'web') {
          window.alert('Waktu Terlewat\n\n' + msg);
        } else {
          Alert.alert('Waktu Terlewat', msg);
        }

        setTrackingLoading(true);
        api.post(`/patient/alarms/${id}/taken`, { status: 'terlewat' })
          .then(() => fetchDashboard())
          .catch(() => {})
          .finally(() => setTrackingLoading(false));
          
        return; // Block further execution
      }
    }

    if (Platform.OS === 'web') {
      const confirm = window.confirm('Apakah Anda yakin sudah meminum obat ini?');
      if (confirm) {
        setTrackingLoading(true);
        api.post(`/patient/alarms/${id}/taken`)
          .then(() => {
            window.alert('Berhasil ✅ Status obat hari ini telah dicatat sebagai diminum.');
            fetchDashboard();
          })
          .catch((err: any) => {
            window.alert('Gagal: ' + (err.response?.data?.message || 'Tidak dapat mencatat kepatuhan.'));
          })
          .finally(() => setTrackingLoading(false));
      }
    } else {
      Alert.alert(
        'Konfirmasi',
        'Apakah Anda yakin sudah meminum obat ini?',
        [
          { text: 'Batal', style: 'cancel' },
          { 
            text: 'Ya, Sudah Diminum', 
            onPress: async () => {
              setTrackingLoading(true);
              try {
                await api.post(`/patient/alarms/${id}/taken`);
                Alert.alert('Berhasil ✅', 'Status obat hari ini telah dicatat sebagai diminum.');
                fetchDashboard();
              } catch (err: any) {
                Alert.alert('Gagal', err.response?.data?.message || 'Tidak dapat mencatat kepatuhan.');
              } finally {
                setTrackingLoading(false);
              }
            }
          }
        ]
      );
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <SafeAreaView style={st.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={st.loadingText}>Memuat dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* ═══ TOP APP BAR ═══ */}
      {/* Menggunakan CustomHeader bawaan Anda, kita bungkus di view jika butuh styling luar */}
      <View style={st.headerWrapper}>
        <CustomHeader title="WEAR" />
      </View>

      {/* ═══ SCROLLABLE CONTENT (Desain Baru) ═══ */}
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ── Greeting ── */}
        <View style={st.greeting}>
          <View style={st.greetRow}>
            <Text style={st.greetName}>Hello, {userName}</Text>
            <Text style={st.greetDay}>Hari ini {HARI[new Date().getDay()]}</Text>
          </View>
          <Text style={st.greetSub}>
            Tetap konsisten dengan perawatan Anda hari ini. Anda luar biasa!
          </Text>
        </View>

        {/* ── BENTO GRID ── */}
        <View style={st.bentoGrid}>

          {/* Card: Kepatuhan Obat */}
          <View style={st.complianceCard}>
            <View style={{ gap: S.xs, flex: 1 }}>
              <Text style={st.labelUpper}>KEPATUHAN OBAT</Text>
              <Text style={st.complianceVal}>{compliancePercent}%</Text>
              <View style={st.trendRow}>
                <MaterialIcons name="trending-up" size={14} color={C.secondary} />
                <Text style={st.trendText}>Kumulatif bulan ini</Text>
              </View>
            </View>
            <CircularProgress percent={compliancePercent} size={80} strokeWidth={6} />
          </View>

          {/* Card: Resimen Hari Ini (Prioritas) */}
          <View style={st.regimenCard}>
            <View style={st.regimenHeader}>
              <View style={st.regimenTitleRow}>
                <View style={st.regimenIconWrap}>
                  <MaterialIcons name="medication" size={20} color="#ffffff" />
                </View>
                <Text style={st.regimenTitle}>Resimen Hari Ini</Text>
              </View>
              <View style={st.priorityBadge}>
                <Text style={st.priorityText}>PRIORITAS</Text>
              </View>
            </View>

            {alarmsToday.length > 0 ? (
              alarmsToday.map((alarm: any, idx: number) => {
                const isTaken = alarm.status === 'sudah' || alarm.status === 'diminum';
                return (
                    <View style={st.arvItem} key={alarm.id || idx}>
                    <View style={st.arvTop}>
                      <View style={st.arvIconWrap}>
                        <MaterialIcons name={isTaken ? 'check-circle' : 'schedule'} size={18} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <Text style={st.arvName} numberOfLines={1}>Minum Obat ARV 💊</Text>
                          {isTaken ? (
                            <View style={st.takenBadge}>
                              <Text style={st.takenText}>DIMINUM ✓</Text>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={st.arvBtn}
                              activeOpacity={0.8}
                              onPress={() => handleMarkAsTaken(alarm.id, alarm.jam || alarm.waktu)}
                              disabled={trackingLoading}
                            >
                              <Text style={st.arvBtnText}>
                                {trackingLoading ? '...' : 'MINUM'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={st.arvDose}>⏰ {(alarm.jam || alarm.waktu)?.substring(0, 5)} • Nada: {alarm.nada || alarm.nada_dering || 'standar'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={st.arvItem}>
                <View style={st.arvLeft}>
                  <View style={st.arvIconWrap}>
                    <MaterialIcons name="check-circle" size={18} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={st.arvName}>Tidak ada jadwal hari ini</Text>
                    <Text style={st.arvDose}>Atau data belum tersedia</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Row: Chat Nakes & Edukasi */}
          <View style={st.bentoRow}>
            {/* Chat Nakes */}
            <View style={[st.quickCard, { width: BENTO_HALF }]}>
              <MaterialIcons name="forum" size={28} color={C.secondary} />
              <View>
                <Text style={st.quickTitle}>Chat Nakes</Text>
                <Text style={st.quickSub}>Dukungan profesional 24/7</Text>
              </View>
              <TouchableOpacity
                style={[st.quickBtn, { backgroundColor: C.secondary }]}
                onPress={() => navigation.navigate('Chat' as never)}
                activeOpacity={0.85}
              >
                <Text style={st.quickBtnText}>Chat Sekarang</Text>
              </TouchableOpacity>
            </View>

            {/* Edukasi */}
            <View style={[st.quickCard, { width: BENTO_HALF }]}>
              <MaterialIcons name="menu-book" size={28} color={C.primary} />
              <View>
                <Text style={st.quickTitle}>Edukasi</Text>
                <Text style={st.quickSub}>Tips & sumber daya</Text>
              </View>
              <TouchableOpacity
                style={[st.quickBtn, { backgroundColor: C.primary }]}
                onPress={() => navigation.navigate('Edukasi' as never)}
                activeOpacity={0.85}
              >
                <Text style={st.quickBtnText}>Jelajahi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Catatan Harian (Diary) */}
          <View style={st.faskesCard}>
            <View style={st.faskesLeft}>
              <MaterialIcons name="edit-note" size={32} color={C.secondary} />
              <View>
                <Text style={st.quickTitle}>Catatan Harian</Text>
                <Text style={st.quickSub}>Catat kondisi & keluhanmu</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[st.quickBtn, { backgroundColor: C.secondary, paddingHorizontal: 20, marginTop: 0 }]}
              onPress={() => navigation.navigate('Diary' as never)}
              activeOpacity={0.85}
            >
              <Text style={st.quickBtnText}>Tulis</Text>
            </TouchableOpacity>
          </View>

          {/* Cari Faskes */}
          <View style={[st.faskesCard, { backgroundColor: C.surfaceContainerHigh }]}>
            <View style={st.faskesLeft}>
              <MaterialIcons name="local-hospital" size={28} color={C.primary} />
              <View>
                <Text style={st.quickTitle}>Fasilitas Kesehatan</Text>
                <Text style={st.quickSub}>Temukan klinik terdekat</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[st.quickBtn, { backgroundColor: C.primary, paddingHorizontal: 20, marginTop: 0 }]}
              onPress={() => navigation.navigate('HealthFacility' as never)}
              activeOpacity={0.85}
            >
              <Text style={st.quickBtnText}>Cari</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ── Tips Kesehatan Harian ── */}
        <View style={st.tipsSection}>
          <View style={st.tipsTitleRow}>
            <Text style={st.tipsTitle}>Tips Kesehatan Harian</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Edukasi' as never)}>
              <Text style={st.tipsLink}>LIHAT SEMUA</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={st.articleCard} activeOpacity={0.95} onPress={() => navigation.navigate('Edukasi' as never)}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80' }}
              style={st.articleImg}
              resizeMode="cover"
            />
            <View style={st.articleOverlay}>
              <Text style={st.articleTitle}>Managing Fatigue: Small Steps for Big Changes</Text>
              <Text style={st.articleMeta}>3 min read • Nutrition & Wellness</Text>
            </View>
          </TouchableOpacity>
        </View>


        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>


    </SafeAreaView>
  );
};

// ── Styles (Tema Baru) ──
const st = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: S.md,
    fontSize: 16,
    color: C.outline,
    fontFamily: 'System',
  },
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  headerWrapper: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainerHigh,
  },
  scroll: {
    paddingHorizontal: S.margin,
    paddingTop: S.lg,
  },
  greeting: {
    marginBottom: S.lg,
  },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  greetName: {
    fontSize: 24,
    fontWeight: '700',
    color: C.onSurface,
  },
  greetDay: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
  },
  greetSub: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 20,
  },
  bentoGrid: {
    gap: S.gutter,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: S.gutter,
  },
  complianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  labelUpper: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.outline,
  },
  complianceVal: {
    fontSize: 36,
    fontWeight: '700',
    color: C.primary,
    marginVertical: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
  },
  regimenCard: {
    backgroundColor: C.primaryContainer,
    borderRadius: 16,
    padding: 20,
    gap: S.md,
    shadowColor: C.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  regimenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regimenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regimenIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    borderRadius: 8,
  },
  regimenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  priorityBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#ffffff',
  },
  arvItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: S.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  arvTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  arvLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  arvIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arvName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  arvDose: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  arvBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  arvBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primaryContainer,
  },
  takenBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)'
  },
  takenText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.3,
  },
  quickCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    justifyContent: 'space-between',
    minHeight: 150,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
    marginTop: S.sm,
  },
  quickSub: {
    fontSize: 10,
    color: C.outline,
    marginTop: 2,
  },
  quickBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: S.md,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  faskesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  faskesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tipsSection: {
    marginTop: S.lg,
    marginBottom: S.md,
  },
  tipsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onSurface,
  },
  tipsLink: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },
  articleCard: {
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  articleImg: {
    width: '100%',
    height: '100%',
  },
  articleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: S.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  articleMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});

export default DashboardScreen;
