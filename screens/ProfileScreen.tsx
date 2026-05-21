import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToLogin } from '../src/navigationRef';
import api from '../src/api';
import * as ImagePicker from 'expo-image-picker';

// ── Design Tokens ──
const C = {
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d5e3fc',
  surfaceVariant: '#d5e3fc',
  onSurface: '#0d1c2e',
  onSurfaceVariant: '#434652',
  outline: '#737784',
  outlineVariant: '#c3c6d5',
  primary: '#0043a2',
  onPrimary: '#ffffff',
  primaryContainer: '#2a5cbe',
  primaryFixed: '#dae2ff',
  onPrimaryFixed: '#001946',
  secondary: '#6b4ab2',
  onSecondary: '#ffffff',
  secondaryContainer: '#b191fd',
  onSecondaryContainer: '#44208a',
  secondaryFixed: '#eaddff',
  onSecondaryFixed: '#24005b',
  tertiary: '#42495c',
  error: '#ba1a1a',
  background: '#f8f9ff',
  onBackground: '#0d1c2e',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

// ── Sub-Components ──
const AdherenceCircle: React.FC<{ percent: number }> = ({ percent }) => (
  <View style={st.circleWrap}>
    <View style={st.circleTrack} />
    <View style={[st.circleTrack, st.circleFill]} />
    <Text style={st.circleText}>{percent}%</Text>
  </View>
);

const ToggleSwitch: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => (
  <TouchableOpacity
    style={[st.toggleTrack, value && st.toggleTrackOn]}
    onPress={onToggle}
    activeOpacity={0.7}
  >
    <View style={[st.toggleThumb, value && st.toggleThumbOn]} />
  </TouchableOpacity>
);

const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={st.infoField}>
    <Text style={st.infoLabel}>{label}</Text>
    <Text style={st.infoValue}>{value}</Text>
  </View>
);

// ── Component ──
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [hiddenNotif, setHiddenNotif] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // ── Baca setting biometrik dari AsyncStorage ──
  useEffect(() => {
    const loadBiometricSetting = async () => {
      try {
        const stored = await AsyncStorage.getItem('biometricEnabled');
        setIsBiometricEnabled(stored === 'true');
      } catch (e) {
        console.log('[Profile] Gagal baca setting biometrik:', e);
      }
    };
    loadBiometricSetting();
  }, []);

  // ── Toggle & simpan ke AsyncStorage ──
  const toggleBiometric = async () => {
    const newValue = !isBiometricEnabled;
    setIsBiometricEnabled(newValue);
    await AsyncStorage.setItem('biometricEnabled', newValue ? 'true' : 'false');
  };

  // Profile data from API
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('Pasien');
  const [adherencePercent, setAdherencePercent] = useState(0);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('-');
  const [regNumber, setRegNumber] = useState('-');
  const [careLocation, setCareLocation] = useState('-');
  const [regimenName, setRegimenName] = useState('-');
  const [regimenDose, setRegimenDose] = useState('-');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Flag to skip overwriting the photo from API right after a local upload
  const justUploadedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      if (!initialLoadDone) setLoading(true);
      const res = await api.get('/profile');
      const user = res.data.user;
      if (!user) return;

      setName(user.nama || 'Pasien');
      setFullName(user.nama || '-');
      setPatientId(user.id ? `HI-${user.id}` : '-');

      // Jangan timpa foto lokal jika baru saja upload (hindari race condition)
      if (!justUploadedRef.current) {
        setProfilePhoto(user.photo_url || null);
      }

      const pasien = user.pasien;
      if (pasien) {
        setStatus(pasien.status_kepatuhan || 'Aktif');
        setCategory(pasien.kategori || 'Pasien Rutin');
        setCareLocation(pasien.lokasi_perawatan || '-');

        const kep = pasien.kepatuhan || [];
        if (kep.length > 0) {
          const diminum = kep.filter((k: any) => k.status === 'diminum').length;
          setAdherencePercent(Math.round((diminum / kep.length) * 100));
        }

        const master = pasien.master;
        if (master) {
          setRegNumber(master.no_reg_hiv || master.no_reg || '-');
          setBirthDate(master.tanggal_lahir || '-');
          setRegimenName(master.regimen || '-');
          setRegimenDose(master.dosis || 'Sekali Sehari');
        }
      }
    } catch (err: any) {
      console.log('[Profile] Error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [initialLoadDone]);

  useFocusEffect(useCallback(() => {
    fetchProfile();
  }, [fetchProfile]));

  // ── Upload foto ke server (kompatibel Web & Mobile) ──
  const uploadPhotoToServer = async (uri: string) => {
    const formData = new FormData();

    try {
      if (Platform.OS === 'web') {
        // ── WEB: Blob URL harus di-fetch dulu menjadi Blob asli ──
        console.log('[Photo] Platform Web terdeteksi, converting blob URI...');
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('photo', blob, 'photo.jpg');
      } else {
        // ── MOBILE: Format { uri, name, type } untuk React Native ──
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.([\w]+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri, name: filename, type } as any);
      }

      console.log('[Photo] Mengunggah foto ke server...');
      const res = await api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('[Photo] Upload berhasil:', res.data);
      Alert.alert('Berhasil ✅', 'Foto profil berhasil diperbarui.');
      // Update photo dari server response jika tersedia
      if (res.data?.photo_url) {
        setProfilePhoto(res.data.photo_url);
        justUploadedRef.current = false;
      }
    } catch (err: any) {
      console.log('[Photo] Upload error status:', err.response?.status);
      console.log('[Photo] Upload error data:', err.response?.data);
      console.log('[Photo] Upload error message:', err.message);
      Alert.alert('Gagal', 'Tidak dapat mengunggah foto. Silakan coba lagi.');
      justUploadedRef.current = false;
      fetchProfile();
    }
  };

  // ── Pilih foto dari galeri ──
  const handleUpdatePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Kami membutuhkan akses galeri untuk mengganti foto profil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      justUploadedRef.current = true; // Cegah fetchProfile menimpa foto lokal
      setProfilePhoto(uri); // Optimistic UI
      uploadPhotoToServer(uri);
    }
  };

  const performLogout = async () => {
    // 1. Logout dari server
    try {
      await api.post('/logout');
      console.log('[Logout] Server logout berhasil.');
    } catch (e: any) {
      console.log('[Logout] Server logout gagal:', e.response?.data || e.message);
    }

    // 2. Hapus sesi lokal
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('biometricEnabled');
      console.log('[Logout] Token lokal berhasil dihapus.');
    } catch (e) {
      console.log('[Logout] Gagal hapus AsyncStorage:', e);
    }

    // 3. Navigasi ke Login
    if (Platform.OS === 'web') {
      // WEB: Reload halaman → app restart di initial route (Login)
      console.log('[Logout] Platform Web — melakukan reload halaman...');
      window.location.href = '/';
      return;
    }

    // MOBILE: Reset navigation stack
    try {
      const rootNav = navigation.getParent();
      if (rootNav) {
        rootNav.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' as never }] })
        );
      } else {
        resetToLogin();
      }
    } catch (navError) {
      console.log('[Logout] Navigasi error, fallback resetToLogin:', navError);
      resetToLogin();
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Web: gunakan confirm() bawaan browser (lebih reliable dari Alert.alert)
      const confirmed = window.confirm('Apakah Anda yakin ingin keluar dari akun ini?');
      if (confirmed) performLogout();
      return;
    }

    // Mobile: gunakan Alert.alert native
    Alert.alert('Konfirmasi Logout', 'Apakah Anda yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: performLogout },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={st.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={st.loadingText}>Memuat profil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ═══ TOP APP BAR (CLEAN) ═══ */}
      <View style={st.header}>
        <Text style={st.headerTitle}>HI!-CARE</Text>
      </View>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile Header Bento ── */}
        <View style={st.profileBento}>
          {/* Avatar + Name */}
          <View style={st.avatarCard}>
            <TouchableOpacity style={st.avatarWrap} onPress={handleUpdatePhoto} activeOpacity={0.8}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={st.avatarImage} />
              ) : (
                <View style={st.avatarPlaceholder}>
                  <MaterialIcons name="person" size={32} color={C.primaryContainer} />
                </View>
              )}
              <View style={st.verifiedBadge}>
                <MaterialIcons name="verified" size={14} color={C.onSecondaryContainer} />
              </View>
              <View style={st.cameraBadge}>
                <MaterialIcons name="photo-camera" size={14} color={C.onPrimary} />
              </View>
            </TouchableOpacity>
            <View style={{ flexShrink: 1 }}>
              <Text style={st.profileName} numberOfLines={1}>{name}</Text>
              <Text style={st.profileId} numberOfLines={1}>ID: {patientId}</Text>
              <View style={st.tagRow}>
                <View style={[st.tag, { backgroundColor: C.primaryFixed }]}>
                  <Text style={[st.tagText, { color: C.onPrimaryFixed }]} numberOfLines={1}>
                    Status: {status}
                  </Text>
                </View>
                <View style={[st.tag, { backgroundColor: C.secondaryFixed }]}>
                  <Text style={[st.tagText, { color: C.onSecondaryFixed }]} numberOfLines={1}>
                    {category}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Adherence Score */}
          <View style={st.adherenceCard}>
            <AdherenceCircle percent={adherencePercent} />
            <Text style={st.adherenceLabel}>Adherence Score</Text>
          </View>
        </View>

        {/* ── Personal Info Card ── */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MaterialIcons name="badge" size={24} color={C.primary} />
            <Text style={st.cardTitle}>Informasi Pribadi</Text>
          </View>
          <View style={st.infoGrid}>
            <InfoField label="Nama Lengkap" value={fullName} />
            <InfoField label="Tanggal Lahir" value={birthDate} />
            <InfoField label="Nomor Registrasi" value={regNumber} />
            <InfoField label="Lokasi Perawatan" value={careLocation} />
          </View>
        </View>

        {/* ── Medical Summary Card ── */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MaterialIcons name="medical-information" size={24} color={C.secondary} />
            <Text style={st.cardTitle}>Ringkasan Medis</Text>
          </View>
          <View style={st.regimenCard}>
            <MaterialIcons name="medication" size={24} color={C.secondary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={st.regimenLabel}>Regimen Saat Ini</Text>
              <Text style={st.regimenName}>{regimenName}</Text>
              <Text style={st.regimenDose}>{regimenDose}</Text>
            </View>
          </View>
        </View>

        {/* ── Privacy Settings Card ── */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MaterialIcons name="security" size={24} color={C.primary} />
            <Text style={st.cardTitle}>Pengaturan Privasi</Text>
          </View>
          <View style={st.settingRow}>
            <View style={st.settingLeft}>
              <MaterialIcons name="notifications-paused" size={24} color="#64748b" />
              <View style={{ flex: 1 }}>
                <Text style={st.settingTitle}>Notifikasi Tersembunyi</Text>
                <Text style={st.settingDesc}>Samarkan konten notifikasi di layar kunci</Text>
              </View>
            </View>
            <ToggleSwitch value={hiddenNotif} onToggle={() => setHiddenNotif(!hiddenNotif)} />
          </View>
        </View>

        {/* ── Security Settings Card ── */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MaterialIcons name="fingerprint" size={24} color={C.secondary} />
            <Text style={st.cardTitle}>Pengaturan Keamanan</Text>
          </View>
          <View style={st.settingRow}>
            <View style={st.settingLeft}>
              <MaterialIcons name="fingerprint" size={24} color="#64748b" />
              <View style={{ flex: 1 }}>
                <Text style={st.settingTitle}>Login dengan Sidik Jari</Text>
                <Text style={st.settingDesc}>Gunakan biometrik untuk login otomatis saat membuka aplikasi</Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: '#cbd5e1', true: C.primaryContainer }}
              thumbColor={isBiometricEnabled ? C.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* ── Account Management ── */}
        <View style={st.accountSection}>
          <TouchableOpacity style={st.accountBtn} activeOpacity={0.7}>
            <View style={st.accountBtnLeft}>
              <MaterialIcons name="settings" size={24} color={C.onSurface} />
              <Text style={st.accountBtnText}>Pengaturan Akun</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={st.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <MaterialIcons name="logout" size={24} color={C.error} />
            <Text style={st.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ──
const st = StyleSheet.create({
  /* Loading */
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
  },

  /* Root */
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    paddingHorizontal: S.margin,
    paddingTop: S.xl,
    paddingBottom: S.xl,
  },

  // Header (Clean)
  header: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: S.margin, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1d4ed8', letterSpacing: 0.5 },

  /* Profile Bento */
  profileBento: {
    flexDirection: 'row',
    gap: S.md,
    marginBottom: S.xl,
  },
  avatarCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 12,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: C.primaryFixed,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: C.secondaryContainer,
    padding: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: C.primaryFixed,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    backgroundColor: C.primary,
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    color: C.onBackground,
    textAlign: 'center',
  },
  profileId: {
    fontSize: 12,
    fontWeight: '500',
    color: C.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.xs,
    marginTop: S.sm,
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Adherence Card */
  adherenceCard: {
    flex: 1,
    backgroundColor: C.surfaceContainerHighest,
    borderRadius: 12,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  circleWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTrack: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    borderColor: C.surfaceVariant,
  },
  circleFill: {
    borderColor: C.secondary,
    borderRightColor: C.surfaceVariant,
    transform: [{ rotate: '-90deg' }],
  },
  circleText: {
    fontSize: 24,
    fontWeight: '600',
    color: C.secondary,
  },
  adherenceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.secondaryContainer,
    marginTop: S.sm,
  },

  /* Cards */
  card: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 12,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    marginBottom: S.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginBottom: S.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.onSurface,
  },

  /* Info Grid */
  infoGrid: {
    gap: S.lg,
  },
  infoField: {
    gap: S.xs,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.24,
    color: C.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: C.onBackground,
  },

  /* Regimen */
  regimenCard: {
    flexDirection: 'row',
    gap: S.md,
    alignItems: 'flex-start',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 8,
    padding: S.md,
    borderLeftWidth: 4,
    borderLeftColor: C.secondary,
  },
  regimenLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.onSurfaceVariant,
    marginBottom: 4,
  },
  regimenName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurface,
  },
  regimenDose: {
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
  },

  /* Settings */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    flex: 1,
    marginRight: S.md,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: C.onSurface,
  },
  settingDesc: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    fontStyle: 'italic',
  },

  /* Toggle */
  toggleTrack: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
    padding: 4,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: C.primaryContainer,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  toggleThumbOn: {
    transform: [{ translateX: 24 }],
  },

  /* Account Section */
  accountSection: {
    gap: S.sm,
  },
  accountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 12,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  accountBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  accountBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: C.onSurface,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.md,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: S.md,
    borderWidth: 1,
    borderColor: `${C.error}33`,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.error,
  },
});

export default ProfileScreen;
