import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Animated, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// ── Design Tokens ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceVariant: '#d5e3fc', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#012D1D', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  secondary: '#00A86B', secondaryContainer: '#b191fd', onSecondaryContainer: '#44208a',
  background: '#f8f9ff',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

// ── Props ──
interface BiometricAuthScreenProps {
  onMenuPress?: () => void;
  onPrivacyToggle?: () => void;
  onPasswordLogin?: () => void;
  onBiometricScan?: () => void;
  onNavPress?: (tab: string) => void;
}

// ── Component ──
const BiometricAuthScreen: React.FC<BiometricAuthScreenProps> = ({
  onMenuPress, onPrivacyToggle, onPasswordLogin, onBiometricScan, onNavPress,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<any>();

  // Pulse animation for scanning indicator
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const handleBiometricAuth = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Tidak Didukung', 'Perangkat ini tidak memiliki sensor biometrik.');
        return;
      }
      
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Belum Terdaftar', 'Anda belum mendaftarkan sidik jari atau biometrik di perangkat ini.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login ke WEAR',
        fallbackLabel: 'Gunakan Password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const userRole = await AsyncStorage.getItem('userRole');
        if (userRole === 'nakes') {
          navigation.reset({ index: 0, routes: [{ name: 'NakesTabs' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        }
      }
    } catch (err) {
      console.log('Biometric error:', err);
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ═══ TOP APP BAR (CLEAN) ═══ */}
      <View style={st.header}>
        <Image 
          source={require('../../assets/img/logo_wear.jpeg')} 
          style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} 
        />
        <Text style={st.headerTitle}>WEAR</Text>
      </View>

      {/* ═══ MAIN CONTENT (Centered) ═══ */}
      <View style={st.main}>
        <View style={st.container}>

          {/* ── Fingerprint Icon ── */}
          <TouchableOpacity style={st.fpWrap} onPress={handleBiometricAuth} activeOpacity={0.8}>
            <View style={st.fpCircle}>
              <MaterialIcons name="fingerprint" size={64} color={C.primary} />
            </View>
            {/* Verified badge */}
            <View style={st.verifiedBadge}>
              <MaterialIcons name="verified-user" size={14} color={C.onSecondaryContainer} />
            </View>
          </TouchableOpacity>

          {/* ── Text ── */}
          <View style={st.textBlock}>
            <Text style={st.title}>Otentikasi Biometrik</Text>
            <Text style={st.subtitle}>Sentuh sensor sidik jari untuk melanjutkan</Text>
          </View>

          {/* ── Scanning Indicator ── */}
          <View style={st.scanRow}>
            <Animated.View style={[st.scanDot, { opacity: pulseAnim }]} />
            <Text style={st.scanText}>MENUNGGU PEMINDAIAN</Text>
          </View>

          {/* ── Actions ── */}
          <View style={st.actions}>
            <TouchableOpacity style={st.passwordBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <MaterialIcons name="login" size={24} color={C.secondary} />
              <Text style={st.passwordBtnText}>Masuk dengan Kata Sandi</Text>
            </TouchableOpacity>
            <Text style={st.disclaimer}>
              Data biometrik Anda aman dan hanya disimpan secara lokal di perangkat ini sesuai dengan protokol WEAR.
            </Text>
          </View>

          {/* ── Privacy Shield Cards ── */}
          <View style={st.shieldRow}>
            <View style={st.shieldCard}>
              <MaterialIcons name="admin-panel-settings" size={18} color={C.primary} />
              <Text style={st.shieldText}>Enkripsi End-to-End</Text>
            </View>
            <View style={st.shieldCard}>
              <MaterialIcons name="privacy-tip" size={18} color={C.secondary} />
              <Text style={st.shieldText}>Tanpa Log Biometrik</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  // Header (Clean)
  header: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#012D1D', letterSpacing: 0.5 },

  // Main centered content
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  container: { width: '100%', maxWidth: 320, alignItems: 'center' },

  // Fingerprint
  fpWrap: { marginBottom: 32, position: 'relative' },
  fpCircle: {
    width: 128, height: 128, borderRadius: 64, backgroundColor: '#fff',
    borderWidth: 1, borderColor: C.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.secondaryContainer,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: C.background,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },

  // Text
  textBlock: { alignItems: 'center', gap: 8, marginBottom: 32, paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: C.onSurface, letterSpacing: -0.3, textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant, textAlign: 'center' },

  // Scanning indicator
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  scanDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  scanText: { fontSize: 12, fontWeight: '500', color: C.primary, letterSpacing: 1.2, textTransform: 'uppercase' },

  // Actions
  actions: { width: '100%', gap: 16 },
  passwordBtn: {
    width: '100%', height: 56, borderWidth: 2, borderColor: `${C.secondary}4D`, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  passwordBtnText: { fontSize: 16, fontWeight: '600', color: C.secondary },
  disclaimer: { fontSize: 12, lineHeight: 16, color: C.outline, textAlign: 'center', paddingHorizontal: 16 },

  // Privacy shields
  shieldRow: { flexDirection: 'row', gap: 8, marginTop: 32, width: '100%', opacity: 0.6 },
  shieldCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surfaceContainerLow, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: `${C.outlineVariant}4D`,
  },
  shieldText: { fontSize: 10, fontWeight: '600', lineHeight: 14, color: C.onSurface, flex: 1 },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  navItemActive: { backgroundColor: '#eff6ff' },
  navLabel: { fontSize: 10, fontWeight: '500', color: '#94a3b8', marginTop: 2 },
  navLabelActive: { color: '#012D1D', fontWeight: '700' },
});

export default BiometricAuthScreen;
