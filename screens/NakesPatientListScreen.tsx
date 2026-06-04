import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../src/api';

const C = { primary: '#0043a2', background: '#f8f9ff', surface: '#ffffff', outline: '#737784' };

const NakesPatientListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/nakes/patients');
      setPatients(res.data.data || []);
    } catch (e) { console.log(e); } 
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchPatients(); }, [fetchPatients]));

  const getStatusColor = (status: string) => {
    if (status === 'merah') return '#ba1a1a';
    if (status === 'kuning') return '#eab308';
    return '#16a34a'; // Hijau default
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={st.card} 
      onPress={() => navigation.navigate('NakesPatientDetailScreen', { patientId: item.id })}
    >
      <View style={st.row}>
        <View style={st.avatar}><MaterialIcons name="person" size={24} color="#fff" /></View>
        <View style={st.info}>
          <Text style={st.name}>{item.master?.nama || item.user?.nama}</Text>
          <Text style={st.reg}>No. Reg HIV: {item.master?.no_reg_hiv || '-'}</Text>
        </View>
        <View style={[st.badge, { backgroundColor: getStatusColor(item.kepatuhan_terbaru) }]}>
          <Text style={st.badgeTxt}>{item.kepatuhan_terbaru?.toUpperCase() || 'HIJAU'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}><Text style={st.headerT}>Monitoring Pasien</Text></View>
      {loading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={st.list}
          ListEmptyComponent={<Text style={st.empty}>Belum ada pasien yang Anda tangani.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { 
    padding: 16, paddingVertical: 20, backgroundColor: C.surface, 
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 
  },
  headerT: { fontSize: 20, fontWeight: '800', color: C.primary, letterSpacing: 0.5 },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', color: C.outline, marginTop: 40, fontSize: 16 },
  card: { 
    backgroundColor: C.surface, padding: 20, borderRadius: 16, marginBottom: 16, 
    elevation: 3, shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff4ff', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#dce9ff' 
  },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 17, fontWeight: '700', color: '#0d1c2e', marginBottom: 4 },
  reg: { fontSize: 13, color: C.outline, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }
});

export default NakesPatientListScreen;