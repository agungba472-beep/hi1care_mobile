import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import api from '../../src/api';
import CustomHeader from '../../components/CustomHeader';

const C = { primary: '#012D1D', background: '#f8f9ff', surface: '#ffffff', outline: '#737784' };

const NakesPatientDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { patientId } = route.params;
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showKepatuhanModal, setShowKepatuhanModal] = useState(false);
  const [riwayatRegimen, setRiwayatRegimen] = useState<any[]>([]);
  const [riwayatIo, setRiwayatIo] = useState<any[]>([]);

  // Form States
  const [masterKlinis, setMasterKlinis] = useState<{obats: any[], ios: any[]}>({obats: [], ios: []});
  const [showRegimenModal, setShowRegimenModal] = useState(false);
  const [showIoModal, setShowIoModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rForm, setRForm] = useState({ master_obat_id: '', tanggal_mulai: new Date().toISOString().split('T')[0], alasan_ganti: '' });
  const [ioForm, setIoForm] = useState({ master_io_id: '', nama_io_baru: '', tanggal_diagnosis: new Date().toISOString().split('T')[0], status: 'aktif', tanggal_sembuh: '', catatan: '' });

  useFocusEffect(useCallback(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/nakes/patients/${patientId}`);
        setPatient(res.data.data);

        const regimenRes = await api.get(`/nakes/patients/${patientId}/riwayat-regimen`);
        if (regimenRes.data && regimenRes.data.data) {
          setRiwayatRegimen(regimenRes.data.data);
        }

        const ioRes = await api.get(`/nakes/patients/${patientId}/riwayat-io`);
        if (ioRes.data && ioRes.data.data) {
          setRiwayatIo(ioRes.data.data);
        }

        const masterRes = await api.get(`/nakes/master-klinis`);
        if (masterRes.data && masterRes.data.data) {
          setMasterKlinis(masterRes.data.data);
        }
      } catch (e) { console.log(e); } 
      finally { setLoading(false); }
    };
    fetchDetail();
  }, [patientId]));

  if (loading || !patient) return (
    <SafeAreaView style={st.safe}><ActivityIndicator size="large" color={C.primary} style={{marginTop: 50}} /></SafeAreaView>
  );

  const handleSaveRegimen = async () => {
    if (!rForm.master_obat_id || !rForm.tanggal_mulai) return Alert.alert('Error', 'Obat dan Tanggal wajib diisi');
    setSubmitting(true);
    try {
      await api.post(`/nakes/patients/${patientId}/riwayat-regimen`, rForm);
      Alert.alert('Sukses', 'Regimen berhasil ditambahkan');
      setShowRegimenModal(false);
      setRForm({ master_obat_id: '', tanggal_mulai: new Date().toISOString().split('T')[0], alasan_ganti: '' });
      const res = await api.get(`/nakes/patients/${patientId}/riwayat-regimen`);
      setRiwayatRegimen(res.data.data);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Gagal menyimpan regimen'); }
    finally { setSubmitting(false); }
  };

  const handleSaveIo = async () => {
    if (!ioForm.master_io_id || !ioForm.tanggal_diagnosis) return Alert.alert('Error', 'IO dan Tanggal wajib diisi');
    if (ioForm.master_io_id === 'lainnya' && !ioForm.nama_io_baru) return Alert.alert('Error', 'Nama IO Baru wajib diisi');
    setSubmitting(true);
    try {
      await api.post(`/nakes/patients/${patientId}/riwayat-io`, ioForm);
      Alert.alert('Sukses', 'Riwayat IO berhasil ditambahkan');
      setShowIoModal(false);
      setIoForm({ master_io_id: '', nama_io_baru: '', tanggal_diagnosis: new Date().toISOString().split('T')[0], status: 'aktif', tanggal_sembuh: '', catatan: '' });
      const res = await api.get(`/nakes/patients/${patientId}/riwayat-io`);
      setRiwayatIo(res.data.data);
      // Refresh master klinis to get newly added IO
      const masterRes = await api.get(`/nakes/master-klinis`);
      if (masterRes.data && masterRes.data.data) setMasterKlinis(masterRes.data.data);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Gagal menyimpan IO'); }
    finally { setSubmitting(false); }
  };

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
            <View style={[st.tag, { backgroundColor: '#dcfce7', flexShrink: 1 }]}>
              <MaterialIcons name="verified-user" size={14} color="#16a34a" />
              <Text style={[st.tagText, { color: '#16a34a', flexShrink: 1 }]} numberOfLines={1}>Status Kepatuhan: {patient.status_kepatuhan?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity 
              style={[st.tag, { backgroundColor: '#f1f5f9' }]}
              onPress={() => setShowKepatuhanModal(true)}
            >
              <MaterialIcons name="history" size={14} color={C.primary} />
              <Text style={[st.tagText, { color: C.primary }]}>Lihat Riwayat</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={st.chatBtn}
            onPress={() => navigation.navigate('NakesTabs', { screen: 'NakesChatTab' })}
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

        {/* Regimen dan IO */}
        <Text style={[st.sectionTitle, {marginTop: 12}]}>Data Klinis Saat Ini</Text>
        <View style={st.infoBox}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
            <Text style={{fontWeight: '700', fontSize: 14, color: C.outline}}>Regimen ARV Aktif</Text>
            <TouchableOpacity onPress={() => setShowRegimenModal(true)} style={st.addBtnSm}>
              <MaterialIcons name="add" size={16} color="#fff" />
              <Text style={st.addBtnSmTxt}>Tambah</Text>
            </TouchableOpacity>
          </View>
          {riwayatRegimen.length > 0 && !riwayatRegimen[0].tanggal_selesai ? (
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
              <MaterialIcons name="medication" size={24} color={C.primary} style={{marginRight: 12}} />
              <View>
                <Text style={{fontWeight: '700', fontSize: 16, color: C.primary}}>{riwayatRegimen[0].master_obat?.kode_regimen || 'Regimen Aktif'}</Text>
                <Text style={{fontSize: 13, color: '#64748b'}}>Mulai: {riwayatRegimen[0].tanggal_mulai}</Text>
              </View>
            </View>
          ) : (
            <Text style={{fontSize: 14, color: '#64748b', fontStyle: 'italic', marginBottom: 16}}>Tidak ada regimen aktif</Text>
          )}

          <View style={st.infoDivider} />
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8}}>
            <Text style={{fontWeight: '700', fontSize: 14, color: C.outline}}>Riwayat Infeksi Oportunistik (IO)</Text>
            <TouchableOpacity onPress={() => setShowIoModal(true)} style={st.addBtnSm}>
              <MaterialIcons name="add" size={16} color="#fff" />
              <Text style={st.addBtnSmTxt}>Tambah</Text>
            </TouchableOpacity>
          </View>
          {riwayatIo.length > 0 ? (
            riwayatIo.map((io, idx) => (
              <View key={io.id || idx} style={{flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6}}>
                <MaterialIcons name="coronavirus" size={20} color={io.status === 'aktif' ? '#ef4444' : '#16a34a'} style={{marginRight: 12, marginTop: 2}} />
                <View style={{flex: 1}}>
                  <Text style={{fontWeight: '700', fontSize: 15, color: '#0d1c2e'}}>{io.master_io?.nama_io || 'IO'}</Text>
                  <Text style={{fontSize: 13, color: '#64748b'}}>Diagnosis: {io.tanggal_diagnosis} - Status: {io.status === 'aktif' ? 'Aktif' : 'Sembuh'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{fontSize: 14, color: '#64748b', fontStyle: 'italic'}}>Belum ada riwayat IO</Text>
          )}
        </View>

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

      {/* MODAL KEPATUHAN */}
      <Modal visible={showKepatuhanModal} transparent={true} animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Riwayat Kepatuhan Obat</Text>
              <TouchableOpacity onPress={() => setShowKepatuhanModal(false)}>
                <MaterialIcons name="close" size={24} color={C.outline} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {patient.kepatuhan?.length === 0 ? (
                <Text style={st.modalEmpty}>Belum ada log kepatuhan dicatat.</Text>
              ) : (
                patient.kepatuhan?.map((k: any) => {
                  const isDiminum = k.status === 'diminum';
                  return (
                    <View key={k.id} style={st.logItem}>
                      <View style={[st.logIcon, { backgroundColor: isDiminum ? '#dcfce7' : '#fee2e2' }]}>
                        <MaterialIcons name={isDiminum ? "check" : "close"} size={20} color={isDiminum ? '#16a34a' : '#ef4444'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.logStatusText}>
                          {isDiminum ? 'Diminum' : 'Dilewatkan / Telat'}
                        </Text>
                        <Text style={st.logTimeText}>
                          {new Date(k.last_update).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          {' - '}
                          {new Date(k.last_update).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL TAMBAH REGIMEN */}
      <Modal visible={showRegimenModal} transparent={true} animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, {maxHeight: '90%'}]}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Tambah Riwayat Regimen</Text>
              <TouchableOpacity onPress={() => setShowRegimenModal(false)}>
                <MaterialIcons name="close" size={24} color={C.outline} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={st.inputLabel}>Pilih Obat / Regimen</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
                {masterKlinis.obats.map(obat => (
                  <TouchableOpacity 
                    key={obat.id} 
                    style={[st.pillBtn, rForm.master_obat_id === obat.id && st.pillBtnActive]}
                    onPress={() => setRForm({...rForm, master_obat_id: obat.id})}
                  >
                    <Text style={[st.pillBtnTxt, rForm.master_obat_id === obat.id && st.pillBtnTxtActive]}>{obat.kode_regimen}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={st.inputLabel}>Tanggal Mulai (YYYY-MM-DD)</Text>
              <TextInput style={st.input} value={rForm.tanggal_mulai} onChangeText={t => setRForm({...rForm, tanggal_mulai: t})} placeholder="Contoh: 2026-07-20" />

              <Text style={st.inputLabel}>Alasan Ganti (Opsional)</Text>
              <TextInput style={[st.input, {height: 80}]} multiline value={rForm.alasan_ganti} onChangeText={t => setRForm({...rForm, alasan_ganti: t})} placeholder="Misal: Efek samping" />

              <TouchableOpacity style={st.submitBtn} onPress={handleSaveRegimen} disabled={submitting}>
                <Text style={st.submitBtnTxt}>{submitting ? 'Menyimpan...' : 'Simpan Regimen'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL TAMBAH IO */}
      <Modal visible={showIoModal} transparent={true} animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, {maxHeight: '90%'}]}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Tambah Riwayat IO</Text>
              <TouchableOpacity onPress={() => setShowIoModal(false)}>
                <MaterialIcons name="close" size={24} color={C.outline} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={st.inputLabel}>Infeksi Oportunistik</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16}}>
                {masterKlinis.ios.map(io => (
                  <TouchableOpacity 
                    key={io.id} 
                    style={[st.pillBtn, ioForm.master_io_id === io.id && st.pillBtnActive]}
                    onPress={() => setIoForm({...ioForm, master_io_id: io.id})}
                  >
                    <Text style={[st.pillBtnTxt, ioForm.master_io_id === io.id && st.pillBtnTxtActive]}>{io.nama_io}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={[st.pillBtn, ioForm.master_io_id === 'lainnya' && st.pillBtnActive]}
                  onPress={() => setIoForm({...ioForm, master_io_id: 'lainnya'})}
                >
                  <Text style={[st.pillBtnTxt, ioForm.master_io_id === 'lainnya' && st.pillBtnTxtActive]}>Lainnya (Input Manual)</Text>
                </TouchableOpacity>
              </View>

              {ioForm.master_io_id === 'lainnya' && (
                <View>
                  <Text style={st.inputLabel}>Nama IO Baru</Text>
                  <TextInput style={st.input} value={ioForm.nama_io_baru} onChangeText={t => setIoForm({...ioForm, nama_io_baru: t})} placeholder="Masukkan nama infeksi..." />
                </View>
              )}

              <Text style={st.inputLabel}>Tanggal Diagnosis (YYYY-MM-DD)</Text>
              <TextInput style={st.input} value={ioForm.tanggal_diagnosis} onChangeText={t => setIoForm({...ioForm, tanggal_diagnosis: t})} placeholder="Contoh: 2026-07-20" />

              <Text style={st.inputLabel}>Status</Text>
              <View style={{flexDirection: 'row', gap: 12, marginBottom: 16}}>
                <TouchableOpacity style={[st.pillBtn, ioForm.status === 'aktif' && st.pillBtnActive]} onPress={() => setIoForm({...ioForm, status: 'aktif'})}>
                  <Text style={[st.pillBtnTxt, ioForm.status === 'aktif' && st.pillBtnTxtActive]}>Aktif</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.pillBtn, ioForm.status === 'sembuh' && st.pillBtnActive]} onPress={() => setIoForm({...ioForm, status: 'sembuh'})}>
                  <Text style={[st.pillBtnTxt, ioForm.status === 'sembuh' && st.pillBtnTxtActive]}>Sembuh</Text>
                </TouchableOpacity>
              </View>

              {ioForm.status === 'sembuh' && (
                <View>
                  <Text style={st.inputLabel}>Tanggal Sembuh (YYYY-MM-DD)</Text>
                  <TextInput style={st.input} value={ioForm.tanggal_sembuh} onChangeText={t => setIoForm({...ioForm, tanggal_sembuh: t})} placeholder="Contoh: 2026-07-20" />
                </View>
              )}

              <Text style={st.inputLabel}>Catatan Tambahan (Opsional)</Text>
              <TextInput style={[st.input, {height: 80}]} multiline value={ioForm.catatan} onChangeText={t => setIoForm({...ioForm, catatan: t})} placeholder="Tulis catatan..." />

              <TouchableOpacity style={st.submitBtn} onPress={handleSaveIo} disabled={submitting}>
                <Text style={st.submitBtnTxt}>{submitting ? 'Menyimpan...' : 'Simpan IO'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
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

  // Modal Kepatuhan
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0d1c2e' },
  modalEmpty: { color: C.outline, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  logIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logStatusText: { fontSize: 15, fontWeight: '700', color: '#0d1c2e' },
  logTimeText: { fontSize: 13, color: '#64748b' },

  addBtnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  addBtnSmTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, color: '#0f172a' },
  
  pillBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8, marginBottom: 8 },
  pillBtnActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  pillBtnTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  pillBtnTxtActive: { color: '#2563eb' },

  submitBtn: { backgroundColor: C.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 12 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default NakesPatientDetailScreen;
