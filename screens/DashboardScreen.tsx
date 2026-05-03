import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// ── Design Tokens (DESIGN.md – Serene Assurance) ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff', surfaceContainerHighest: '#d5e3fc',
  surfaceVariant: '#d5e3fc', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff', primaryFixed: '#dae2ff',
  secondary: '#6b4ab2', onSecondary: '#ffffff', secondaryContainer: '#b191fd',
  tertiary: '#42495c', error: '#ba1a1a', background: '#f8f9ff',
  inverseSurface: '#233144', inverseOnSurface: '#eaf1ff',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, gutter: 16, margin: 20 } as const;
const { width: SCREEN_W } = Dimensions.get('window');
const BENTO_HALF = (SCREEN_W - S.margin * 2 - S.gutter) / 2;

// ── Props ──
interface DashboardScreenProps {
  userName?: string;
  compliancePercent?: number;
  complianceDelta?: string;
  onMenuPress?: () => void;
  onPrivacyToggle?: () => void;
  onProfilePress?: () => void;
  onTakeMedicine?: () => void;
  onChatNakes?: () => void;
  onEducation?: () => void;
  onSearchFacility?: () => void;
  onViewAllTips?: () => void;
  onFabPress?: () => void;
}

// ── Circular Progress ──
const CircularProgress: React.FC<{ percent: number; size: number; strokeWidth: number }> = ({
  percent, size, strokeWidth,
}) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: C.surfaceContainerHigh,
      }} />
      {/* Progress – simplified as a thick bordered circle with clip */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: C.primary,
        borderTopColor: offset > circumference * 0.75 ? C.surfaceContainerHigh : C.primary,
        transform: [{ rotate: '-90deg' }],
      }} />
      <MaterialIcons name="verified" size={24} color={C.primary} />
    </View>
  );
};

// ── Component ──
const DashboardScreen: React.FC<DashboardScreenProps> = ({
  userName = 'Patient User', compliancePercent = 98, complianceDelta = '+2% dari minggu lalu',
  onMenuPress, onPrivacyToggle, onProfilePress, onTakeMedicine,
  onChatNakes, onEducation, onSearchFacility, onViewAllTips, onFabPress,
}) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* ═══ TOP APP BAR ═══ */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={onMenuPress} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="menu" size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>HI!-CARE</Text>
        </View>
        <View style={st.headerRight}>
          <TouchableOpacity onPress={onPrivacyToggle} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="visibility-off" size={24} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)} activeOpacity={0.7}>
            <View style={st.avatar}>
              <MaterialIcons name="person" size={20} color={C.onPrimary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Greeting ── */}
        <View style={st.greeting}>
          <View style={st.greetRow}>
            <Text style={st.greetName}>Hello, {userName}</Text>
            <Text style={st.greetDay}>Hari ini Senin</Text>
          </View>
          <Text style={st.greetSub}>Tetap konsisten dengan perawatan Anda hari ini. Anda luar biasa!</Text>
        </View>

        {/* ── BENTO GRID ── */}
        <View style={st.bentoGrid}>

          {/* Card: Kepatuhan Obat (full width) */}
          <View style={st.complianceCard}>
            <View style={{ gap: S.sm, flex: 1 }}>
              <Text style={st.labelUpper}>KEPATUHAN OBAT</Text>
              <Text style={st.complianceVal}>{compliancePercent}%</Text>
              <View style={st.trendRow}>
                <MaterialIcons name="trending-up" size={14} color={C.secondary} />
                <Text style={st.trendText}>{complianceDelta}</Text>
              </View>
            </View>
            <CircularProgress percent={compliancePercent} size={80} strokeWidth={6} />
          </View>

          {/* Card: Resimen Hari Ini (full width) */}
          <View style={st.regimenCard}>
            <View style={st.regimenHeader}>
              <View style={st.regimenTitleRow}>
                <View style={st.regimenIconWrap}>
                  <MaterialIcons name="medication" size={20} color="#fff" />
                </View>
                <Text style={st.regimenTitle}>Resimen Hari Ini</Text>
              </View>
              <View style={st.priorityBadge}>
                <Text style={st.priorityText}>PRIORITAS</Text>
              </View>
            </View>
            {/* ARV Item */}
            <View style={st.arvItem}>
              <View style={st.arvLeft}>
                <View style={st.arvIconWrap}>
                  <MaterialIcons name="schedule" size={16} color="#fff" />
                </View>
                <View>
                  <Text style={st.arvName}>ARV (Dolutegravir)</Text>
                  <Text style={st.arvDose}>Minum 1x sehari</Text>
                </View>
              </View>
              <TouchableOpacity style={st.arvBtn} onPress={onTakeMedicine} activeOpacity={0.85}>
                <Text style={st.arvBtnText}>MINUM SEKARANG</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Row: Chat + Edukasi (half-width each) */}
          <View style={st.bentoRow}>
            {/* Chat Nakes */}
            <View style={[st.quickCard, { width: BENTO_HALF }]}>
              <MaterialIcons name="forum" size={24} color={C.secondary} />
              <View>
                <Text style={st.quickTitle}>Chat dengan Nakes</Text>
                <Text style={st.quickSub}>Dukungan profesional 24/7</Text>
              </View>
              <TouchableOpacity style={[st.quickBtn, { backgroundColor: C.secondary }]} onPress={() => navigation.navigate('Chat' as never)} activeOpacity={0.85}>
                <Text style={st.quickBtnText}>Chat Sekarang</Text>
              </TouchableOpacity>
            </View>
            {/* Edukasi */}
            <View style={[st.quickCard, { width: BENTO_HALF }]}>
              <MaterialIcons name="menu-book" size={24} color={C.primary} />
              <View>
                <Text style={st.quickTitle}>Edukasi</Text>
                <Text style={st.quickSub}>Tips & sumber daya perawatan</Text>
              </View>
              <TouchableOpacity style={[st.quickBtn, { backgroundColor: C.primary }]} onPress={() => navigation.navigate('Education' as never)} activeOpacity={0.85}>
                <Text style={st.quickBtnText}>Jelajahi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cari Faskes (full width) */}
          <View style={st.faskesCard}>
            <View style={st.faskesLeft}>
              <MaterialIcons name="local-hospital" size={28} color={C.primary} />
              <View>
                <Text style={st.quickTitle}>Cari Fasilitas Kesehatan</Text>
                <Text style={st.quickSub}>Temukan klinik & RS terdekat</Text>
              </View>
            </View>
            <TouchableOpacity style={[st.quickBtn, { backgroundColor: C.primary, paddingHorizontal: 16 }]} onPress={() => navigation.navigate('HealthFacility' as never)} activeOpacity={0.85}>
              <Text style={st.quickBtnText}>Cari</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tips Kesehatan Harian ── */}
        <View style={st.tipsSection}>
          <View style={st.tipsTitleRow}>
            <Text style={st.tipsTitle}>Tips Kesehatan Harian</Text>
            <TouchableOpacity onPress={onViewAllTips} activeOpacity={0.7}>
              <Text style={st.tipsLink}>LIHAT SEMUA</Text>
            </TouchableOpacity>
          </View>
          <View style={st.articleCard}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&q=80' }}
              style={st.articleImg}
              resizeMode="cover"
            />
            <View style={st.articleOverlay}>
              <Text style={st.articleTitle}>Managing Fatigue: Small Steps for Big Changes</Text>
              <Text style={st.articleMeta}>3 min read • Nutrition & Wellness</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ═══ FAB ═══ */}
      <TouchableOpacity style={st.fab} onPress={onFabPress} activeOpacity={0.85}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { padding: 4, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1d4ed8', letterSpacing: -0.3 },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },

  // Greeting
  greeting: { gap: S.sm, marginBottom: S.lg },
  greetRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  greetName: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: C.onSurface },
  greetDay: { fontSize: 14, color: C.secondary },
  greetSub: { fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant },

  // Bento Grid
  bentoGrid: { gap: S.gutter },
  bentoRow: { flexDirection: 'row', gap: S.gutter },

  // Compliance
  complianceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLowest, borderRadius: 12, padding: S.md,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#1e3a5f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  labelUpper: {
    fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 1.2,
    color: C.outline, textTransform: 'uppercase',
  },
  complianceVal: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: C.primary },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: 12, fontWeight: '600', color: C.secondary },

  // Regimen
  regimenCard: {
    backgroundColor: C.primaryContainer, borderRadius: 12, padding: S.md, gap: S.md,
    shadowColor: '#1e3a5f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  regimenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  regimenTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regimenIconWrap: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 4, borderRadius: 8 },
  regimenTitle: { fontSize: 18, fontWeight: '700', lineHeight: 28, color: C.onPrimaryContainer },
  priorityBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: C.onPrimaryContainer, textTransform: 'uppercase' },
  arvItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: S.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  arvLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arvIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  arvName: { fontSize: 14, fontWeight: '700', color: C.onPrimaryContainer },
  arvDose: { fontSize: 12, color: C.onPrimaryContainer, opacity: 0.8 },
  arvBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  arvBtnText: { fontSize: 10, fontWeight: '700', color: C.primary },

  // Quick Access Cards
  quickCard: {
    backgroundColor: C.surfaceContainerLow, borderRadius: 12, padding: S.md,
    borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'space-between', gap: S.sm,
  },
  quickTitle: { fontSize: 14, fontWeight: '700', color: C.onSurface },
  quickSub: { fontSize: 10, color: C.outline },
  quickBtn: { paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: S.sm },
  quickBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Faskes
  faskesCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerHigh, borderRadius: 12, padding: S.md,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#1e3a5f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  faskesLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },

  // Tips Section
  tipsSection: { gap: S.md, marginTop: S.lg },
  tipsTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipsTitle: { fontSize: 18, fontWeight: '600', lineHeight: 28, color: C.onSurface },
  tipsLink: { fontSize: 12, fontWeight: '700', color: C.primary, textTransform: 'uppercase' },
  articleCard: { borderRadius: 16, overflow: 'hidden', aspectRatio: 16 / 9, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  articleImg: { width: '100%', height: '100%' },
  articleOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: S.md, paddingBottom: S.md, paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  articleTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  articleMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
});

export default DashboardScreen;
