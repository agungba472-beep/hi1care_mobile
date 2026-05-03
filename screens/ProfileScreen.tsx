import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ── Design Tokens ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff', surfaceContainerHighest: '#d5e3fc',
  surfaceVariant: '#d5e3fc', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  primaryFixed: '#dae2ff', onPrimaryFixed: '#001946',
  secondary: '#6b4ab2', onSecondary: '#ffffff', secondaryContainer: '#b191fd', onSecondaryContainer: '#44208a',
  secondaryFixed: '#eaddff', onSecondaryFixed: '#24005b',
  tertiary: '#42495c', error: '#ba1a1a', background: '#f8f9ff', onBackground: '#0d1c2e',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

// ── Types ──
interface ProfileData {
  name: string; patientId: string; avatarUri: string;
  status: string; category: string; adherencePercent: number;
  fullName: string; birthDate: string; regNumber: string; careLocation: string;
  regimenName: string; regimenDose: string; regimenSchedule: string;
}

interface ProfileScreenProps {
  profile?: ProfileData;
  onMenuPress?: () => void;
  onPrivacyToggle?: () => void;
  onAccountSettings?: () => void;
  onLogout?: () => void;
  onNavPress?: (tab: string) => void;
}

const DEFAULT_PROFILE: ProfileData = {
  name: 'Patient User', patientId: 'HI-2024-001',
  avatarUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrHYos1E_JsVaJpbOQcAtqHxIAqVaZdej7j2k4-vLp8WsHjvZsKHLtxQucBGvrKsRsZraYt5e1nAUQxmkh-u0KrrdXKAZwL3NXn9X_w7al4PNgavsmgRa1VwGbld4kZGK9P-I3FBZZ_f-VEFJcGk-0qoc9GU8MtNs2BnYq5EQnFywzEt0TxI9iuDxqZSD5RPkX1XDT_A_80uKQgl6gu8VGdHcD2aighVedcN31lLKrkq3pLYwK2K32oZMhsM3u6iAI11osi28Qob8D',
  status: 'Aktif', category: 'Pasien Rutin', adherencePercent: 98,
  fullName: 'Pasien Terdaftar', birthDate: '12 Januari 1990',
  regNumber: 'PKM-JKT-99283-00', careLocation: 'Puskesmas Gambir',
  regimenName: 'Dolutegravir 50mg', regimenDose: 'Sekali Sehari (Pagi)', regimenSchedule: '',
};

// ── Circular Progress ──
const AdherenceCircle: React.FC<{ percent: number }> = ({ percent }) => (
  <View style={st.circleWrap}>
    <View style={st.circleTrack} />
    <View style={[st.circleTrack, st.circleFill]} />
    <Text style={st.circleText}>{percent}%</Text>
  </View>
);

// ── Toggle Switch ──
const ToggleSwitch: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => (
  <TouchableOpacity style={[st.toggleTrack, value && st.toggleTrackOn]} onPress={onToggle} activeOpacity={0.7}>
    <View style={[st.toggleThumb, value && st.toggleThumbOn]} />
  </TouchableOpacity>
);

// ── Info Field ──
const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={st.infoField}>
    <Text style={st.infoLabel}>{label}</Text>
    <Text style={st.infoValue}>{value}</Text>
  </View>
);

// ── Component ──
const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile = DEFAULT_PROFILE, onMenuPress, onPrivacyToggle,
  onAccountSettings, onLogout, onNavPress,
}) => {
  const [activeTab, setActiveTab] = useState('Profile');
  const [hiddenNotif, setHiddenNotif] = useState(true);
  const [biometricLock, setBiometricLock] = useState(true);
  const handleNav = (tab: string) => { setActiveTab(tab); onNavPress?.(tab); };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ═══ TOP APP BAR ═══ */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={onMenuPress} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="menu" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>HI!-CARE</Text>
        </View>
        <TouchableOpacity onPress={onPrivacyToggle} style={st.iconBtn} activeOpacity={0.7}>
          <MaterialIcons name="visibility-off" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ═══ PROFILE HEADER (Bento) ═══ */}
        <View style={st.profileBento}>
          {/* Avatar Card */}
          <View style={st.avatarCard}>
            <View style={st.avatarWrap}>
              <Image source={{ uri: profile.avatarUri }} style={st.avatar} />
              <View style={st.verifiedBadge}>
                <MaterialIcons name="verified" size={14} color={C.onSecondaryContainer} />
              </View>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={st.profileName} numberOfLines={1}>{profile.name}</Text>
              <Text style={st.profileId} numberOfLines={1}>ID: {profile.patientId}</Text>
              <View style={st.tagRow}>
                <View style={[st.tag, { backgroundColor: C.primaryFixed }]}>
                  <Text style={[st.tagText, { color: C.onPrimaryFixed }]} numberOfLines={1}>Status: {profile.status}</Text>
                </View>
                <View style={[st.tag, { backgroundColor: C.secondaryFixed }]}>
                  <Text style={[st.tagText, { color: C.onSecondaryFixed }]} numberOfLines={1}>{profile.category}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Adherence Card */}
          <View style={st.adherenceCard}>
            <AdherenceCircle percent={profile.adherencePercent} />
            <Text style={st.adherenceLabel}>Adherence Score</Text>
          </View>
        </View>

        {/* ═══ PERSONAL INFO ═══ */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MaterialIcons name="badge" size={24} color={C.primary} />
            <Text style={st.cardTitle}>Informasi Pribadi</Text>
          </View>
          <View style={st.infoGrid}>
            <InfoField label="Nama Lengkap" value={profile.fullName} />
            <InfoField label="Tanggal Lahir" value={profile.birthDate} />
            <InfoField label="Nomor Registrasi Puskesmas" value={profile.regNumber} />
            <InfoField label="Lokasi Perawatan" value={profile.careLocation} />
          </View>
        </View>

        {/* ═══ MEDICAL SUMMARY ═══ */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MaterialIcons name="medical-information" size={24} color={C.secondary} />
            <Text style={st.cardTitle}>Ringkasan Medis</Text>
          </View>
          <View style={st.regimenCard}>
            <MaterialIcons name="medication" size={24} color={C.secondary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={st.regimenLabel}>Regimen Saat Ini</Text>
              <Text style={st.regimenName}>{profile.regimenName}</Text>
              <Text style={st.regimenDose}>{profile.regimenDose}</Text>
            </View>
          </View>
        </View>

        {/* ═══ PRIVACY SETTINGS ═══ */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MaterialIcons name="security" size={24} color={C.primary} />
            <Text style={st.cardTitle}>Pengaturan Privasi</Text>
          </View>
          {/* Toggle 1 */}
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
          {/* Toggle 2 */}
          <View style={st.settingRow}>
            <View style={st.settingLeft}>
              <MaterialIcons name="fingerprint" size={24} color="#64748b" />
              <View style={{ flex: 1 }}>
                <Text style={st.settingTitle}>Kunci Aplikasi / Biometrik</Text>
                <Text style={st.settingDesc}>Minta sidik jari atau PIN saat membuka aplikasi</Text>
              </View>
            </View>
            <ToggleSwitch value={biometricLock} onToggle={() => setBiometricLock(!biometricLock)} />
          </View>
        </View>

        {/* ═══ ACCOUNT MANAGEMENT ═══ */}
        <View style={st.accountSection}>
          <TouchableOpacity style={st.accountBtn} onPress={onAccountSettings} activeOpacity={0.7}>
            <View style={st.accountBtnLeft}>
              <MaterialIcons name="settings" size={24} color={C.onSurface} />
              <Text style={st.accountBtnText}>Pengaturan Akun</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={st.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
            <MaterialIcons name="logout" size={24} color={C.error} />
            <Text style={st.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ═══ BOTTOM NAV ═══ */}
      <View style={st.bottomNav}>
        {([
          { icon: 'home', label: 'Home' }, { icon: 'medication', label: 'Schedule' },
          { icon: 'edit-note', label: 'Log' }, { icon: 'chat', label: 'Chat' }, { icon: 'person', label: 'Profile' },
        ] as { icon: keyof typeof MaterialIcons.glyphMap; label: string }[]).map((item) => {
          const active = activeTab === item.label;
          return (
            <TouchableOpacity key={item.label} style={[st.navItem, active && st.navItemActive]}
              onPress={() => handleNav(item.label)} activeOpacity={0.7}>
              <MaterialIcons name={item.icon} size={24} color={active ? '#1d4ed8' : '#94a3b8'} />
              <Text style={[st.navLabel, active && st.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

// ── Styles ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: S.margin, paddingTop: S.xl, paddingBottom: S.xl },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.margin, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.outlineVariant,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: '#1d4ed8', letterSpacing: -0.3 },

  // Profile Bento
  profileBento: { flexDirection: 'row', gap: S.md, marginBottom: S.xl },
  avatarCard: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: S.md,
    backgroundColor: C.surfaceContainerLowest, borderRadius: 12, padding: S.md,
    borderWidth: 1, borderColor: C.outlineVariant,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: C.primaryFixed },
  verifiedBadge: {
    position: 'absolute', bottom: -2, right: -2, backgroundColor: C.secondaryContainer,
    padding: 2, borderRadius: 12, borderWidth: 2, borderColor: '#fff',
  },
  profileName: { fontSize: 16, fontWeight: '700', lineHeight: 22, color: C.onBackground, textAlign: 'center' },
  profileId: { fontSize: 11, fontWeight: '500', color: C.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.xs, marginTop: S.sm, justifyContent: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  tagText: { fontSize: 10, fontWeight: '600' },

  // Adherence
  adherenceCard: {
    flex: 1, backgroundColor: C.surfaceContainerHighest, borderRadius: 12, padding: S.lg,
    borderWidth: 1, borderColor: C.outlineVariant, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  circleWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  circleTrack: {
    position: 'absolute', width: 96, height: 96, borderRadius: 48,
    borderWidth: 8, borderColor: C.surfaceVariant,
  },
  circleFill: {
    borderColor: C.secondary, borderRightColor: C.surfaceVariant,
    transform: [{ rotate: '-90deg' }],
  },
  circleText: { fontSize: 24, fontWeight: '600', color: C.secondary },
  adherenceLabel: { fontSize: 12, fontWeight: '700', color: C.secondaryContainer, marginTop: S.sm },

  // Card
  card: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: 12, padding: S.lg,
    borderWidth: 1, borderColor: C.outlineVariant, marginBottom: S.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.lg },
  cardTitle: { fontSize: 18, fontWeight: '600', color: C.onSurface },

  // Info fields
  infoGrid: { gap: S.lg },
  infoField: { gap: S.xs },
  infoLabel: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.24, color: C.onSurfaceVariant },
  infoValue: { fontSize: 16, fontWeight: '500', color: C.onBackground },

  // Regimen
  regimenCard: {
    flexDirection: 'row', gap: S.md, alignItems: 'flex-start',
    backgroundColor: C.surfaceContainerLow, borderRadius: 8, padding: S.md,
    borderLeftWidth: 4, borderLeftColor: C.secondary,
  },
  regimenLabel: { fontSize: 12, fontWeight: '500', color: C.onSurfaceVariant, marginBottom: 4 },
  regimenName: { fontSize: 16, fontWeight: '600', color: C.onSurface },
  regimenDose: { fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant },

  // Settings
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1, marginRight: S.md },
  settingTitle: { fontSize: 16, fontWeight: '500', color: C.onSurface },
  settingDesc: { fontSize: 12, color: C.onSurfaceVariant, fontStyle: 'italic' },

  // Toggle
  toggleTrack: {
    width: 48, height: 24, borderRadius: 12, backgroundColor: '#cbd5e1', padding: 4, justifyContent: 'center',
  },
  toggleTrackOn: { backgroundColor: C.primaryContainer },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 24 }] },

  // Account
  accountSection: { gap: S.sm },
  accountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLowest, borderRadius: 12, padding: S.md,
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  accountBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  accountBtnText: { fontSize: 16, fontWeight: '500', color: C.onSurface },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.md,
    backgroundColor: '#fff', borderRadius: 12, padding: S.md,
    borderWidth: 1, borderColor: `${C.error}33`,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: C.error },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.outlineVariant,
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  navItemActive: { backgroundColor: '#eff6ff' },
  navLabel: { fontSize: 10, fontWeight: '500', color: '#94a3b8', marginTop: 2 },
  navLabelActive: { color: '#1d4ed8', fontWeight: '600' },
});

export default ProfileScreen;
