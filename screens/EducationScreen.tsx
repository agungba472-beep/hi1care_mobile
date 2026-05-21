import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image, ActivityIndicator, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../src/api';

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
interface EdukasiItem {
  id: number;
  judul: string;
  konten: string;
  kategori?: string;
  created_at: string;
  image_url?: string;
  cover?: string; // Sesuai dengan field di database backend
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  // Mengambil baseURL dari axios api, misal http://127.0.0.1:8000/api
  // Menghilangkan '/api' di akhir untuk mendapatkan base URL
  const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || 'http://127.0.0.1:8000';
  return `${baseUrl}/storage/${path}`;
};

// ── Component ──
const EducationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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

  // Pencarian Artikel
  const filteredArticles = apiArticles.filter(article => 
    article.judul.toLowerCase().includes(searchText.toLowerCase()) || 
    (article.konten && article.konten.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ═══ TOP APP BAR (CLEAN) ═══ */}
      <View style={st.header}>
        <Text style={st.headerTitle}>HI!-CARE</Text>
      </View>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Search Bar ── */}
        <View style={st.searchBar}>
          <MaterialIcons name="search" size={24} color={C.outline} />
          <TextInput 
            style={st.searchInput} 
            placeholder="Cari artikel atau topik..." 
            placeholderTextColor={C.outline}
            value={searchText} 
            onChangeText={setSearchText} 
          />
        </View>

        {/* ═══ ARTIKEL DARI SERVER (API) ═══ */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <View>
              <Text style={st.sectionTitle}>Edukasi & Artikel</Text>
              <Text style={st.sectionSub}>Dari tim medis HI!-CARE</Text>
            </View>
            <Text style={st.sectionCount}>{filteredArticles.length} artikel</Text>
          </View>

          {loading ? (
            <View style={st.loadingRow}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={st.loadingText}>Memuat artikel...</Text>
            </View>
          ) : filteredArticles.length > 0 ? (
            filteredArticles.map((item) => {
              const imagePath = item.cover || item.image_url;
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={st.apiArticleCard} 
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ArticleDetail', { article: item })}
                >
                  {/* Thumbnail Gambar */}
                  <View style={st.apiArticleImgWrap}>
                    {getImageUrl(imagePath) ? (
                      <Image source={{ uri: getImageUrl(imagePath)! }} style={st.apiArticleImg} resizeMode="cover" />
                    ) : (
                      <View style={st.apiArticleIconFallback}>
                         <MaterialIcons name="local-hospital" size={48} color={C.primaryContainer} />
                      </View>
                    )}
                  
                  {item.kategori && (
                    <View style={st.apiArticleBadge}>
                      <Text style={st.apiArticleBadgeText}>{item.kategori}</Text>
                    </View>
                  )}
                </View>
                
                {/* Konten Text */}
                <View style={st.apiArticleBody}>
                  <Text style={st.apiArticleTitle} numberOfLines={2}>{item.judul}</Text>
                  <Text style={st.apiArticleDesc} numberOfLines={3}>
                    {item.konten?.replace(/<[^>]*>/g, '') || 'Tidak ada deskripsi.'}
                  </Text>
                  <View style={st.readMore}>
                    <Text style={st.readMoreText}>Baca Selengkapnya</Text>
                    <MaterialIcons name="arrow-forward" size={16} color={C.primary} />
                  </View>
                </View>
              </TouchableOpacity>
              );
            })
          ) : (
            <View style={st.emptyState}>
              <MaterialIcons name="article" size={48} color={C.outlineVariant} />
              <Text style={st.emptyTitle}>Belum ada artikel</Text>
              <Text style={st.emptySub}>Artikel edukasi yang Anda cari tidak ditemukan.</Text>
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

  // Header (Clean)
  header: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: S.margin, paddingVertical: 16,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1d4ed8', letterSpacing: 0.5 },

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
  sectionTitle: { fontSize: 24, fontWeight: '700', lineHeight: 32, color: C.onSurface },
  sectionSub: { fontSize: 14, fontWeight: '500', lineHeight: 20, color: C.tertiary },
  sectionCount: { fontSize: 13, fontWeight: '700', color: C.primary },

  // API Articles Card (Full Width with Top Image)
  apiArticleCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: C.outlineVariant,
    borderRadius: 16, overflow: 'hidden', marginBottom: S.gutter,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  apiArticleImgWrap: { height: 180, backgroundColor: C.surfaceContainerLow, position: 'relative' },
  apiArticleImg: { width: '100%', height: '100%' },
  apiArticleIconFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  apiArticleBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: C.secondaryContainer, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 9999,
  },
  apiArticleBadgeText: {
    fontSize: 11, fontWeight: '800', color: C.onSecondaryContainer,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  apiArticleBody: { padding: S.lg },
  apiArticleTitle: { fontSize: 18, fontWeight: '700', color: C.onSurface, marginBottom: S.sm, lineHeight: 26 },
  apiArticleDesc: { fontSize: 14, color: C.tertiary, lineHeight: 22, marginBottom: S.lg },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  readMoreText: { fontSize: 14, fontWeight: '700', color: C.primary },

  // Loading / Empty
  loadingRow: { alignItems: 'center', justifyContent: 'center', gap: S.md, paddingVertical: S.xl * 2 },
  loadingText: { fontSize: 16, color: C.outline, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: S.xl * 2, gap: S.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.onSurface },
  emptySub: { fontSize: 14, color: C.outline, textAlign: 'center' },
});

export default EducationScreen;
