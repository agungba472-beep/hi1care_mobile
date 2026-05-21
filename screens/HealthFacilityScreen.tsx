import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../src/api';

import MapSection from '../components/MapSection';

// ── Design Tokens ──
const C = {
  bg: '#f0f4ff', surface: '#ffffff',
  primary: '#0043a2', primaryLight: '#e8f0fe', primaryDark: '#002d6e',
  onPrimary: '#ffffff', onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  secondary: '#6b4ab2', secondaryLight: '#eaddff',
  success: '#16a34a', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fef3c7',
  error: '#dc2626',
  cardShadow: '#0043a2',
} as const;

const { height: SCREEN_H } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_H * 0.42;
const CARD_RADIUS = 20;

// ── Types ──
interface FaskesItem {
  id: number;
  nama: string;
  alamat?: string;
  kontak?: string;
  tipe?: string;
  layanan?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  calculatedDistance?: number | null;
}

interface UserCoords { latitude: number; longitude: number; }

// ── Helpers ──
const getTypeIcon = (tipe?: string): keyof typeof MaterialIcons.glyphMap => {
  if (!tipe) return 'local-hospital';
  const t = tipe.toLowerCase();
  if (t.includes('puskesmas')) return 'medical-services';
  if (t.includes('mandiri') || t.includes('klinik')) return 'verified';
  return 'local-hospital';
};

const getTypeBadge = (tipe?: string) => {
  if (!tipe) return { label: 'Faskes', bg: '#e8edf5', color: C.onSurfaceVariant };
  const t = tipe.toLowerCase();
  if (t.includes('rumah sakit') || t.includes('rs')) return { label: 'Rumah Sakit', bg: C.secondaryLight, color: '#44208a' };
  if (t.includes('puskesmas')) return { label: 'Puskesmas', bg: '#dbe2fa', color: '#141b2c' };
  if (t.includes('mandiri')) return { label: 'Mandiri', bg: '#e8edf5', color: C.onSurfaceVariant };
  return { label: tipe, bg: '#e8edf5', color: C.onSurfaceVariant };
};

/** Haversine — jarak antara 2 koordinat GPS dalam KM */
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km: number): string => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════
const HealthFacilityScreen: React.FC = () => {
  const navigation = useNavigation();

  // Location
  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);

  // Faskes
  const [facilities, setFacilities] = useState<FaskesItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  // ── 1) GPS Permission & Position ──
  useEffect(() => {
    (async () => {
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLocationDenied(true); setLocationLoading(false); return; }
        const pos = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e: any) {
        console.log('[Faskes] Location err:', e.message);
        setLocationDenied(true);
      } finally { setLocationLoading(false); }
    })();
  }, []);

  // ── 2) Fetch faskes ──
  const fetchFaskes = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await api.get('/faskes');
      const raw = res.data.data;
      setFacilities(Array.isArray(raw) ? raw : raw?.data && Array.isArray(raw.data) ? raw.data : []);
    } catch (e: any) { console.log('[Faskes] API err:', e.message); }
    finally { setDataLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchFaskes(); }, [fetchFaskes]));

  // ── 3) Calculate distance & sort ──
  const processedFacilities = (() => {
    let list = facilities.map(f => {
      let dist: number | null = null;
      if (userLocation && f.latitude != null && f.longitude != null) {
        const fLat = typeof f.latitude === 'string' ? parseFloat(f.latitude) : f.latitude;
        const fLon = typeof f.longitude === 'string' ? parseFloat(f.longitude) : f.longitude;
        if (!isNaN(fLat) && !isNaN(fLon)) {
          dist = haversineDistance(userLocation.latitude, userLocation.longitude, fLat, fLon);
        }
      }
      return { ...f, calculatedDistance: dist };
    });

    list.sort((a, b) => {
      if (a.calculatedDistance == null && b.calculatedDistance == null) return 0;
      if (a.calculatedDistance == null) return 1;
      if (b.calculatedDistance == null) return -1;
      return a.calculatedDistance - b.calculatedDistance;
    });

    return list.filter(f => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return f.nama?.toLowerCase().includes(q) || f.alamat?.toLowerCase().includes(q);
    });
  })();

  const isLoading = locationLoading || dataLoading;

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── HEADER ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={C.onPrimary} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>HI!-CARE</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* ── LOADING OVERLAY ── */}
      {isLoading ? (
        <View style={st.loadingWrap}>
          <View style={st.loadingCircle}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
          <Text style={st.loadingTitle}>
            {locationLoading ? 'Mencari lokasi Anda...' : 'Memuat data faskes...'}
          </Text>
          <Text style={st.loadingSub}>
            {locationLoading ? 'Menggunakan GPS untuk jarak terdekat' : 'Mengambil data fasilitas kesehatan'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* ═══════════════════════════════════════ */}
          {/* TOP HALF — MAP                         */}
          {/* ═══════════════════════════════════════ */}
          <MapSection mapHeight={MAP_HEIGHT} userLocation={userLocation} faskesData={processedFacilities} />

          {/* ═══════════════════════════════════════ */}
          {/* BOTTOM HALF — FASKES LIST               */}
          {/* ═══════════════════════════════════════ */}
          <View style={st.listSheet}>
            {/* Drag handle */}
            <View style={st.sheetHandle} />

            {/* Location warning */}
            {locationDenied && (
              <View style={st.warningBanner}>
                <MaterialIcons name="location-off" size={16} color={C.warning} />
                <Text style={st.warningText}>Izin lokasi ditolak — jarak tidak dapat dihitung</Text>
              </View>
            )}

            {/* Search */}
            <View style={st.searchBar}>
              <MaterialIcons name="search" size={20} color={C.outline} />
              <TextInput
                style={st.searchInput}
                placeholder="Cari faskes..."
                placeholderTextColor={C.outlineVariant}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <MaterialIcons name="close" size={18} color={C.outline} />
                </TouchableOpacity>
              )}
            </View>

            {/* Count */}
            <View style={st.listHeaderRow}>
              <Text style={st.listTitle}>Faskes Terdekat</Text>
              <Text style={st.listCount}>{processedFacilities.length} lokasi</Text>
            </View>

            {/* Cards */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.listScroll}>
              {processedFacilities.length > 0 ? (
                processedFacilities.map((fac, idx) => {
                  const badge = getTypeBadge(fac.tipe);
                  const hasDist = fac.calculatedDistance != null;
                  return (
                    <View key={fac.id} style={st.card}>
                      <View style={st.cardHeader}>
                        <View style={st.facIconWrap}>
                          <MaterialIcons name={getTypeIcon(fac.tipe)} size={22} color={C.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={st.facName}>{fac.nama}</Text>
                          <View style={st.badgeRow}>
                            <View style={[st.typeBadge, { backgroundColor: badge.bg }]}>
                              <Text style={[st.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                            </View>
                            {hasDist && (
                              <View style={st.distBadge}>
                                <MaterialIcons name="near-me" size={11} color={C.primary} />
                                <Text style={st.distBadgeText}>{formatDistance(fac.calculatedDistance!)}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {hasDist && idx < 3 && (
                          <View style={st.rankBadge}>
                            <Text style={st.rankText}>#{idx + 1}</Text>
                          </View>
                        )}
                      </View>

                      <View style={st.infoSection}>
                        {fac.alamat ? (
                          <View style={st.infoRow}>
                            <MaterialIcons name="place" size={15} color={C.outline} />
                            <Text style={st.infoText}>{fac.alamat}</Text>
                          </View>
                        ) : null}
                        {fac.kontak ? (
                          <View style={st.infoRow}>
                            <MaterialIcons name="phone" size={15} color={C.outline} />
                            <Text style={st.infoText}>{fac.kontak}</Text>
                          </View>
                        ) : null}
                        {hasDist && (
                          <View style={st.distRow}>
                            <MaterialIcons name="directions-walk" size={15} color={C.success} />
                            <Text style={st.distFullText}>{formatDistance(fac.calculatedDistance!)} dari lokasi Anda</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={st.emptyState}>
                  <MaterialIcons name="location-off" size={40} color={C.outlineVariant} />
                  <Text style={st.emptyTitle}>Tidak ditemukan</Text>
                  <Text style={st.emptySub}>Coba ubah kata kunci pencarian.</Text>
                </View>
              )}
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const SHADOW = {
  shadowColor: C.cardShadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 5,
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 4,
    paddingBottom: 12,
  },
  backBtn: { padding: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.onPrimary, letterSpacing: 0.5 },

  // ── Loading ──
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  loadingCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  loadingTitle: { fontSize: 17, fontWeight: '700', color: C.onSurface, textAlign: 'center' },
  loadingSub: { fontSize: 13, color: C.outline, marginTop: 6, textAlign: 'center' },

  // ── Map ──
  mapContainer: { height: MAP_HEIGHT, position: 'relative' },
  map: { flex: 1 },
  mapBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  mapBadgeText: { fontSize: 12, fontWeight: '700', color: C.success },

  // Map — web placeholder
  mapPlaceholder: {
    height: MAP_HEIGHT, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  mapPlaceholderInner: { alignItems: 'center', gap: 8 },
  mapPlaceholderTitle: { fontSize: 18, fontWeight: '700', color: C.primary },
  mapPlaceholderSub: { fontSize: 13, color: C.outline, textAlign: 'center', lineHeight: 19 },

  // ── Bottom Sheet List ──
  listSheet: {
    flex: 1, backgroundColor: C.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 10, paddingHorizontal: 20,
    ...SHADOW, shadowOpacity: 0.12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.outlineVariant, alignSelf: 'center', marginBottom: 12,
  },

  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.warningLight, borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#fde68a',
  },
  warningText: { fontSize: 12, color: '#92400e', flex: 1, lineHeight: 17 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 14, height: 46,
    marginBottom: 12,
    borderWidth: 1, borderColor: '#e8edf5',
    ...SHADOW, shadowOpacity: 0.04,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.onSurface, paddingVertical: 0 },

  listHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  listTitle: { fontSize: 17, fontWeight: '700', color: C.onSurface },
  listCount: { fontSize: 12, fontWeight: '600', color: C.outline },

  listScroll: { paddingBottom: 20 },

  // ── Card ──
  card: {
    backgroundColor: C.surface, borderRadius: CARD_RADIUS,
    padding: 16, marginBottom: 12,
    ...SHADOW,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  facIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  facName: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  typeBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  distBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.primaryLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
  },
  distBadgeText: { fontSize: 9, fontWeight: '700', color: C.primary },
  rankBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 11, fontWeight: '800', color: C.onPrimary },

  infoSection: {
    gap: 7, borderTopWidth: 1, borderTopColor: '#f0f4ff', paddingTop: 12, marginTop: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { fontSize: 12, lineHeight: 18, color: C.onSurfaceVariant, flex: 1 },
  distRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.successLight, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 7, marginTop: 3,
  },
  distFullText: { fontSize: 12, fontWeight: '600', color: '#166534' },

  // ── Empty ──
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.onSurface },
  emptySub: { fontSize: 13, color: C.outline, textAlign: 'center' },
});

export default HealthFacilityScreen;
