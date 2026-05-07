import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../api';

// ── Design Tokens (DESIGN.md – Serene Assurance) ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff',
  secondary: '#6b4ab2', background: '#f8f9ff',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

// ── Props ──
interface RegisterScreenProps {
  onLogin?: () => void;
}

// ── Reusable Input Field ──
const InputField: React.FC<{
  label: string; icon: keyof typeof MaterialIcons.glyphMap;
  placeholder: string; value: string; onChangeText: (t: string) => void;
  secureTextEntry?: boolean; editable?: boolean;
}> = ({ label, icon, placeholder, value, onChangeText, secureTextEntry, editable = true }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={st.fieldGroup}>
      <Text style={st.label}>{label}</Text>
      <View style={[st.inputWrap, focused && st.inputWrapFocused]}>
        <MaterialIcons name={icon} size={22} color={focused ? C.primary : C.outline} style={st.inputIcon} />
        <TextInput style={st.textInput} placeholder={placeholder} placeholderTextColor={`${C.outline}99`}
          value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry}
          autoCapitalize="none" autoCorrect={false} editable={editable}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      </View>
    </View>
  );
};

// ── Component ──
const RegisterScreen: React.FC<RegisterScreenProps> = ({ onLogin }) => {
  const navigation = useNavigation();

  const [regNumber, setRegNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    // Validasi: semua field wajib diisi
    if (!regNumber.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Peringatan', 'Semua field wajib diisi.');
      return;
    }

    // Validasi: password harus sama dengan konfirmasi
    if (password !== confirmPassword) {
      Alert.alert('Peringatan', 'Kata sandi dan konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/register', {
        no_reg_hiv: regNumber,
        username: username,
        password: password,
      });

      // Sukses (201)
      Alert.alert(
        'Registrasi Berhasil',
        response.data?.message || 'Akun Anda berhasil dibuat. Silakan login.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigasi kembali ke Login
              if (onLogin) {
                onLogin();
              } else {
                navigation.navigate('Login' as never);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        'Terjadi kesalahan saat registrasi. Silakan coba lagi.';
      Alert.alert('Registrasi Gagal', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      {/* BG Decorations */}
      <View style={st.bgTop} />
      <View style={st.bgBottom} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={st.container}>

            {/* ═══ HEADER / BRANDING ═══ */}
            <View style={st.headerSection}>
              <View style={st.logoBox}>
                <MaterialIcons name="health-and-safety" size={32} color={C.onPrimary} />
              </View>
              <Text style={st.brandTitle}>HI!-CARE</Text>
              <Text style={st.brandSub}>
                Masuki ruang aman untuk perjalanan kesehatan Anda. Empati radikal dalam setiap interaksi.
              </Text>
            </View>

            {/* ═══ PRIVACY NOTE ═══ */}
            <View style={st.privacyCard}>
              <MaterialIcons name="admin-panel-settings" size={24} color={C.secondary} />
              <View style={{ flex: 1, gap: S.xs }}>
                <Text style={st.privacyLabel}>PRIVASI DIUTAMAKAN</Text>
                <Text style={st.privacyDesc}>
                  Identitas medis Anda terenkripsi. Kami tidak pernah membagikan data Anda dengan pihak ketiga tanpa persetujuan eksplisit.
                </Text>
              </View>
            </View>

            {/* ═══ REGISTRATION FORM ═══ */}
            <View style={st.formCard}>
              <InputField label="No. Registrasi HIV" icon="badge" placeholder="Masukkan nomor registrasi HIV"
                value={regNumber} onChangeText={setRegNumber} editable={!isLoading} />
              <InputField label="Nama Pengguna" icon="account-circle" placeholder="Pilih alias yang aman"
                value={username} onChangeText={setUsername} editable={!isLoading} />
              <InputField label="Kata Sandi" icon="lock" placeholder="••••••••"
                value={password} onChangeText={setPassword} secureTextEntry editable={!isLoading} />
              <InputField label="Konfirmasi Kata Sandi" icon="lock-reset" placeholder="••••••••"
                value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!isLoading} />

              {/* Submit */}
              <View style={{ paddingTop: S.sm }}>
                <TouchableOpacity
                  style={[st.submitBtn, isLoading && st.submitBtnDisabled]}
                  onPress={handleRegister}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={C.onPrimary} />
                  ) : (
                    <Text style={st.submitBtnText}>Buat Akun Aman</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ═══ FOOTER ═══ */}
            <View style={st.footer}>
              <View style={st.footerRow}>
                <Text style={st.footerText}>Sudah punya akun HI!-CARE? </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (onLogin) {
                      onLogin();
                    } else {
                      navigation.navigate('Login' as never);
                    }
                  }}
                  activeOpacity={0.7}
                >
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
      </KeyboardAvoidingView>
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
  submitBtnDisabled: {
    opacity: 0.7,
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
