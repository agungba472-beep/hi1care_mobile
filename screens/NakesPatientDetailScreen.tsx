import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import api from '../src/api';
import CustomHeader from '../components/CustomHeader';

const C = { primary: '#0043a2', background: '#f8f9ff', surface: '#ffffff', outline: '#737784' };

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
      <ScrollView contentContainerStyle={st.scroll}>
        
        {/* Info Box */}
        <View style={st.card}>
          <Text style={st.title}>{patient.master?.nama || patient.user?.nama}</Text>
          <Text style={st.text}>No Reg HIV: {patient.master?.no_reg_hiv || '-'}</Text>
          <Text style={st.text}>Tgl Lahir: {patient.master?.tgl_lahir || '-'}</Text>
          <Text style={st.text}>Status: <Text style={{fontWeight: 'bold'}}>{patient.status_kepatuhan?.toUpperCase()}</Text></Text>
          <TouchableOpacity
            style={st.chatBtn}
            onPress={() => navigation.navigate('NakesChat', {
              receiver_id: patient.user?.id ?? patientId,
            })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="chat" size={18} color="#fff" />
            <Text style={st.chatBtnText}>Chat Pasien</Text>
          </TouchableOpacity>
        </View>

        {/* Diary History */}
        <Text style={st.sectionTitle}>Catatan Diary Keluhan (Terbaru)</Text>
        {patient.diary?.length === 0 ? <Text style={st.empty}>Belum ada catatan diary.</Text> : 
          patient.diary?.map((d: any) => (
            <View key={d.id} style={st.logBox}>
              <Text style={st.logDate}>{d.tanggal}</Text>
              <Text style={st.logContent}><Text style={{fontWeight:'bold'}}>Kondisi:</Text> {d.kondisi}</Text>
              {d.gejala && <Text style={st.logContent}><Text style={{fontWeight:'bold'}}>Gejala:</Text> {d.gejala}</Text>}
            </View>
          ))
        }

        {/* Refill History */}
        <Text style={[st.sectionTitle, {marginTop: 20}]}>Riwayat Pengambilan Obat (Refill)</Text>
        {patient.refill?.length === 0 ? <Text style={st.empty}>Belum ada riwayat refill.</Text> : 
          patient.refill?.map((r: any) => (
            <View key={r.id} style={st.logBox}>
              <Text style={st.logContent}>
                <MaterialIcons name="local-pharmacy" size={14} color={C.primary} /> Siklus ke-{r.siklus_ke} ({r.tanggal_refill})
              </Text>
              <Text style={[st.logContent, {fontWeight: 'bold', color: r.status === 'menunggu' ? '#eab308' : '#16a34a'}]}>
                Status: {r.status}
              </Text>
            </View>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { padding: 16, backgroundColor: C.surface, elevation: 2, alignItems: 'center' },
  headerT: { fontSize: 18, fontWeight: 'bold', color: C.primary },
  scroll: { padding: 16 },
  card: { backgroundColor: C.surface, padding: 16, borderRadius: 12, marginBottom: 20, elevation: 1 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  text: { fontSize: 14, color: '#555', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: C.primary, marginBottom: 10 },
  empty: { color: C.outline, fontStyle: 'italic' },
  logBox: { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: C.primary, padding: 12, marginBottom: 10, borderRadius: 4, elevation: 1 },
  logDate: { fontSize: 12, color: C.outline, marginBottom: 4 },
  logContent: { fontSize: 14, color: '#333' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: '#0043a2', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});

export default NakesPatientDetailScreen;