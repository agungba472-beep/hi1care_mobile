import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../api';

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
interface FaskesItem {
  id: number;
  nama: string;
  alamat?: string;
  kontak?: string;
  tipe?: string;
  layanan?: string;
}

// ── Filter Chips ──
const FILTERS: { label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { label: 'Semua', icon: 'location-on' },
  { label: 'Rumah Sakit', icon: 'local-hospital' },
  { label: 'Puskesmas', icon: 'medical-services' },
  { label: 'Mandiri', icon: 'verified' },
];

// ── Helper ──
const getTypeIcon = (tipe?: string): keyof typeof MaterialIcons.glyphMap => {
  if (!tipe) return 'local-hospital';
  const t = tipe.toLowerCase();
  if (t.includes('puskesmas')) return 'medical-services';
  if (t.includes('mandiri') || t.includes('klinik')) return 'verified';
  return 'local-hospital';
};

const getTypeBadge = (tipe?: string) => {
  if (!tipe) return { label: 'Faskes', bg: C.surfaceContainerHigh, color: C.onSurfaceVariant };
  const t = tipe.toLowerCase();
  if (t.includes('rumah sakit') || t.includes('rs')) return { label: 'Rumah Sakit', bg: C.secondaryFixed, color: C.onSecondaryFixed };
  if (t.includes('puskesmas')) return { label: 'Puskesmas', bg: C.tertiaryFixed, color: C.onTertiaryFixed };
  if (t.includes('mandiri')) return { label: 'Mandiri', bg: C.surfaceContainerHigh, color: C.onSurfaceVariant };
  return { label: tipe, bg: C.surfaceContainerHigh, color: C.onSurfaceVariant };
};

// ── Component ──
const HealthFacilityScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<FaskesItem[]>([]);

  // ── Fetch Faskes dari API ──
  const fetchFaskes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/faskes');
      const raw = res.data.data;
      if (Array.isArray(raw)) {
        setFacilities(raw);
      } else if (raw?.data && Array.isArray(raw.data)) {
        setFacilities(raw.data);
      } else {
        setFacilities([]);
      }
    } catch (err: any) {
      console.log('[Faskes] Error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchFaskes(); }, [fetchFaskes]));

  // ── Filter logic ──
  const filteredFacilities = facilities.filter((f) => {
    const matchSearch = !searchText.trim()
      || f.nama?.toLowerCase().includes(searchText.toLowerCase())
      || f.alamat?.toLowerCase().includes(searchText.toLowerCase());

    const matchFilter = activeFilter === 'Semua'
      || (activeFilter === 'Rumah Sakit' && (f.tipe?.toLowerCase().includes('rumah sakit') || f.tipe?.toLowerCase().includes('rs')))
      || (activeFilter === 'Puskesmas' && f.tipe?.toLowerCase().includes('puskesmas'))
      || (activeFilter === 'Mandiri' && f.tipe?.toLowerCase().includes('mandiri'));

    return matchSearch && matchFilter;
  });

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={st.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={st.loadingText}>Memuat fasilitas kesehatan...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ═══ TOP APP BAR ═══ */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Fasilitas Kesehatan</Text>
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
              value={searchText} onChangeText={setSearchText} />
          </View>
          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
            {FILTERS.map((f) => {
              const active = activeFilter === f.label;
              return (
                <TouchableOpacity key={f.label} style={[st.chip, active && st.chipActive]}
                  onPress={() => setActiveFilter(f.label)} activeOpacity={0.7}>
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
              <Text style={st.mapBadgeText}>Peta Lokasi Faskes</Text>
            </View>
          </View>
        </View>

        {/* ── Facility List ── */}
        <View style={st.listHeaderRow}>
          <Text style={st.listTitle}>Fasilitas Terdekat</Text>
          <Text style={st.listCount}>{filteredFacilities.length} faskes</Text>
        </View>

        {filteredFacilities.length > 0 ? (
          filteredFacilities.map((fac) => {
            const badge = getTypeBadge(fac.tipe);
            return (
              <View key={fac.id} style={st.card}>
                {/* Top Row */}
                <View style={st.cardTop}>
                  <View style={st.cardTopLeft}>
                    <View style={st.facIcon}>
                      <MaterialIcons name={getTypeIcon(fac.tipe)} size={28} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.facName}>{fac.nama}</Text>
                      <View style={st.facMeta}>
                        <View style={[st.typeBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[st.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Info Rows */}
                <View style={st.infoSection}>
                  {fac.alamat ? (
                    <View style={st.infoRow}>
                      <MaterialIcons name="place" size={18} color={C.outline} />
                      <Text style={st.infoText}>{fac.alamat}</Text>
                    </View>
                  ) : null}
                  {fac.kontak ? (
                    <View style={st.infoRow}>
                      <MaterialIcons name="phone" size={18} color={C.outline} />
                      <Text style={st.infoText}>{fac.kontak}</Text>
                    </View>
                  ) : null}
                  {fac.layanan ? (
                    <View style={st.infoRow}>
                      <MaterialIcons name="medical-services" size={18} color={C.outline} />
                      <Text style={st.infoText}>{fac.layanan}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <View style={st.emptyState}>
            <MaterialIcons name="location-off" size={48} color={C.outlineVariant} />
            <Text style={st.emptyTitle}>Fasilitas tidak ditemukan</Text>
            <Text style={st.emptySub}>Coba ubah kata kunci pencarian atau filter.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ──
const st = StyleSheet.create({
  /* Loading */
  loadingContainer: {
    flex: 1, backgroundColor: C.background,
    justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { marginTop: S.md, fontSize: 16, color: C.outline },

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
  iconBtn: { padding: 4, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1d4ed8', letterSpacing: -0.3 },

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

  // List header
  listHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: 16, paddingHorizontal: 4,
  },
  listTitle: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: C.onSurface },
  listCount: { fontSize: 12, fontWeight: '500', color: C.outline },

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

  // Info rows
  infoSection: {
    gap: 10, borderTopWidth: 1, borderTopColor: C.surfaceContainer, paddingTop: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { fontSize: 14, lineHeight: 20, color: C.onSurfaceVariant, flex: 1 },

  // Empty State
  emptyState: {
    alignItems: 'center', paddingVertical: S.xl * 2, gap: S.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: C.onSurface },
  emptySub: { fontSize: 14, color: C.outline, textAlign: 'center' },
});

export default HealthFacilityScreen;
