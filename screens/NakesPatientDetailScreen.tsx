import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import api from '../src/api';
import CustomHeader from '../components/CustomHeader';

const C = { primary: '#012D1D', background: '#f8f9ff', surface: '#ffffff', outline: '#737784' };

const NakesPatientDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { patientId } = route.params;
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/nakes/patients/${patientId}`);
        setPatient(res.data.data);
      } catch (e) { console.log(e); } 
      finally { setLoading(false); }
    };
    fetchDetail();
  }, [patientId]));

  if (loading || !patient) return (
    <SafeAreaView style={st.safe}><ActivityIndicator size="large" color={C.primary} style={{marginTop: 50}} /></SafeAreaView>
  );

  return (
    <SafeAreaView style={st.safe}>
      <CustomHeader title="Rekam Medis Pasien" showBackButton={true} hideBell={true} />
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header Box */}
        <View style={st.heroCard}>
          <View style={st.heroRow}>
            <View style={st.heroAvatar}>
              <MaterialIcons name="person" size={40} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={st.heroTitle}>{patient.master?.nama || patient.user?.nama}</Text>
              <Text style={st.heroSub}>No Reg HIV: {patient.master?.no_reg_hiv || '-'}</Text>
            </View>
          </View>

          <View style={st.tagRow}>
            <View style={[st.tag, { backgroundColor: '#dcfce7' }]}>
              <MaterialIcons name="verified-user" size={14} color="#16a34a" />
              <Text style={[st.tagText, { color: '#16a34a' }]}>Status Kepatuhan: {patient.status_kepatuhan?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity 
              style={[st.tag, { backgroundColor: '#f1f5f9', marginLeft: 8 }]}
              onPress={() => Alert.alert('Riwayat Kepatuhan', 'Sedang memuat data log kepatuhan pasien dari database...')}
            >
              <MaterialIcons name="history" size={14} color={C.primary} />
              <Text style={[st.tagText, { color: C.primary }]}>Lihat Riwayat</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={st.chatBtn}
            onPress={() => navigation.navigate('NakesChat', {
              receiver_id: patient.user?.id ?? patientId,
            })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="chat" size={20} color="#fff" />
            <Text style={st.chatBtnText}>Mulai Chat Konsultasi</Text>
          </TouchableOpacity>
        </View>

        {/* Informasi Pribadi */}
        <Text style={st.sectionTitle}>Informasi Pribadi</Text>
        <View style={st.infoBox}>
          <View style={st.infoRow}>
            <MaterialIcons name="cake" size={20} color={C.primary} style={st.infoIcon} />
            <View>
              <Text style={st.infoLabel}>Tanggal Lahir</Text>
              <Text style={st.infoVal}>{patient.master?.tgl_lahir || '-'}</Text>
            </View>
          </View>
          <View style={st.infoDivider} />
          <View style={st.infoRow}>
            <MaterialIcons name="phone" size={20} color={C.primary} style={st.infoIcon} />
            <View>
              <Text style={st.infoLabel}>Nomor HP</Text>
              <Text style={st.infoVal}>{patient.user?.no_hp || '-'}</Text>
            </View>
          </View>
          <View style={st.infoDivider} />
          <View style={st.infoRow}>
            <MaterialIcons name="location-on" size={20} color={C.primary} style={st.infoIcon} />
            <View>
              <Text style={st.infoLabel}>Alamat Domisili</Text>
              <Text style={st.infoVal}>{patient.master?.alamat || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Data Fisik Grid */}
        <Text style={st.sectionTitle}>Data Fisik</Text>
        <View style={st.gridWrap}>
          <View style={st.gridBox}>
            <View style={st.gridIconWrap}><MaterialIcons name="monitor-weight" size={24} color="#012D1D" /></View>
            <Text style={st.gridVal}>{patient.master?.berat_badan ? `${patient.master.berat_badan} kg` : '-'}</Text>
            <Text style={st.gridLabel}>Berat Badan</Text>
          </View>

          <View style={st.gridBox}>
            <View style={st.gridIconWrap}><MaterialIcons name="height" size={24} color="#012D1D" /></View>
            <Text style={st.gridVal}>{patient.master?.tinggi_badan ? `${patient.master.tinggi_badan} cm` : '-'}</Text>
            <Text style={st.gridLabel}>Tinggi Badan</Text>
          </View>

          <View style={st.gridBox}>
            <View style={st.gridIconWrap}><MaterialIcons name={patient.master?.jenis_kelamin === 'P' ? 'female' : 'male'} size={24} color="#012D1D" /></View>
            <Text style={st.gridVal}>{patient.master?.jenis_kelamin === 'L' ? 'Laki-Laki' : patient.master?.jenis_kelamin === 'P' ? 'Perempuan' : '-'}</Text>
            <Text style={st.gridLabel}>Jenis Kelamin</Text>
          </View>
        </View>

        {patient.master?.berat_badan && patient.master?.tinggi_badan && (
          <View style={st.bmiBox}>
            <MaterialIcons name="health-and-safety" size={24} color="#16a34a" />
            <View style={{ marginLeft: 12 }}>
              <Text style={st.bmiLabel}>Body Mass Index (BMI)</Text>
              <Text style={st.bmiVal}>{(parseFloat(patient.master.berat_badan) / Math.pow(parseFloat(patient.master.tinggi_badan) / 100, 2)).toFixed(1)}</Text>
            </View>
          </View>
        )}

        {/* Diary History */}
        <Text style={[st.sectionTitle, {marginTop: 12}]}>Catatan Keluhan Terbaru</Text>
        {patient.diary?.length === 0 ? <Text style={st.empty}>Belum ada catatan diary.</Text> : 
          patient.diary?.map((d: any) => (
            <View key={d.id} style={st.logBox}>
              <View style={st.logHeader}>
                <MaterialIcons name="edit-note" size={18} color={C.primary} />
                <Text style={st.logDate}>{d.tanggal}</Text>
              </View>
              <Text style={st.logContent}><Text style={{fontWeight:'700', color: '#0d1c2e'}}>Kondisi:</Text> {d.kondisi}</Text>
              {d.gejala && <Text style={st.logContent}><Text style={{fontWeight:'700', color: '#0d1c2e'}}>Gejala:</Text> {d.gejala}</Text>}
            </View>
          ))
        }

        {/* Refill History */}
        <Text style={[st.sectionTitle, {marginTop: 24}]}>Riwayat Pengambilan Obat</Text>
        {patient.refill?.length === 0 ? <Text style={st.empty}>Belum ada riwayat refill.</Text> : 
          patient.refill?.map((r: any) => (
            <View key={r.id} style={st.refillBox}>
              <View style={st.refillIcon}>
                <MaterialIcons name="medication" size={24} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.refillTitle}>Siklus ke-{r.siklus_ke}</Text>
                <Text style={st.refillDate}>{r.tanggal_refill}</Text>
              </View>
              <View style={[st.refillBadge, { backgroundColor: r.status === 'menunggu' ? '#fef9c3' : '#dcfce7' }]}>
                <Text style={[st.refillBadgeTxt, { color: r.status === 'menunggu' ? '#ca8a04' : '#16a34a' }]}>
                  {r.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { padding: 20, paddingBottom: 40 },
  
  heroCard: { 
    backgroundColor: C.surface, padding: 24, borderRadius: 20, marginBottom: 24, 
    elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16,
    borderWidth: 1, borderColor: '#eff4ff'
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroAvatar: { 
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff4ff', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#dce9ff' 
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#0d1c2e', marginBottom: 4 },
  heroSub: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  
  tagRow: { flexDirection: 'row', marginBottom: 20 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  tagText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  chatBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, 
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6
  },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0d1c2e', marginBottom: 16, marginLeft: 4 },
  
  infoBox: { 
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 1
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff4ff', textAlign: 'center', textAlignVertical: 'center', marginRight: 12 },
  infoLabel: { fontSize: 12, color: '#64748b', fontWeight: '500', marginBottom: 2 },
  infoVal: { fontSize: 15, color: '#0d1c2e', fontWeight: '600' },
  infoDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  gridWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  gridBox: { 
    flex: 1, backgroundColor: C.surface, padding: 16, borderRadius: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6
  },
  gridIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridVal: { fontSize: 16, fontWeight: '800', color: '#0d1c2e', marginBottom: 4 },
  gridLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textAlign: 'center' },

  bmiBox: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, marginBottom: 24,
    borderWidth: 1, borderColor: '#dcfce7'
  },
  bmiLabel: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  bmiVal: { fontSize: 20, color: '#15803d', fontWeight: '800' },

  empty: { color: '#64748b', fontStyle: 'italic', marginLeft: 4, marginBottom: 16 },
  
  logBox: { 
    backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: C.primary, padding: 16, marginBottom: 12, 
    borderRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#f1f5f9'
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  logDate: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  logContent: { fontSize: 14, color: '#334155', marginBottom: 4, lineHeight: 20 },

  refillBox: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginBottom: 12, 
    borderRadius: 16, elevation: 1, borderWidth: 1, borderColor: '#f1f5f9'
  },
  refillIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff4ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  refillTitle: { fontSize: 15, fontWeight: '700', color: '#0d1c2e' },
  refillDate: { fontSize: 13, color: '#64748b', marginTop: 2 },
  refillBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  refillBadgeTxt: { fontSize: 10, fontWeight: '800' },
});

export default NakesPatientDetailScreen;