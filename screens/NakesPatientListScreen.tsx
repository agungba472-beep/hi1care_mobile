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
  header: { padding: 16, backgroundColor: C.surface, elevation: 2, alignItems: 'center' },
  headerT: { fontSize: 18, fontWeight: 'bold', color: C.primary },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: C.outline, marginTop: 20 },
  card: { backgroundColor: C.surface, padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  reg: { fontSize: 12, color: C.outline },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 10, fontWeight: 'bold', color: '#fff' }
});

export default NakesPatientListScreen;