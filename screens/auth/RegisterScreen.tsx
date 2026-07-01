import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import api from '../../src/api';

// ── Design Tokens (DESIGN.md – Serene Assurance) ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#012D1D', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff',
  secondary: '#00A86B', background: '#f8f9ff',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

// ── Props ──
interface RegisterScreenProps {
  onRegister?: (data: { regNumber: string; email: string; username: string; password: string }) => void;
  onLogin?: () => void;
}

// ── Reusable Input Field ──
const InputField: React.FC<{
  label: string; icon: keyof typeof MaterialIcons.glyphMap;
  placeholder: string; value: string; onChangeText: (t: string) => void;
  secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address';
}> = ({ label, icon, placeholder, value, onChangeText, secureTextEntry, keyboardType }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={st.fieldGroup}>
      <Text style={st.label}>{label}</Text>
      <View style={[st.inputWrap, focused && st.inputWrapFocused]}>
        <MaterialIcons name={icon} size={22} color={focused ? C.primary : C.outline} style={st.inputIcon} />
        <TextInput style={st.textInput} placeholder={placeholder} placeholderTextColor={`${C.outline}99`}
          value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry}
          keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      </View>
    </View>
  );
};

// ── Component ──
const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onLogin }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [regNumber, setRegNumber] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!regNumber || !email || !username || !password || !confirmPassword) {
      Alert.alert('Gagal', 'Semua kolom wajib diisi!');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Gagal', 'Konfirmasi kata sandi tidak cocok!');
      return;
    }

    setLoading(true);
    try {
      await api.post('/register', {
        no_reg_hiv: regNumber,
        email: email,
        username: username,
        password: password,
        password_confirmation: confirmPassword
      });
      Alert.alert('Berhasil ✅', 'Akun berhasil dibuat. Silakan masuk.');
      navigation.navigate('Login' as any); // Type cast fallback depending on navigation type definition 
    } catch (error: any) {
      Alert.alert('Registrasi Gagal', error.response?.data?.message || 'Terjadi kesalahan pada server.');
    } finally {
      setLoading(false);
    }
  };

  const scrollContent = (
    <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={st.container}>
        <View style={st.headerSection}>
          <Image 
            source={require('../../assets/img/logo_wear.jpeg')} 
            style={{ width: 80, height: 80, borderRadius: 40, marginBottom: S.sm }} 
          />
          <Text style={st.brandTitle}>WEAR</Text>
          <Text style={st.brandSub}>
            Masuki ruang aman untuk perjalanan kesehatan Anda. Empati radikal dalam setiap interaksi.
          </Text>
        </View>

        <View style={st.privacyCard}>
          <MaterialIcons name="admin-panel-settings" size={24} color={C.secondary} />
          <View style={{ flex: 1, gap: S.xs }}>
            <Text style={st.privacyLabel}>PRIVASI DIUTAMAKAN</Text>
            <Text style={st.privacyDesc}>
              Identitas medis Anda terenkripsi. Kami tidak pernah membagikan data Anda dengan pihak ketiga tanpa persetujuan eksplisit.
            </Text>
          </View>
        </View>

        <View style={st.formCard}>
          <InputField label="No. Registrasi Puskesmas" icon="badge" placeholder="Masukkan nomor registrasi"
            value={regNumber} onChangeText={setRegNumber} />
          <InputField label="Email" icon="mail" placeholder="example@email.com"
            value={email} onChangeText={setEmail} keyboardType="email-address" />
          <InputField label="Nama Pengguna" icon="account-circle" placeholder="Pilih alias yang aman"
            value={username} onChangeText={setUsername} />
          <InputField label="Kata Sandi" icon="lock" placeholder="••••••••"
            value={password} onChangeText={setPassword} secureTextEntry />
          <InputField label="Konfirmasi Kata Sandi" icon="lock-reset" placeholder="••••••••"
            value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

          <View style={{ paddingTop: S.sm }}>
            <TouchableOpacity 
              style={[st.submitBtn, loading && { opacity: 0.7 }]} 
              activeOpacity={0.85} 
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={st.submitBtnText}>{loading ? 'Memproses...' : 'Buat Akun'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={st.footer}>
          <View style={st.footerRow}>
            <Text style={st.footerText}>Sudah punya akun WEAR? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={st.footerLink}>Masuk di sini</Text>
            </TouchableOpacity>
          </View>
          <View style={st.badgeRow}>
            <View style={st.badgeDivider} />
            <Text style={st.badgeText}>ENKRIPSI STANDAR KLINIS</Text>
            <View style={st.badgeDivider} />
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <View style={[st.bgTop, { zIndex: -1, elevation: 0 }]} pointerEvents="none" />
      <View style={[st.bgBottom, { zIndex: -1, elevation: 0 }]} pointerEvents="none" />
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {scrollContent}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          {scrollContent}
        </View>
      )}
    </SafeAreaView>
  );
};

// ── Styles ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: S.margin, paddingVertical: S.xl },
  container: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: S.lg },

  // BG decorations
  bgTop: { position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: 250, backgroundColor: `${C.primary}0D` },
  bgBottom: { position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: `${C.secondary}0D` },

  // Header
  headerSection: { alignItems: 'center', gap: S.sm },
  logoBox: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center', marginBottom: S.sm,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  brandTitle: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.64, color: C.primary },
  brandSub: { fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant, textAlign: 'center', maxWidth: 320 },

  // Privacy card
  privacyCard: {
    flexDirection: 'row', gap: S.md, alignItems: 'flex-start',
    backgroundColor: C.surfaceContainerLow, borderRadius: 12, padding: S.md,
    borderWidth: 1, borderColor: `${C.outlineVariant}4D`,
  },
  privacyLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: C.secondary, textTransform: 'uppercase' },
  privacyDesc: { fontSize: 14, lineHeight: 20, color: C.onSurfaceVariant },

  // Form card
  formCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: 12, padding: S.lg,
    borderWidth: 1, borderColor: `${C.outlineVariant}80`, gap: S.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },

  // Input fields
  fieldGroup: { gap: S.sm },
  label: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.24, color: C.onSurfaceVariant, marginLeft: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.outlineVariant,
    borderRadius: 8, paddingHorizontal: S.md, height: 50,
  },
  inputWrapFocused: { borderColor: C.primary },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 16, lineHeight: 24, color: C.onSurface, paddingVertical: 0 },

  // Submit
  submitBtn: {
    width: '100%', paddingVertical: 16, backgroundColor: C.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: C.onPrimary },

  // Footer
  footer: { alignItems: 'center', gap: S.md, paddingBottom: S.xl },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant },
  footerLink: { fontSize: 16, fontWeight: '700', color: C.primary, marginLeft: S.xs },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: S.xl, paddingTop: S.md, opacity: 0.4 },
  badgeDivider: { height: 32, width: 1, backgroundColor: C.outlineVariant },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: C.onSurfaceVariant, textTransform: 'uppercase' },
});

export default RegisterScreen;
