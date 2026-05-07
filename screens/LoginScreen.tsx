import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { RootStackParamList } from '../App';

// ────────────────────────────────────────────
// Design Tokens (from DESIGN.md – Serene Assurance)
// ────────────────────────────────────────────
const Colors = {
  // Surfaces
  surface: '#f8f9ff',
  surfaceDim: '#ccdbf3',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d5e3fc',
  surfaceVariant: '#d5e3fc',
  surfaceTint: '#2759bb',

  // On-Surface
  onSurface: '#0d1c2e',
  onSurfaceVariant: '#434652',

  // Inverse
  inverseSurface: '#233144',
  inverseOnSurface: '#eaf1ff',

  // Outline
  outline: '#737784',
  outlineVariant: '#c3c6d5',

  // Primary
  primary: '#0043a2',
  onPrimary: '#ffffff',
  primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff',
  inversePrimary: '#b1c5ff',

  // Secondary
  secondary: '#6b4ab2',
  onSecondary: '#ffffff',
  secondaryContainer: '#b191fd',
  onSecondaryContainer: '#44208a',

  // Tertiary
  tertiary: '#42495c',
  onTertiary: '#ffffff',
  tertiaryContainer: '#596175',
  onTertiaryContainer: '#d5dcf4',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Fixed
  primaryFixed: '#dae2ff',
  primaryFixedDim: '#b1c5ff',
  onPrimaryFixed: '#001946',
  onPrimaryFixedVariant: '#00419e',
  secondaryFixed: '#eaddff',
  secondaryFixedDim: '#d1bcff',
  onSecondaryFixed: '#24005b',
  onSecondaryFixedVariant: '#523198',
  tertiaryFixed: '#dbe2fa',
  tertiaryFixedDim: '#bfc6dd',
  onTertiaryFixed: '#141b2c',
  onTertiaryFixedVariant: '#3f4759',

  // Background
  background: '#f8f9ff',
  onBackground: '#0d1c2e',
} as const;

const Spacing = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 16,
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
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIdentifierFocused, setIsIdentifierFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleLogin = async () => {
    // Validasi input kosong
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'Username dan password tidak boleh kosong.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/login', {
        username: identifier,
        password: password,
      });

      const { token } = response.data;

      // Simpan token ke AsyncStorage
      await AsyncStorage.setItem('userToken', token);

      // Navigasi ke MainTabs
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        'Terjadi kesalahan. Silakan coba lagi.';
      Alert.alert('Login Gagal', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Background Decorations ── */}
          <View style={styles.bgDecoTop} />
          <View style={styles.bgDecoBottom} />

          <View style={styles.container}>
            {/* ═══════════════════════════════════
                Branding Section
            ═══════════════════════════════════ */}
            <View style={styles.brandingSection}>
              <View style={styles.brandIcon}>
                <MaterialIcons
                  name="health-and-safety"
                  size={32}
                  color={Colors.onPrimaryContainer}
                />
              </View>
              <Text style={styles.brandTitle}>HI!-CARE</Text>
              <View style={styles.brandSubRow}>
                <Text style={styles.brandSubText}>Baru di HI!-CARE? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                  <Text style={styles.linkBold}>Daftar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ═══════════════════════════════════
                Login Card
            ═══════════════════════════════════ */}
            <View style={styles.card}>
              {/* Form Header */}
              <View style={styles.formHeader}>
                <Text style={styles.headlineMd}>Selamat datang kembali</Text>
                <Text style={styles.bodyMdVariant}>
                  Masuk untuk mengakses dashboard Anda
                </Text>
              </View>

              {/* ── Username / Email Input ── */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    isIdentifierFocused && styles.labelFocused,
                  ]}
                >
                  Username
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    isIdentifierFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <MaterialIcons
                    name="person"
                    size={22}
                    color={isIdentifierFocused ? Colors.primary : Colors.outline}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. patrick_care"
                    placeholderTextColor={`${Colors.outline}80`}
                    value={identifier}
                    onChangeText={setIdentifier}
                    onFocus={() => setIsIdentifierFocused(true)}
                    onBlur={() => setIsIdentifierFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* ── Password Input ── */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    isPasswordFocused && styles.labelFocused,
                  ]}
                >
                  Kata Sandi
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    isPasswordFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <MaterialIcons
                    name="lock"
                    size={22}
                    color={isPasswordFocused ? Colors.primary : Colors.outline}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor={`${Colors.outline}80`}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={22}
                      color={Colors.outline}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Utilities Row ── */}
              <View style={styles.utilitiesRow}>
                {/* Remember Me Toggle */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setRememberMe((v) => !v)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.toggleTrack,
                      rememberMe && styles.toggleTrackActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        rememberMe && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                  <Text style={styles.toggleLabel}>Ingat Saya</Text>
                </TouchableOpacity>

                {/* Forgot Password */}
                <TouchableOpacity
                  onPress={() => Alert.alert('Informasi', 'Silakan hubungi Admin Puskesmas untuk mereset kata sandi Anda.')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotLink}>Lupa Kata Sandi?</Text>
                </TouchableOpacity>
              </View>

              {/* ── Login Button ── */}
              <View style={styles.actionSection}>
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Memproses...' : 'Masuk'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Divider ── */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ATAU</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Register CTA ── */}
              <View style={styles.registerRow}>
                <Text style={styles.bodyMdVariant}>Baru di HI!-CARE? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                  <Text style={styles.linkBold}>Daftar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ═══════════════════════════════════
                Trust Badges
            ═══════════════════════════════════ */}
            <View style={styles.trustSection}>
              <View style={styles.trustIcons}>
                <MaterialIcons
                  name="verified-user"
                  size={28}
                  color={Colors.outline}
                  style={styles.trustIcon}
                />
                <MaterialIcons
                  name="enhanced-encryption"
                  size={28}
                  color={Colors.outline}
                  style={styles.trustIcon}
                />
                <MaterialIcons
                  name="privacy-tip"
                  size={28}
                  color={Colors.outline}
                  style={styles.trustIcon}
                />
              </View>
              <Text style={styles.trustText}>
                Data kesehatan Anda terenkripsi dan aman.{'\n'}HI!-CARE mengikuti
                standar privasi klinis.
              </Text>
            </View>
          </View>

          {/* ── Footer Decoration ── */}
          <View style={styles.footer}>
            <View style={styles.footerBar} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    backgroundColor: `${Colors.primary}0D`, // ~5% opacity
  },
  bgDecoBottom: {
    position: 'absolute',
    bottom: -96,
    left: -96,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: `${Colors.secondary}0D`, // ~5% opacity
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
    // Soft shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  brandTitle: {
    fontFamily: 'Manrope',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.64, // -0.02em × 32px
    color: Colors.primary,
  },
  brandSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandSubText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
  },
  linkBold: {
    fontFamily: 'Manrope',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.secondary,
  },

  /* ═══ Card ═══ */
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12, // rounded-xl
    padding: Spacing.xl,
    // Subtle shadow (blue-tinted)
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 4,
    // Border
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}4D`, // ~30% opacity
    gap: Spacing.lg,
  },

  /* ── Form Header ── */
  formHeader: {
    marginBottom: Spacing.sm,
  },
  headlineMd: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: Colors.onSurface,
  },
  bodyMdVariant: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.onSurfaceVariant,
  },

  /* ── Input Groups ── */
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.24, // 0.02em × 12px
    color: Colors.outline,
  },
  labelFocused: {
    color: Colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8, // rounded-lg
    paddingHorizontal: Spacing.md,
    height: 52, // py-3.5 ≈ 14px × 2 + line height
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    // Focus ring effect via shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Manrope',
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
    justifyContent: 'space-between',
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
    // Subtle shadow on thumb
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
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.24,
    color: Colors.onSurfaceVariant,
  },
  forgotLink: {
    fontFamily: 'Inter',
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
    borderRadius: 12, // rounded-xl
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
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
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: Colors.onPrimary,
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
    backgroundColor: `${Colors.outlineVariant}80`, // ~50% opacity
  },
  dividerText: {
    marginHorizontal: 16,
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 2.4, // tracking-widest
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
    fontFamily: 'Inter',
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
