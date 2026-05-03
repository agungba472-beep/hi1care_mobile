import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image, FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ── Design Tokens ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff', surfaceContainerHighest: '#d5e3fc',
  surfaceVariant: '#d5e3fc', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe', onPrimaryContainer: '#d1dcff',
  secondary: '#6b4ab2', secondaryContainer: '#b191fd', onSecondaryContainer: '#44208a',
  secondaryFixed: '#eaddff', onSecondaryFixed: '#24005b',
  tertiary: '#42495c', tertiaryContainer: '#596175', onTertiaryContainer: '#d5dcf4',
  tertiaryFixed: '#dbe2fa', onTertiaryFixed: '#141b2c',
  error: '#ba1a1a', errorContainer: '#ffdad6', background: '#f8f9ff',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, gutter: 16, margin: 20 } as const;

// ── Types ──
interface FacilityItem {
  id: string; name: string; type: 'hospital' | 'puskesmas' | 'mandiri';
  distance: string; distanceIcon: keyof typeof MaterialIcons.glyphMap;
  isOpen: boolean; closeTime: string;
  services: { label: string; color: string; textColor: string }[];
}

interface HealthFacilityScreenProps {
  facilities?: FacilityItem[];
  userLocation?: string;
  onMenuPress?: () => void;
  onPrivacyToggle?: () => void;
  onSearch?: (query: string) => void;
  onFilterPress?: (filter: string) => void;
  onRoutePress?: (id: string) => void;
  onNavPress?: (tab: string) => void;
}

// ── Filter Chips ──
const FILTERS: { label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { label: 'Terdekat', icon: 'location-on' },
  { label: 'Rumah Sakit', icon: 'local-hospital' },
  { label: 'Puskesmas', icon: 'medical-services' },
  { label: 'Mandiri', icon: 'verified' },
];

// ── Sample Data ──
const SAMPLE_FACILITIES: FacilityItem[] = [
  {
    id: '1', name: 'RSUD Pasar Minggu', type: 'hospital', distance: '1.2 km', distanceIcon: 'directions-walk',
    isOpen: true, closeTime: 'Tutup 21:00',
    services: [
      { label: 'ARV', color: C.secondaryContainer, textColor: C.onSecondaryContainer },
      { label: 'V-L', color: C.primaryContainer, textColor: C.onPrimaryContainer },
      { label: '+2', color: C.tertiaryContainer, textColor: C.onTertiaryContainer },
    ],
  },
  {
    id: '2', name: 'Puskesmas Tebet', type: 'puskesmas', distance: '2.8 km', distanceIcon: 'directions-walk',
    isOpen: true, closeTime: 'Tutup 16:00',
    services: [
      { label: 'ARV', color: C.secondaryContainer, textColor: C.onSecondaryContainer },
      { label: 'PDP', color: C.primaryContainer, textColor: C.onPrimaryContainer },
    ],
  },
  {
    id: '3', name: 'RS Medistra', type: 'hospital', distance: '4.5 km', distanceIcon: 'directions-car',
    isOpen: false, closeTime: 'Buka 08:00 Besok',
    services: [
      { label: 'ARV', color: C.secondaryContainer, textColor: C.onSecondaryContainer },
    ],
  },
];

const getTypeBadge = (type: FacilityItem['type']) => {
  if (type === 'hospital') return { label: 'Rumah Sakit', bg: C.secondaryFixed, color: C.onSecondaryFixed };
  if (type === 'puskesmas') return { label: 'Puskesmas', bg: C.tertiaryFixed, color: C.onTertiaryFixed };
  return { label: 'Mandiri', bg: C.surfaceContainerHigh, color: C.onSurfaceVariant };
};

// ── Component ──
const HealthFacilityScreen: React.FC<HealthFacilityScreenProps> = ({
  facilities = SAMPLE_FACILITIES, userLocation = 'Jakarta Selatan',
  onMenuPress, onPrivacyToggle, onSearch, onFilterPress, onRoutePress, onNavPress,
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('Terdekat');
  const [activeTab, setActiveTab] = useState('');

  const handleFilter = (f: string) => { setActiveFilter(f); onFilterPress?.(f); };
  const handleNav = (tab: string) => { setActiveTab(tab); onNavPress?.(tab); };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ═══ TOP APP BAR ═══ */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={onMenuPress} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="menu" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>HI!-CARE</Text>
        </View>
        <View style={st.headerRight}>
          <Text style={st.headerSubtitle}>Fasilitas Kesehatan</Text>
          <TouchableOpacity onPress={onPrivacyToggle} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="visibility-off" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Headline ── */}
        <View style={st.headline}>
          <Text style={st.headlineTitle}>Layanan ARV</Text>
          <Text style={st.headlineDesc}>Temukan fasilitas kesehatan terdekat yang menyediakan layanan pengobatan ARV dengan aman dan nyaman.</Text>
        </View>

        {/* ── Search ── */}
        <View style={st.searchWrap}>
          <View style={st.searchBar}>
            <MaterialIcons name="search" size={24} color={C.outline} />
            <TextInput style={st.searchInput} placeholder="Cari nama faskes atau lokasi..." placeholderTextColor={C.outline}
              value={searchText} onChangeText={(t) => { setSearchText(t); onSearch?.(t); }} />
          </View>
          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
            {FILTERS.map((f) => {
              const active = activeFilter === f.label;
              return (
                <TouchableOpacity key={f.label} style={[st.chip, active && st.chipActive]}
                  onPress={() => handleFilter(f.label)} activeOpacity={0.7}>
                  <MaterialIcons name={f.icon} size={18} color={active ? C.onPrimary : C.onSurfaceVariant} />
                  <Text style={[st.chipText, active && st.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Map Preview ── */}
        <View style={st.mapCard}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=600&q=80' }}
            style={st.mapImg} resizeMode="cover" />
          <View style={st.mapOverlay}>
            <View style={st.mapBadge}>
              <MaterialIcons name="my-location" size={16} color={C.primary} />
              <Text style={st.mapBadgeText}>Lokasi Anda: {userLocation}</Text>
            </View>
          </View>
        </View>

        {/* ── Facility List ── */}
        <Text style={st.listTitle}>Fasilitas Terdekat</Text>
        {facilities.map((fac) => {
          const badge = getTypeBadge(fac.type);
          const closed = !fac.isOpen;
          return (
            <View key={fac.id} style={[st.card, closed && { opacity: 0.8 }]}>
              {/* Top Row */}
              <View style={st.cardTop}>
                <View style={st.cardTopLeft}>
                  <View style={[st.facIcon, closed && { backgroundColor: C.surfaceContainerHighest }]}>
                    <MaterialIcons name={fac.type === 'puskesmas' ? 'medical-services' : 'local-hospital'}
                      size={28} color={closed ? C.outline : C.primary} />
                  </View>
                  <View>
                    <Text style={st.facName}>{fac.name}</Text>
                    <View style={st.facMeta}>
                      <View style={[st.typeBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[st.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                      <View style={st.distRow}>
                        <MaterialIcons name={fac.distanceIcon} size={14} color={C.outline} />
                        <Text style={st.distText}>{fac.distance}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={st.statusCol}>
                  <View style={[st.statusBadge, closed ? st.statusClosed : st.statusOpen]}>
                    <View style={[st.statusDot, { backgroundColor: closed ? C.error : '#16a34a' }]} />
                    <Text style={[st.statusText, { color: closed ? C.error : '#16a34a' }]}>{closed ? 'Tutup' : 'Buka'}</Text>
                  </View>
                  <Text style={st.closeTime}>{fac.closeTime}</Text>
                </View>
              </View>
              {/* Bottom Row */}
              <View style={st.cardBottom}>
                <View style={st.serviceRow}>
                  {fac.services.map((s, i) => (
                    <View key={i} style={[st.servicePill, { backgroundColor: s.color, marginLeft: i > 0 ? -8 : 0 }]}>
                      <Text style={[st.servicePillText, { color: s.textColor }]}>{s.label}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={[st.routeBtn, closed && st.routeBtnDisabled]}
                  onPress={() => !closed && onRoutePress?.(fac.id)} activeOpacity={closed ? 1 : 0.85} disabled={closed}>
                  <MaterialIcons name="directions" size={18} color={C.onPrimary} />
                  <Text style={st.routeBtnText}>Route</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ═══ BOTTOM NAV ═══ */}
      <View style={st.bottomNav}>
        {([
          { icon: 'home', label: 'Beranda' }, { icon: 'medication', label: 'Jadwal' },
          { icon: 'edit-note', label: 'Log' }, { icon: 'chat', label: 'Chat' }, { icon: 'person', label: 'Profil' },
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
  safe: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingHorizontal: S.margin, paddingTop: 24 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.margin, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { padding: 4, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1d4ed8', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 14, fontWeight: '600', color: '#1d4ed8' },

  // Headline
  headline: { marginBottom: 32 },
  headlineTitle: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.64, color: C.primary, marginBottom: 8 },
  headlineDesc: { fontSize: 16, lineHeight: 24, color: C.onSurfaceVariant },

  // Search
  searchWrap: { marginBottom: 32, gap: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 2, borderColor: C.surfaceContainerHighest, borderRadius: 12, paddingHorizontal: 16, height: 52,
  },
  searchInput: { flex: 1, fontSize: 16, lineHeight: 24, color: C.onSurface, marginLeft: 12, paddingVertical: 0 },
  filterRow: { gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999,
    backgroundColor: C.surfaceContainerHigh,
  },
  chipActive: { backgroundColor: C.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: C.onSurfaceVariant },
  chipTextActive: { color: C.onPrimary },

  // Map
  mapCard: {
    height: 192, borderRadius: 16, overflow: 'hidden', marginBottom: 32,
    shadowColor: C.primaryContainer, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  mapImg: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  mapBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  mapBadgeText: { fontSize: 12, fontWeight: '700', color: C.primary },

  // List
  listTitle: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: C.onSurface, marginBottom: 16, paddingHorizontal: 4 },

  // Facility Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: `${C.surfaceVariant}80`,
    borderRadius: 16, padding: 16, marginBottom: 16, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTopLeft: { flexDirection: 'row', gap: 16, flex: 1 },
  facIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: `${C.primaryContainer}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
  facName: { fontSize: 18, fontWeight: '700', color: C.onSurface },
  facMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distText: { fontSize: 12, color: C.outline },
  statusCol: { alignItems: 'flex-end' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  statusOpen: { backgroundColor: '#f0fdf4' },
  statusClosed: { backgroundColor: `${C.errorContainer}4D` },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  closeTime: { fontSize: 10, color: C.outline, fontStyle: 'italic', marginTop: 4 },

  // Card bottom
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.surfaceContainer, paddingTop: 12 },
  serviceRow: { flexDirection: 'row' },
  servicePill: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fff',
  },
  servicePillText: { fontSize: 10, fontWeight: '700' },
  routeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary,
    paddingHorizontal: 24, paddingVertical: 8, borderRadius: 12,
  },
  routeBtnDisabled: { backgroundColor: C.outline, opacity: 0.7 },
  routeBtnText: { fontSize: 14, fontWeight: '700', color: C.onPrimary },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.9)', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    shadowColor: C.primaryContainer, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  navItemActive: { backgroundColor: '#eff6ff' },
  navLabel: { fontSize: 10, fontWeight: '500', color: '#94a3b8', marginTop: 2 },
  navLabelActive: { color: '#1d4ed8', fontWeight: '700' },
});

export default HealthFacilityScreen;
