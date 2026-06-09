import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../src/api';
import CustomHeader from '../components/CustomHeader';

const C = { primary: '#012D1D', background: '#f8f9ff', surface: '#ffffff', outline: '#737784' };

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

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'merah':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'kuning':
        return { bg: '#fef9c3', text: '#ca8a04' };
      default:
        return { bg: '#dcfce7', text: '#16a34a' }; // Hijau default
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = item.kepatuhan_terbaru || 'hijau';
    const badgeStyle = getBadgeStyle(status);

    return (
      <TouchableOpacity 
        style={st.card} 
        onPress={() => navigation.navigate('NakesPatientDetailScreen', { patientId: item.id })}
        activeOpacity={0.8}
      >
        <View style={st.row}>
          <View style={st.avatar}>
            <MaterialIcons name="person" size={24} color={C.primary} />
          </View>
          <View style={st.info}>
            <Text style={st.name}>{item.master?.nama || item.user?.nama}</Text>
            <Text style={st.reg}>No. Reg HIV: {item.master?.no_reg_hiv || '-'}</Text>
          </View>
          <View style={[st.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[st.badgeTxt, { color: badgeStyle.text }]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={st.safe}>
      <CustomHeader title="Monitoring Pasien" showBackButton={false} hideBell={false} />
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingTxt}>Memuat data pasien...</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={st.centerEmpty}>
              <MaterialIcons name="group-off" size={48} color={C.outline} />
              <Text style={st.empty}>Belum ada pasien yang Anda tangani.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt: { marginTop: 12, color: C.outline, fontSize: 14, fontWeight: '500' },
  centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  header: { 
    padding: 16, paddingVertical: 20, backgroundColor: C.surface, 
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 
  },
  headerT: { fontSize: 20, fontWeight: '800', color: C.primary, letterSpacing: 0.5 },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', color: C.outline, marginTop: 16, fontSize: 16, fontWeight: '500' },
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
  info: { flex: 1, marginLeft: 16, marginRight: 8 },
  name: { fontSize: 17, fontWeight: '700', color: '#0d1c2e', marginBottom: 4 },
  reg: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }
});

export default NakesPatientListScreen;