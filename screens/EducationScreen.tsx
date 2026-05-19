import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image, FlatList, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';

// ── Design Tokens ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff',
  onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff',
  secondary: '#6b4ab2', onSecondary: '#ffffff', secondaryContainer: '#b191fd',
  onSecondaryContainer: '#44208a',
  tertiary: '#42495c', background: '#f8f9ff',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, gutter: 16, margin: 20 } as const;

// ── Types ──
interface ArticleItem { id: string; title: string; desc: string; badge: string; imageUri: string; }
interface VideoItem { id: string; title: string; duration: string; imageUri: string; }
interface EdukasiItem {
  id: number;
  judul: string;
  konten: string;
  kategori?: string;
  created_at: string;
}

// ── Sample Data (Original) ──
const ARTICLES: ArticleItem[] = [
  { id: '1', title: 'Mengenal ARV', desc: 'Panduan lengkap mengenai cara kerja dan kepatuhan minum obat.', badge: 'Artikel',
    imageUri: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&q=80' },
  { id: '2', title: 'Nutrisi untuk ODHIV', desc: 'Pilihan makanan terbaik untuk menjaga sistem kekebalan tubuh.', badge: 'Nutrisi',
    imageUri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80' },
  { id: '3', title: 'Hidup Sehat dengan HIV', desc: 'Tips harian untuk menjaga kesehatan fisik dan mental secara optimal.', badge: 'Gaya Hidup',
    imageUri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80' },
];

const VIDEOS: VideoItem[] = [
  { id: 'v1', title: 'Testimoni: Cerita Pejuang HIV', duration: '3:15',
    imageUri: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&q=80' },
  { id: 'v2', title: 'Inovasi Pengobatan 2024', duration: '8:42',
    imageUri: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=200&q=80' },
];

// ── Component ──
const EducationScreen: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiArticles, setApiArticles] = useState<EdukasiItem[]>([]);

  const fetchEdukasi = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/edukasi');
      const raw = res.data.data;
      if (Array.isArray(raw)) {
        setApiArticles(raw);
      } else if (raw?.data && Array.isArray(raw.data)) {
        setApiArticles(raw.data);
      } else {
        setApiArticles([]);
      }
    } catch (err: any) {
      console.log('[Edukasi] Error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchEdukasi(); }, [fetchEdukasi]));

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ═══ TOP APP BAR ═══ */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity style={st.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="menu" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>HI!-CARE</Text>
        </View>
        <TouchableOpacity style={st.iconBtn} activeOpacity={0.7}>
          <MaterialIcons name="visibility-off" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Search Bar ── */}
        <View style={st.searchBar}>
          <MaterialIcons name="search" size={24} color={C.outline} />
          <TextInput style={st.searchInput} placeholder="Cari artikel atau topik..." placeholderTextColor={C.outline}
            value={searchText} onChangeText={setSearchText} />
          <MaterialIcons name="tune" size={24} color={C.outline} />
        </View>

        {/* ═══ KELOLA STRES ═══ */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <View>
              <Text style={st.sectionTitle}>Kelola Stres</Text>
              <Text style={st.sectionSub}>Temukan ketenangan hari ini</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={st.viewAll}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {/* Bento Grid */}
          <View style={st.stressGrid}>
            {/* Hero: Breathing */}
            <TouchableOpacity style={st.breathingCard} activeOpacity={0.85}>
              <View style={{ zIndex: 1 }}>
                <MaterialIcons name="self-improvement" size={36} color="#fff" style={{ marginBottom: S.sm }} />
                <Text style={st.breathingTitle}>Latihan Pernapasan</Text>
                <Text style={st.breathingSub}>4 menit untuk meredakan kecemasan seketika.</Text>
              </View>
              <View style={st.breathingBtn}>
                <Text style={st.breathingBtnText}>Mulai Sekarang</Text>
              </View>
            </TouchableOpacity>

            {/* Row: Jurnal + Meditasi */}
            <View style={st.stressRow}>
              <TouchableOpacity style={st.stressSmallCard} activeOpacity={0.7}>
                <View style={[st.stressIconBox, { backgroundColor: '#eff6ff' }]}>
                  <MaterialIcons name="edit-note" size={24} color={C.primary} />
                </View>
                <Text style={st.stressSmallTitle}>Jurnal Rasa Syukur</Text>
                <Text style={st.stressSmallSub}>Tulis 3 hal baik hari ini</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.stressSmallCard} activeOpacity={0.7}>
                <View style={[st.stressIconBox, { backgroundColor: '#faf5ff' }]}>
                  <MaterialIcons name="spatial-audio-off" size={24} color={C.secondary} />
                </View>
                <Text style={st.stressSmallTitle}>Meditasi Terpimpin</Text>
                <Text style={st.stressSmallSub}>Sesi audio 10 menit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ═══ EDUKASI HIV ═══ */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <View>
              <Text style={st.sectionTitle}>Edukasi HIV</Text>
              <Text style={st.sectionSub}>Pengetahuan adalah kekuatan</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={st.viewAll}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>
          <FlatList data={ARTICLES} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: S.gutter }} keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={st.articleCard} activeOpacity={0.8}>
                <View style={st.articleImgWrap}>
                  <Image source={{ uri: item.imageUri }} style={st.articleImg} resizeMode="cover" />
                  <View style={st.articleBadge}><Text style={st.articleBadgeText}>{item.badge}</Text></View>
                </View>
                <View style={st.articleBody}>
                  <Text style={st.articleTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={st.articleDesc} numberOfLines={2}>{item.desc}</Text>
                  <View style={st.readMore}>
                    <Text style={st.readMoreText}>Baca Selengkapnya</Text>
                    <MaterialIcons name="arrow-forward" size={14} color={C.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ═══ VIDEO EDUKASI ═══ */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <View>
              <Text style={st.sectionTitle}>Video Edukasi</Text>
              <Text style={st.sectionSub}>Belajar melalui visual</Text>
            </View>
          </View>

          {/* Featured Video */}
          <TouchableOpacity style={st.featuredVideo} activeOpacity={0.85}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&q=80' }}
              style={st.featuredImg} resizeMode="cover" />
            <View style={st.featuredOverlay}>
              <View style={st.playBtn}><MaterialIcons name="play-arrow" size={36} color="#000" /></View>
            </View>
            <View style={st.featuredInfo}>
              <Text style={st.featuredTitle}>Memahami Viral Load & CD4</Text>
              <Text style={st.featuredMeta}>Durasi: 05:24 • Ditonton 1.2rb kali</Text>
            </View>
          </TouchableOpacity>

          {/* Small Video List */}
          <FlatList data={VIDEOS} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: S.gutter, marginTop: S.gutter }} keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={st.smallVideoCard} activeOpacity={0.8}>
                <View style={st.smallVideoThumb}>
                  <Image source={{ uri: item.imageUri }} style={st.smallVideoImg} resizeMode="cover" />
                  <View style={st.smallVideoPlay}><MaterialIcons name="play-circle" size={20} color="#fff" /></View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.smallVideoTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={st.smallVideoDuration}>{item.duration}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ═══ ARTIKEL DARI SERVER (API) ═══ */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <View>
              <Text style={st.sectionTitle}>Artikel Terbaru</Text>
              <Text style={st.sectionSub}>Dari tim medis HI!-CARE</Text>
            </View>
            <Text style={st.sectionCount}>{apiArticles.length} artikel</Text>
          </View>

          {loading ? (
            <View style={st.loadingRow}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={st.loadingText}>Memuat artikel...</Text>
            </View>
          ) : apiArticles.length > 0 ? (
            apiArticles.map((item) => (
              <View style={st.apiArticleCard} key={item.id}>
                <View style={st.apiArticleIconWrap}>
                  <MaterialIcons name="menu-book" size={28} color={C.primary} />
                </View>
                <View style={st.apiArticleBody}>
                  {item.kategori ? (
                    <View style={st.apiArticleBadge}>
                      <Text style={st.apiArticleBadgeText}>{item.kategori}</Text>
                    </View>
                  ) : null}
                  <Text style={st.apiArticleTitle} numberOfLines={2}>{item.judul}</Text>
                  <Text style={st.apiArticleDesc} numberOfLines={3}>
                    {item.konten?.replace(/<[^>]*>/g, '') || 'Tidak ada deskripsi.'}
                  </Text>
                  <View style={st.readMore}>
                    <Text style={st.readMoreText}>Baca Selengkapnya</Text>
                    <MaterialIcons name="arrow-forward" size={14} color={C.primary} />
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={st.emptyState}>
              <MaterialIcons name="article" size={48} color={C.outlineVariant} />
              <Text style={st.emptyTitle}>Belum ada artikel</Text>
              <Text style={st.emptySub}>Artikel edukasi akan muncul di sini saat tersedia.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingTop: S.lg },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.margin, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1d4ed8', letterSpacing: -0.3 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: S.margin, marginBottom: S.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 16, lineHeight: 24, color: C.onSurface, marginHorizontal: 12, paddingVertical: 0 },

  // Sections
  section: { marginBottom: S.xl, paddingHorizontal: S.margin },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: S.md },
  sectionTitle: { fontSize: 24, fontWeight: '600', lineHeight: 32, color: C.onSurface },
  sectionSub: { fontSize: 12, fontWeight: '500', lineHeight: 16, color: C.tertiary },
  sectionCount: { fontSize: 12, fontWeight: '500', color: C.outline },
  viewAll: { fontSize: 12, fontWeight: '600', color: C.primary },

  // Stress Grid
  stressGrid: { gap: S.gutter },
  breathingCard: {
    backgroundColor: C.secondary, borderRadius: 12, padding: S.lg, height: 192,
    justifyContent: 'space-between', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  breathingTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  breathingSub: { fontSize: 14, color: '#fff', opacity: 0.9, maxWidth: 200 },
  breathingBtn: { backgroundColor: '#fff', borderRadius: 9999, paddingVertical: 8, paddingHorizontal: 24, alignSelf: 'flex-start' },
  breathingBtnText: { fontSize: 14, fontWeight: '600', color: C.secondary },
  stressRow: { flexDirection: 'row', gap: S.gutter },
  stressSmallCard: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.outlineVariant,
    borderRadius: 12, padding: S.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  stressIconBox: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: S.sm },
  stressSmallTitle: { fontSize: 16, fontWeight: '600', lineHeight: 20, color: C.onSurface, marginBottom: S.xs },
  stressSmallSub: { fontSize: 12, color: C.tertiary },

  // Article Cards (horizontal)
  articleCard: {
    width: 260, backgroundColor: '#fff', borderWidth: 1, borderColor: C.outlineVariant,
    borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  articleImgWrap: { height: 128, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  articleImg: { width: '100%', height: '100%' },
  articleBadge: {
    position: 'absolute', top: 8, right: 8, backgroundColor: C.secondaryContainer,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999,
  },
  articleBadgeText: { fontSize: 10, fontWeight: '700', color: C.onSecondaryContainer, textTransform: 'uppercase', letterSpacing: 0.8 },
  articleBody: { padding: S.md },
  articleTitle: { fontSize: 16, fontWeight: '700', color: C.onSurface, marginBottom: S.xs },
  articleDesc: { fontSize: 12, color: C.tertiary, lineHeight: 18, marginBottom: S.md },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readMoreText: { fontSize: 12, fontWeight: '600', color: C.primary },

  // Featured Video
  featuredVideo: {
    borderRadius: 12, overflow: 'hidden', aspectRatio: 16 / 9, backgroundColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  featuredImg: { width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  featuredInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: S.md, backgroundColor: 'rgba(0,0,0,0.6)' },
  featuredTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  featuredMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  // Small Videos
  smallVideoCard: {
    width: 180, backgroundColor: '#fff', borderWidth: 1, borderColor: C.outlineVariant,
    borderRadius: 12, padding: 8, flexDirection: 'row', gap: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  smallVideoThumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  smallVideoImg: { width: '100%', height: '100%' },
  smallVideoPlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  smallVideoTitle: { fontSize: 12, fontWeight: '700', color: C.onSurface },
  smallVideoDuration: { fontSize: 10, color: C.tertiary, marginTop: 2 },

  // API Articles section
  apiArticleCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: C.outlineVariant,
    borderRadius: 12, overflow: 'hidden', marginBottom: S.gutter,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  apiArticleIconWrap: {
    width: 80, backgroundColor: C.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  apiArticleBody: { flex: 1, padding: S.md },
  apiArticleBadge: {
    backgroundColor: C.secondaryContainer, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 9999, alignSelf: 'flex-start', marginBottom: S.xs,
  },
  apiArticleBadgeText: {
    fontSize: 11, fontWeight: '700', color: C.onSecondaryContainer,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  apiArticleTitle: { fontSize: 16, fontWeight: '700', color: C.onSurface, marginBottom: S.xs },
  apiArticleDesc: { fontSize: 13, color: C.tertiary, lineHeight: 20, marginBottom: S.md },

  // Loading / Empty
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, paddingVertical: S.xl },
  loadingText: { fontSize: 14, color: C.outline },
  emptyState: { alignItems: 'center', paddingVertical: S.xl * 2, gap: S.sm },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: C.onSurface },
  emptySub: { fontSize: 14, color: C.outline, textAlign: 'center' },
});

export default EducationScreen;
