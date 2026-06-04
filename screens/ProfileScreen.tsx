import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
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
import CustomHeader from '../components/CustomHeader';

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

const InfoField: React.FC<{
  label: string;
  value: string;
  isEditing?: boolean;
  editValue?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  editable?: boolean;
  placeholder?: string;
}> = ({ label, value, isEditing, editValue, onChangeText, keyboardType = 'default', editable = true, placeholder }) => {
  const [focused, setFocused] = useState(false);

  if (isEditing && editable) {
    return (
      <View style={st.infoField}>
        <Text style={st.infoLabel}>{label}</Text>
        <TextInput
          style={[
            st.editInput,
            focused && { borderColor: C.primary },
          ]}
          value={editValue}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          placeholder={placeholder || label}
          placeholderTextColor={C.outline}
        />
      </View>
    );
  }

  return (
    <View style={st.infoField}>
      <Text style={st.infoLabel}>{label}</Text>
      <Text style={st.infoValue}>{value}</Text>
    </View>
  );
};

const GenderSelector: React.FC<{
  label: string;
  value: string;
  isEditing?: boolean;
  editValue?: string;
  onSelect?: (val: string) => void;
}> = ({ label, value, isEditing, editValue, onSelect }) => {
  if (isEditing) {
    return (
      <View style={st.infoField}>
        <Text style={st.infoLabel}>{label}</Text>
        <View style={st.genderRow}>
          <TouchableOpacity
            style={[
              st.genderPill,
              editValue === 'L' && st.genderPillActive,
            ]}
            onPress={() => onSelect?.('L')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                st.genderPillText,
                editValue === 'L' && st.genderPillTextActive,
              ]}
            >
              Laki-laki
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              st.genderPill,
              editValue === 'P' && st.genderPillActive,
            ]}
            onPress={() => onSelect?.('P')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                st.genderPillText,
                editValue === 'P' && st.genderPillTextActive,
              ]}
            >
              Perempuan
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayValue = value === 'L' ? 'Laki-laki' : value === 'P' ? 'Perempuan' : value || '-';
  return (
    <View style={st.infoField}>
      <Text style={st.infoLabel}>{label}</Text>
      <Text style={st.infoValue}>{displayValue}</Text>
    </View>
  );
};

// ── Utility ──
const calculateBMI = (berat: string, tinggi: string): string => {
  const b = parseFloat(berat);
  const t = parseFloat(tinggi);
  if (!b || !t || t <= 0) return '-';
  const bmi = b / Math.pow(t / 100, 2);
  return bmi.toFixed(1);
};

const getBMICategory = (bmiStr: string): { label: string; color: string } => {
  const bmi = parseFloat(bmiStr);
  if (isNaN(bmi)) return { label: '', color: C.outline };
  if (bmi < 18.5) return { label: 'Underweight', color: '#f59e0b' };
  if (bmi < 25) return { label: 'Normal', color: '#22c55e' };
  if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
  return { label: 'Obese', color: C.error };
};

// ── Component ──
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  const [category, setCategory] = useState('');
  const [adherencePercent, setAdherencePercent] = useState(0);
  const [fullName, setFullName] = useState('-');
  const [noHp, setNoHp] = useState('-');
  const [birthDate, setBirthDate] = useState('-');
  const [regNumber, setRegNumber] = useState('-');
  const [careLocation, setCareLocation] = useState('-');
  const [alamat, setAlamat] = useState('-');
  const [jenisKelamin, setJenisKelamin] = useState('-');
  const [beratBadan, setBeratBadan] = useState('-');
  const [tinggiBadan, setTinggiBadan] = useState('-');
  const [regimenName, setRegimenName] = useState('-');
  const [regimenDose, setRegimenDose] = useState('-');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Editable fields
  const [editNama, setEditNama] = useState('');
  const [editNoHp, setEditNoHp] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editTanggalLahir, setEditTanggalLahir] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('');
  const [editBeratBadan, setEditBeratBadan] = useState('');
  const [editTinggiBadan, setEditTinggiBadan] = useState('');

  // Flag to skip overwriting the photo from API right after a local upload
  const justUploadedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      if (!initialLoadDone) setLoading(true);
      const res = await api.get('/profile');
      const user = res.data.user;
      if (!user) return;

      setName(user.nama || (user.role === 'nakes' ? 'Nakes' : 'Pasien'));
      setFullName(user.nama || '-');
      setNoHp(user.no_hp || '-');
      setPatientId(user.id ? `HI-${user.id}` : '-');
      // Set role and tags
      const currentRole = user.role || 'pasien';
      setRole(currentRole);
      
      if (currentRole === 'nakes') {
        setStatus('Petugas Medis');
        setCategory(user.nakes?.profesi || 'Tenaga Kesehatan');
      }

      // Jangan timpa foto lokal jika baru saja upload (hindari race condition)
      if (!justUploadedRef.current) {
        setProfilePhoto(user.photo_url || null);
      }

      const pasien = user.pasien;
      if (pasien && currentRole === 'pasien') {
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
          setBirthDate(master.tgl_lahir || master.tanggal_lahir || '-');
          setAlamat(master.alamat || '-');
          setJenisKelamin(master.jenis_kelamin || '-');
          setBeratBadan(master.berat_badan || '-');
          setTinggiBadan(master.tinggi_badan || '-');
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

  // ── Edit Mode Handlers ──
  const enterEditMode = () => {
    setEditNama(fullName === '-' ? '' : fullName);
    setEditNoHp(noHp === '-' ? '' : noHp);
    setEditAlamat(alamat === '-' ? '' : alamat);
    setEditTanggalLahir(birthDate === '-' ? '' : birthDate);
    setEditJenisKelamin(jenisKelamin === '-' ? '' : jenisKelamin);
    setEditBeratBadan(beratBadan === '-' ? '' : beratBadan);
    setEditTinggiBadan(tinggiBadan === '-' ? '' : tinggiBadan);
    setIsEditing(true);
  };

  const cancelEditMode = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        nama: editNama,
        no_hp: editNoHp,
        alamat: editAlamat,
        tanggal_lahir: editTanggalLahir,
        jenis_kelamin: editJenisKelamin,
        berat_badan: parseFloat(editBeratBadan) || 0,
        tinggi_badan: parseFloat(editTinggiBadan) || 0,
      };
      await api.post('/profile/update', payload);
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
      setIsEditing(false);
      fetchProfile();
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan profil.';
      Alert.alert('Gagal', message);
    } finally {
      setIsSaving(false);
    }
  };

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

  // ── BMI Calculation ──
  const bmiValue = isEditing
    ? calculateBMI(editBeratBadan, editTinggiBadan)
    : calculateBMI(beratBadan, tinggiBadan);
  const bmiCategory = getBMICategory(bmiValue);

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

      {/* ═══ CUSTOM HEADER ═══ */}
      <CustomHeader title="Profil Saya" showBackButton={false} />

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
          {role === 'pasien' && (
            <View style={st.adherenceCard}>
              <AdherenceCircle percent={adherencePercent} />
              <Text style={st.adherenceLabel}>Adherence Score</Text>
            </View>
          )}
        </View>

        {/* ── Personal Info Card ── */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MaterialIcons name="badge" size={24} color={C.primary} />
            <Text style={st.cardTitle}>Informasi Pribadi</Text>
          </View>

          {/* Edit Profile Button (when not editing) */}
          {!isEditing && (
            <TouchableOpacity style={st.editBtn} onPress={enterEditMode} activeOpacity={0.7}>
              <MaterialIcons name="edit" size={20} color={C.onPrimary} />
              <Text style={st.editBtnText}>Edit Profil</Text>
            </TouchableOpacity>
          )}

          <View style={st.infoGrid}>
            <InfoField
              label="Nama Lengkap"
              value={fullName}
              isEditing={isEditing}
              editValue={editNama}
              onChangeText={setEditNama}
              editable={!isSaving}
              placeholder="Masukkan nama lengkap"
            />
            <InfoField
              label="No. Handphone"
              value={noHp}
              isEditing={isEditing}
              editValue={editNoHp}
              onChangeText={setEditNoHp}
              keyboardType="phone-pad"
              editable={!isSaving}
              placeholder="Contoh: 08123456789"
            />
            {role === 'pasien' && (
              <>
                <InfoField
                  label="Tanggal Lahir"
                  value={birthDate}
                  isEditing={isEditing}
                  editValue={editTanggalLahir}
                  onChangeText={setEditTanggalLahir}
                  editable={!isSaving}
                  placeholder="YYYY-MM-DD"
                />
                <GenderSelector
                  label="Jenis Kelamin"
                  value={jenisKelamin}
                  isEditing={isEditing}
                  editValue={editJenisKelamin}
                  onSelect={isSaving ? undefined : setEditJenisKelamin}
                />
                <InfoField
                  label="Alamat"
                  value={alamat}
                  isEditing={isEditing}
                  editValue={editAlamat}
                  onChangeText={setEditAlamat}
                  editable={!isSaving}
                  placeholder="Masukkan alamat"
                />
                <InfoField label="Nomor Registrasi" value={regNumber} />
                <InfoField label="Lokasi Perawatan" value={careLocation} />
              </>
            )}
          </View>

          {/* Save / Cancel Buttons (when editing) */}
          {isEditing && (
            <View style={st.editActions}>
              <TouchableOpacity
                style={[st.saveBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={C.onPrimary} />
                ) : (
                  <MaterialIcons name="check" size={20} color={C.onPrimary} />
                )}
                <Text style={st.saveBtnText}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.cancelBtn}
                onPress={cancelEditMode}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={st.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Data Fisik Card ── */}
        {role === 'pasien' && (
          <View style={st.card}>
            <View style={st.cardHeader}>
              <MaterialIcons name="straighten" size={24} color={C.primary} />
              <Text style={st.cardTitle}>Data Fisik</Text>
            </View>
            <View style={st.infoGrid}>
              <InfoField
                label="Berat Badan (kg)"
                value={beratBadan !== '-' ? `${beratBadan} kg` : '-'}
                isEditing={isEditing}
                editValue={editBeratBadan}
                onChangeText={setEditBeratBadan}
                keyboardType="numeric"
                editable={!isSaving}
                placeholder="Contoh: 65"
              />
              <InfoField
                label="Tinggi Badan (cm)"
                value={tinggiBadan !== '-' ? `${tinggiBadan} cm` : '-'}
                isEditing={isEditing}
                editValue={editTinggiBadan}
                onChangeText={setEditTinggiBadan}
                keyboardType="numeric"
                editable={!isSaving}
                placeholder="Contoh: 170"
              />
              {/* BMI (read-only) */}
              <View style={st.infoField}>
                <Text style={st.infoLabel}>Body Mass Index (BMI)</Text>
                <View style={st.bmiRow}>
                  <Text style={st.infoValue}>
                    {bmiValue !== '-' ? bmiValue : '-'}
                  </Text>
                  {bmiValue !== '-' && (
                    <View style={[st.bmiTag, { backgroundColor: bmiCategory.color + '20' }]}>
                      <Text style={[st.bmiTagText, { color: bmiCategory.color }]}>
                        {bmiCategory.label}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Medical Summary Card ── */}
        {role === 'pasien' && (
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
        )}


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

  /* Edit Input */
  editInput: {
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: C.onSurface,
  },

  /* Gender Selector */
  genderRow: {
    flexDirection: 'row',
    gap: S.sm,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  genderPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  genderPillTextActive: {
    color: C.onPrimary,
  },

  /* BMI */
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  bmiTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  bmiTagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Edit Button */
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: S.lg,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onPrimary,
  },

  /* Save / Cancel Buttons */
  editActions: {
    marginTop: S.lg,
    gap: S.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onPrimary,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurfaceVariant,
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
