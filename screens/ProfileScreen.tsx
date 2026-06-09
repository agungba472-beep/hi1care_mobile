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

// ── Design Tokens (Tema Emerald/Mint Material 3) ──
const C = {
  surface: '#f9f9f8', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#f3f4f3',
  surfaceContainer: '#edeeed', surfaceContainerHigh: '#e7e8e7',
  onSurface: '#191c1c', onSurfaceVariant: '#414844',
  outline: '#717973', outlineVariant: '#c1c8c2',
  primary: '#012d1d', onPrimary: '#ffffff', primaryContainer: '#1b4332',
  onPrimaryContainer: '#86af99', primaryFixed: '#c1ecd4', onPrimaryFixed: '#012d1d', primaryFixedDim: '#a5d0b9',
  secondary: '#4c6452', onSecondary: '#ffffff', secondaryContainer: '#cce6d0',
  secondaryFixed: '#cee9d3', onSecondaryFixed: '#092012', secondaryFixedDim: '#b3cdb7',
  background: '#f9f9f8', onBackground: '#191c1c',
  error: '#ba1a1a', onError: '#ffffff', errorContainer: '#ffdad6', onErrorContainer: '#410002',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 16 } as const;

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
            focused && { borderColor: C.primary, backgroundColor: C.surfaceContainerLowest },
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
  if (bmi < 25) return { label: 'Normal', color: '#10b981' }; // Emerald green
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
        <StatusBar barStyle="dark-content" backgroundColor={C.surfaceContainerLowest} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={st.loadingText}>Memuat profil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surfaceContainerLowest} />

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
                  <MaterialIcons name="person" size={32} color={C.primary} />
                </View>
              )}
              <View style={st.verifiedBadge}>
                <MaterialIcons name="verified" size={14} color={C.onPrimaryFixed} />
              </View>
              <View style={st.cameraBadge}>
                <MaterialIcons name="photo-camera" size={14} color={C.onPrimary} />
              </View>
            </TouchableOpacity>
            <View style={{ flexShrink: 1, alignItems: 'center' }}>
              <Text style={st.profileName} numberOfLines={1}>{name}</Text>
              <Text style={st.profileId} numberOfLines={1}>ID: {patientId}</Text>
              <View style={st.tagRow}>
                <View style={[st.tag, { backgroundColor: C.primaryFixed }]}>
                  <Text style={[st.tagText, { color: C.onPrimaryFixed }]} numberOfLines={1}>
                    Status: {status}
                  </Text>
                </View>
                <View style={[st.tag, { backgroundColor: C.surfaceContainerHigh }]}>
                  <Text style={[st.tagText, { color: C.onSurfaceVariant }]} numberOfLines={1}>
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
            {/* Edit Profile Button Icon (when not editing) */}
            {!isEditing && (
              <TouchableOpacity style={st.editBtnSmall} onPress={enterEditMode} activeOpacity={0.7}>
                <MaterialIcons name="edit" size={20} color={C.primary} />
              </TouchableOpacity>
            )}
          </View>

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
              <MaterialIcons name="medical-information" size={24} color={C.primary} />
              <Text style={st.cardTitle}>Ringkasan Medis</Text>
            </View>
            <View style={st.regimenCard}>
              <MaterialIcons name="medication" size={28} color={C.primary} style={{ marginTop: 2 }} />
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
            <MaterialIcons name="fingerprint" size={24} color={C.primary} />
            <Text style={st.cardTitle}>Pengaturan Keamanan</Text>
          </View>
          <View style={st.settingRow}>
            <View style={st.settingLeft}>
              <View style={{ flex: 1 }}>
                <Text style={st.settingTitle}>Login Sidik Jari / Biometrik</Text>
                <Text style={st.settingDesc}>Gunakan biometrik untuk login otomatis dengan aman</Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: C.outlineVariant, true: C.primaryFixed }}
              thumbColor={isBiometricEnabled ? C.primary : C.surfaceContainerLowest}
            />
          </View>
        </View>

        {/* ── Account Management (Logout) ── */}
        <View style={st.accountSection}>
          <TouchableOpacity style={st.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <MaterialIcons name="logout" size={22} color={C.error} />
            <Text style={st.logoutText}>Keluar dari Akun</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles (Tema Emerald/Mint Material 3) ──
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
    fontWeight: '500',
  },

  /* Root */
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    paddingHorizontal: S.margin,
    paddingTop: S.lg,
    paddingBottom: S.xl,
  },

  /* Profile Bento */
  profileBento: {
    flexDirection: 'row',
    gap: S.md,
    marginBottom: S.lg,
  },
  avatarCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    elevation: 2,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3
  },
  avatarWrap: {
    position: 'relative',
    marginTop: 4,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    backgroundColor: C.primaryFixed,
    padding: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.surfaceContainerLowest,
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: C.primaryFixed,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    backgroundColor: C.primaryContainer,
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.surfaceContainerLowest,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    color: C.onSurface,
    textAlign: 'center',
  },
  profileId: {
    fontSize: 12,
    fontWeight: '500',
    color: C.outline,
    marginTop: 2,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
    marginTop: 10,
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Adherence Card */
  adherenceCard: {
    flex: 1,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3
  },
  circleWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTrack: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 8,
    borderColor: C.surfaceContainerHigh,
  },
  circleFill: {
    borderColor: C.primary,
    borderRightColor: C.surfaceContainerHigh,
    transform: [{ rotate: '-90deg' }],
  },
  circleText: {
    fontSize: 22,
    fontWeight: '700',
    color: C.primary,
  },
  adherenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    marginTop: 12,
    textAlign: 'center',
  },

  /* Cards */
  card: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    marginBottom: S.md,
    elevation: 2,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: S.lg,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.onSurface,
    flex: 1,
  },
  editBtnSmall: {
    padding: 6,
    backgroundColor: C.primaryFixed,
    borderRadius: 8,
  },

  /* Info Grid */
  infoGrid: {
    gap: S.lg,
  },
  infoField: {
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.outline,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
  },

  /* Edit Input */
  editInput: {
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.onSurface,
  },

  /* Gender Selector */
  genderRow: {
    flexDirection: 'row',
    gap: S.sm,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: S.md,
    borderRadius: 12,
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
    paddingVertical: 4,
    borderRadius: 8,
  },
  bmiTagText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Save / Cancel Buttons */
  editActions: {
    marginTop: 24,
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
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
    backgroundColor: C.surfaceContainerLowest,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },

  /* Regimen */
  regimenCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: C.primary,
  },
  regimenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.outline,
    marginBottom: 4,
  },
  regimenName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
  },
  regimenDose: {
    fontSize: 14,
    fontWeight: '500',
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  /* Settings */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    flex: 1,
    marginRight: S.md,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: C.outline,
    lineHeight: 18,
  },

  /* Toggle Switch fallback (if Custom ToggleSwitch used) */
  toggleTrack: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.outlineVariant,
    padding: 4,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: C.primaryFixed,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.surfaceContainerLowest,
  },
  toggleThumbOn: {
    transform: [{ translateX: 24 }],
    backgroundColor: C.primary,
  },

  /* Account Section / Logout */
  accountSection: {
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.errorContainer,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#ffb4ab',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onErrorContainer,
  },
});

export default ProfileScreen;