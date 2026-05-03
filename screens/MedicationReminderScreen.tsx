import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ── Design Tokens (DESIGN.md – Serene Assurance) ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff', surfaceContainerHighest: '#d5e3fc',
  surfaceVariant: '#d5e3fc', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff', primaryFixed: '#dae2ff', primaryFixedDim: '#b1c5ff',
  secondary: '#6b4ab2', onSecondary: '#ffffff', secondaryContainer: '#b191fd',
  secondaryFixed: '#eaddff', onSecondaryFixed: '#24005b', secondaryFixedDim: '#d1bcff',
  tertiary: '#42495c', error: '#ba1a1a', background: '#f8f9ff', onBackground: '#0d1c2e',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, gutter: 16, margin: 20 } as const;

// ── Props ──
interface MedicationReminderScreenProps {
  compliancePercent?: number;
  morningDoseTime?: string;
  refillDaysLeft?: number;
  refillDate?: string;
  todayDate?: string;
  onMenuPress?: () => void;
  onPrivacyToggle?: () => void;
  onNavPress?: (tab: string) => void;
}

// ── Circular Progress ──
const CircleProgress: React.FC<{ percent: number; size: number }> = ({ percent, size }) => {
  const sw = 6;
  const r = (size - sw) / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: sw, borderColor: 'rgba(255,255,255,0.2)',
      }} />
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: sw, borderColor: '#fff',
        borderRightColor: percent < 100 ? 'rgba(255,255,255,0.2)' : '#fff',
        transform: [{ rotate: '-90deg' }],
      }} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{percent}%</Text>
    </View>
  );
};

// ── Component ──
const MedicationReminderScreen: React.FC<MedicationReminderScreenProps> = ({
  compliancePercent = 98, morningDoseTime = '08:02 AM',
  refillDaysLeft = 12, refillDate = '05 Nov 2023', todayDate = 'Oct 24, 2023',
  onMenuPress, onPrivacyToggle, onNavPress,
}) => {
  const [activeTab, setActiveTab] = useState('Jadwal');
  const handleNav = (tab: string) => { setActiveTab(tab); onNavPress?.(tab); };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* ═══ TOP APP BAR ═══ */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={onMenuPress} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="menu" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>HI!-CARE</Text>
        </View>
        <TouchableOpacity onPress={onPrivacyToggle} style={st.iconBtn} activeOpacity={0.7}>
          <MaterialIcons name="visibility-off" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Adherence Hero ── */}
        <View style={st.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={st.heroTitle}>Tetap Kuat</Text>
            <Text style={st.heroSub}>Kepatuhan ARV harian di {compliancePercent}%</Text>
          </View>
          <CircleProgress percent={compliancePercent} size={80} />
        </View>

        {/* ── Jadwal Hari Ini ── */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionTitle}>Jadwal Hari Ini</Text>
            <Text style={st.sectionDate}>{todayDate}</Text>
          </View>

          {/* Bento Grid */}
          <View style={st.bentoGrid}>
            {/* Taken Dose — full width */}
            <View style={st.doseCard}>
              <View style={st.doseLeft}>
                <View style={st.doseIconWrap}>
                  <MaterialIcons name="check-circle" size={24} color={C.onSecondaryFixed} />
                </View>
                <View>
                  <Text style={st.doseTitle}>Dosis Pagi</Text>
                  <Text style={st.doseTime}>Hari ini, {morningDoseTime}</Text>
                </View>
              </View>
              <View style={st.doseBadge}>
                <Text style={st.doseBadgeText}>SUDAH DIMINUM</Text>
              </View>
            </View>

            {/* Row: Smart Alarms + Refill (half-width) */}
            <View style={st.bentoRow}>
              {/* Smart Alarms */}
              <View style={st.smallCard}>
                <View style={st.smallCardHeader}>
                  <MaterialIcons name="notifications-active" size={24} color={C.primary} />
                  <View style={st.toggleTrack}>
                    <View style={st.toggleThumbOn} />
                  </View>
                </View>
                <Text style={st.smallCardTitle}>Smart Alarms</Text>
                <Text style={st.smallCardSub}>Critical alerts enabled for all daily doses.</Text>
              </View>

              {/* Refill Countdown */}
              <View style={st.smallCard}>
                <View style={st.smallCardHeader}>
                  <MaterialIcons name="calendar-today" size={24} color={C.secondary} />
                  <Text style={st.refillDays}>{refillDaysLeft} Hari</Text>
                </View>
                <Text style={st.smallCardTitle}>Waktu Isi Ulang</Text>
                <Text style={st.smallCardSub}>Resep berakhir pada {refillDate}.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Log Aktivitas ── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Log Aktivitas</Text>
          {/* Timeline Entry */}
          <View style={st.timelineRow}>
            <View style={st.timelineDotCol}>
              <View style={st.timelineDot} />
              <View style={st.timelineLine} />
            </View>
            <View style={st.timelineContent}>
              <Text style={st.timelineDate}>Hari ini, {morningDoseTime}</Text>
              <View style={st.logCard}>
                <MaterialIcons name="history" size={16} color={C.secondary} />
                <Text style={st.logText}>Dosis pagi dicatat (Isentress)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Privacy Section ── */}
        <View style={st.privacyCard}>
          <View style={st.privacyImgWrap}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&q=80' }}
              style={st.privacyImg}
              resizeMode="cover"
            />
          </View>
          <Text style={st.privacyText}>
            Data kesehatan Anda terenkripsi dan tetap sepenuhnya pribadi.
          </Text>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ═══ BOTTOM NAV BAR ═══ */}
      <View style={st.bottomNav}>
        {([
          { icon: 'home', label: 'Beranda' },
          { icon: 'medication', label: 'Jadwal' },
          { icon: 'edit-note', label: 'Log' },
          { icon: 'chat', label: 'Chat' },
          { icon: 'person', label: 'Profil' },
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
  scroll: { paddingHorizontal: S.margin, paddingTop: S.lg },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.margin, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1d4ed8', letterSpacing: -0.3 },

  // Hero
  heroCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.primaryContainer, padding: S.lg, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
    marginBottom: S.lg, overflow: 'hidden',
  },
  heroTitle: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: '#fff', marginBottom: S.xs },
  heroSub: { fontSize: 16, lineHeight: 24, color: C.primaryFixedDim, opacity: 0.9 },

  // Section
  section: { gap: S.md, marginBottom: S.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: C.onBackground },
  sectionDate: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.24, color: C.outline },

  // Bento
  bentoGrid: { gap: S.md },
  bentoRow: { flexDirection: 'row', gap: S.md },

  // Dose Card (full-width)
  doseCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLowest, borderRadius: 12, padding: S.md,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  doseLeft: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  doseIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.secondaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  doseTitle: { fontSize: 16, fontWeight: '600', color: C.onSurface },
  doseTime: { fontSize: 12, fontWeight: '500', lineHeight: 16, color: C.outline },
  doseBadge: {
    backgroundColor: C.secondaryFixed, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999,
  },
  doseBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.onSecondaryFixed, textTransform: 'uppercase' },

  // Small Cards (half-width)
  smallCard: {
    flex: 1, backgroundColor: C.surfaceContainerLow, borderRadius: 12, padding: S.md, gap: S.sm,
  },
  smallCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  smallCardTitle: { fontSize: 14, fontWeight: '700', color: C.onSurface },
  smallCardSub: { fontSize: 10, color: C.outline, lineHeight: 14 },

  // Toggle
  toggleTrack: {
    width: 32, height: 16, borderRadius: 8, backgroundColor: C.primaryContainer, justifyContent: 'center',
  },
  toggleThumbOn: {
    position: 'absolute', right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff',
  },

  // Refill
  refillDays: { fontSize: 12, fontWeight: '700', color: C.secondary },

  // Timeline
  timelineRow: { flexDirection: 'row', gap: S.md },
  timelineDotCol: { alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.secondary },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: S.lg },
  timelineDate: { fontSize: 12, fontWeight: '500', color: C.outline, marginBottom: 4 },
  logCard: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: '#fff', padding: S.md, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  logText: { fontSize: 14, color: C.onSurface },

  // Privacy
  privacyCard: {
    backgroundColor: '#eff6ff', borderRadius: 16, padding: S.xl,
    borderWidth: 1, borderColor: '#dbeafe', alignItems: 'center', gap: S.md,
  },
  privacyImgWrap: {
    width: 128, height: 128, borderRadius: 64, overflow: 'hidden',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbeafe',
  },
  privacyImg: { width: '100%', height: '100%', opacity: 0.6 },
  privacyText: { fontSize: 14, color: C.primary, textAlign: 'center', maxWidth: 200 },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  navItemActive: { backgroundColor: '#eff6ff' },
  navLabel: { fontSize: 10, fontWeight: '500', color: '#94a3b8', marginTop: 2 },
  navLabelActive: { color: '#1d4ed8', fontWeight: '700' },
});

export default MedicationReminderScreen;
