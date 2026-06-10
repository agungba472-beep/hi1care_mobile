import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/api';
import { RootStackParamList } from '../App';
import * as LocalAuthentication from 'expo-local-authentication';

const Colors = {
  surface: '#f8f9ff',
  surfaceDim: '#ccdbf3',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e3ecfe',
  surfaceContainerHigh: '#d7e4fb',
  surfaceContainerHighest: '#cddcf8',
  surfaceVariant: '#dde2f0',
  onSurface: '#0d1c2e',
  onSurfaceVariant: '#434652',
  outline: '#737784',
  outlineVariant: '#c3c6d5',
  primary: '#012D1D',
  onPrimary: '#ffffff',
  primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff',
  primaryFixed: '#d6e2ff',
  onPrimaryFixed: '#001a41',
  secondary: '#00A86B',
  onSecondary: '#ffffff',
  secondaryContainer: '#865cd6',
  secondaryFixed: '#e8ddff',
  tertiary: '#00696a',
  onTertiary: '#ffffff',
  error: '#ba1a1a',
  background: '#f8f9ff',
  onBackground: '#0d1c2e',
} as const;

const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 20,
  margin: 20,
} as const;

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────
const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ── Biometric Authentication ──
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        // 1. Cek apakah sudah punya token (pernah login sebelumnya)
        const storedToken = await AsyncStorage.getItem('userToken');
        if (!storedToken) return;

        // 2. Cek apakah user mengaktifkan biometrik dari Profil
        const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
        if (biometricEnabled !== 'true') return;

        // 2. Cek apakah hardware mendukung biometrik
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) return;

        // 3. Cek apakah ada sidik jari/face terdaftar di HP
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) return;

        // 4. Prompt biometrik
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Gunakan Sidik Jari untuk masuk ke WEAR',
          cancelLabel: 'Gunakan Password',
          disableDeviceFallback: true,
        });

        // 5. Jika berhasil, langsung ke Dashboard sesuai role
        if (result.success) {
          const userRole = await AsyncStorage.getItem('userRole');
          if (userRole === 'nakes') {
            navigation.reset({ index: 0, routes: [{ name: 'NakesTabs' as never }] });
          } else {
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] });
          }
        }
      } catch (err) {
        console.log('[Biometric] Error:', err);
      }
    };

    checkBiometric();
  }, [navigation]);

  const handleLogin = async () => {
    setErrorMessage(''); // Reset pesan error
    
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Username dan kata sandi tidak boleh kosong.');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.post('/login', { username: identifier, password: password });
      console.log("=== BALASAN SUKSES LOGIN ===", response.data);
      
      // Ambil token dan data user dari response
      const { token, user } = response.data; 
      
      // Simpan token dan role ke AsyncStorage
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userRole', user.role); // Simpan role untuk biometrik

      // ── LOGIKA PERCABANGAN ROLE ──
      if (user.role === 'nakes') {
        // Jika Nakes, arahkan ke NakesTabs (bottom tabs khusus nakes)
        navigation.reset({ index: 0, routes: [{ name: 'NakesTabs' as never }] });
      } else {
        // Jika Pasien, arahkan ke Dashboard Pasien (MainTabs)
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] });
      }

    } catch (error: any) {
      console.log("=== ERROR LOGIN ===", error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || 'Username atau password salah.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Background decorations — OUTSIDE ScrollView to prevent layout thrashing */}
      <View style={[styles.bgDecoTop, { zIndex: -1, elevation: 0 }]} pointerEvents="none" />
      <View style={[styles.bgDecoBottom, { zIndex: -1, elevation: 0 }]} pointerEvents="none" />

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.keyboardView} behavior="padding">
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <FormContent
              identifier={identifier}
              setIdentifier={setIdentifier}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isLoading={isLoading}
              errorMessage={errorMessage}
              handleLogin={handleLogin}
              navigation={navigation}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          style={styles.keyboardView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FormContent
            identifier={identifier}
            setIdentifier={setIdentifier}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isLoading={isLoading}
            errorMessage={errorMessage}
            handleLogin={handleLogin}
            navigation={navigation}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ────────────────────────────────────────────
// Form Content — Extracted as a STABLE component OUTSIDE LoginScreen
// to prevent remount on every keystroke. This is the key difference
// from having a JSX variable inside the component.
// ────────────────────────────────────────────
interface FormContentProps {
  identifier: string;
  setIdentifier: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (fn: (v: boolean) => boolean) => void;
  isLoading: boolean;
  errorMessage: string;
  handleLogin: () => void;
  navigation: any;
}

const FormContent: React.FC<FormContentProps> = React.memo(({
  identifier, setIdentifier,
  password, setPassword,
  showPassword, setShowPassword,
  isLoading, errorMessage, handleLogin, navigation,
}) => (
  <>
    <View style={styles.container}>
      {/* ═══ Branding ═══ */}
      <View style={styles.brandingSection}>
        <Image 
          source={require('../assets/img/logo_wear.jpeg')} 
          style={{ width: 80, height: 80, borderRadius: 40, marginBottom: Spacing.md }} 
        />
        <Text style={styles.brandTitle}>WEAR</Text>
        <View style={styles.brandSubRow}>
          <Text style={styles.brandSubText}>Baru di WEAR? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
            <Text style={styles.linkBold}>Daftar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ Login Card ═══ */}
      <View style={styles.card}>
        <View style={styles.formHeader}>
          <Text style={styles.headlineMd}>Selamat datang kembali</Text>
          <Text style={styles.bodyMdVariant}>Masuk untuk mengakses dashboard Anda</Text>
        </View>

        {!!errorMessage && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Username */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="person" size={22} color={Colors.outline} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. patrick_care"
              placeholderTextColor={`${Colors.outline}80`}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={22} color={Colors.outline} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              placeholderTextColor={`${Colors.outline}80`}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color={Colors.outline} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Utilities Row */}
        <View style={styles.utilitiesRow}>
          <TouchableOpacity 
            onPress={async () => {
              await AsyncStorage.clear();
              Alert.alert('Berhasil', 'Cache dan Token berhasil direset. Silakan tutup dan buka kembali aplikasi.');
            }} 
            activeOpacity={0.7}
            style={{ marginRight: 16 }}
          >
            <Text style={[styles.forgotLink, { color: Colors.error }]}>Reset Cache & Token</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Lupa Password', 'Demi keamanan data rekam medis, silakan hubungi Admin Klinik atau Tenaga Kesehatan Anda untuk melakukan reset password akun.')} activeOpacity={0.7}>
            <Text style={styles.forgotLink}>Lupa Kata Sandi?</Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} onPress={handleLogin} activeOpacity={0.85} disabled={isLoading}>
            <Text style={styles.loginButtonText}>{isLoading ? 'Memproses...' : 'Masuk'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.biometricBtn} onPress={() => navigation.navigate('BiometricAuth')} activeOpacity={0.7} disabled={isLoading}>
            <MaterialIcons name="fingerprint" size={20} color={Colors.primary} />
            <Text style={styles.biometricBtnText}>Login dengan Sidik Jari</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ATAU</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Register CTA */}
        <View style={styles.registerRow}>
          <Text style={styles.bodyMdVariant}>Baru di WEAR? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
            <Text style={styles.linkBold}>Daftar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ Trust Badges ═══ */}
      <View style={styles.trustSection}>
        <View style={styles.trustIcons}>
          <MaterialIcons name="verified-user" size={28} color={Colors.outline} style={styles.trustIcon} />
          <MaterialIcons name="enhanced-encryption" size={28} color={Colors.outline} style={styles.trustIcon} />
          <MaterialIcons name="privacy-tip" size={28} color={Colors.outline} style={styles.trustIcon} />
        </View>
        <Text style={styles.trustText}>
          Data kesehatan Anda terenkripsi dan aman.{'\n'}WEAR mengikuti standar privasi klinis.
        </Text>
      </View>
    </View>

    <View style={styles.footer}>
      <View style={styles.footerBar} />
    </View>
  </>
));

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────
const styles = StyleSheet.create({
  /* ── Root ── */
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.xl,
  },

  /* ── Background Decorations ── */
  bgDecoTop: {
    position: 'absolute',
    top: -96,
    right: -96,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: `${Colors.primary}0D`,
  },
  bgDecoBottom: {
    position: 'absolute',
    bottom: -96,
    left: -96,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: `${Colors.secondary}0D`,
  },

  /* ── Container ── */
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: Spacing.xl,
  },

  /* ═══ Branding ═══ */
  brandingSection: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.64,
    color: Colors.primary,
  },
  brandSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandSubText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
  },
  linkBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.secondary,
  },

  /* ═══ Card ═══ */
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 4,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`,
    gap: Spacing.lg,
  },

  /* ── Form Header & Error ── */
  formHeader: {
    marginBottom: Spacing.sm,
  },
  headlineMd: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: Colors.onSurface,
  },
  bodyMdVariant: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.onSurfaceVariant,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },

  /* ── Input Groups ── */
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.24,
    color: Colors.outline,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.onSurface,
    paddingVertical: 0,
  },

  /* ── Utilities Row ── */
  utilitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleThumbActive: {
    transform: [{ translateX: 16 }],
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.24,
    color: Colors.onSurfaceVariant,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.24,
    color: Colors.secondary,
  },

  /* ── Actions ── */
  actionSection: {
    paddingTop: Spacing.sm,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: Colors.onPrimary,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}4D`,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  biometricBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },

  /* ── Divider ── */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${Colors.outlineVariant}80`,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 2.4,
    color: Colors.outline,
    textTransform: 'uppercase',
  },

  /* ── Register Row ── */
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ═══ Trust Badges ═══ */
  trustSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  trustIcons: {
    flexDirection: 'row',
    gap: Spacing.lg,
    opacity: 0.4,
  },
  trustIcon: {},
  trustText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.24,
    color: Colors.outline,
    textAlign: 'center',
  },

  /* ═══ Footer ═══ */
  footer: {
    width: '100%',
    paddingVertical: Spacing.gutter,
    alignItems: 'center',
    opacity: 0.2,
  },
  footerBar: {
    height: 4,
    width: 128,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 9999,
  },
});

export default LoginScreen;
