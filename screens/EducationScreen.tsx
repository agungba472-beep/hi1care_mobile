import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image, ActivityIndicator, ImageBackground
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../src/api';
import CustomHeader from '../components/CustomHeader';

// ── Design Tokens (Warna Hijau Dibuat Lebih Dominan) ──
const C = {
  background: '#FAFAFA',       
  surface: '#FFFFFF',          
  primary: '#012D1D',          // Forest Green (Utama - Sangat Dominan)
  secondary: '#00A86B',        // Mint Medical Green (Aksen)
  outline: '#94A3B8',          
  outlineVariant: '#E2E8F0',   
  textPrimary: '#0F172A',      
  textSecondary: '#64748B',    
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, margin: 20 } as const;

// ── Types ──
interface EdukasiItem {
  id: number;
  judul: string;
  konten: string;
  kategori?: string;
  created_at: string;
  image_url?: string;
  cover?: string;
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || 'http://127.0.0.1:8000';
  return `${baseUrl}/storage/${path}`;
};

// ── Component ──
const EducationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiArticles, setApiArticles] = useState<EdukasiItem[]>([]);

  // ── LOGIKA TIDAK DIUBAH SAMA SEKALI ──
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

  const filteredArticles = apiArticles.filter(article => 
    article.judul.toLowerCase().includes(searchText.toLowerCase()) || 
    (article.konten && article.konten.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <CustomHeader title="Edukasi Kesehatan" showBackButton={false} hideBell={false} />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── HERO SECTION HIJAU DOMINAN ── */}
        <ImageBackground 
          source={require('../assets/img/bg_obat.jpeg')} 
          style={st.heroSection} 
          imageStyle={st.heroImageStyle}
        >
          <View style={st.heroOverlay}>
            <View style={st.heroHeader}>
              <View>
                <Text style={st.heroTitle}>Artikel Medis</Text>
                <Text style={st.heroSub}>Pusat informasi kesehatan WEAR</Text>
              </View>
              <View style={st.badgeCount}>
                <Text style={st.badgeCountText}>{filteredArticles.length}</Text>
              </View>
            </View>

            {/* ── Search Bar Modern (Di dalam area Hijau) ── */}
            <View style={st.searchBar}>
              <MaterialIcons name="search" size={24} color={C.primary} />
              <TextInput 
                style={st.searchInput} 
                placeholder="Cari artikel atau topik..." 
                placeholderTextColor={C.outline}
                value={searchText} 
                onChangeText={setSearchText} 
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <MaterialIcons name="cancel" size={20} color={C.outline} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ImageBackground>

        {/* ── List Artikel ── */}
        <View style={st.articleList}>
          {loading ? (
            <View style={st.loadingRow}>
              <ActivityIndicator size="large" color={C.secondary} />
              <Text style={st.loadingText}>Menyiapkan edukasi...</Text>
            </View>
          ) : filteredArticles.length > 0 ? (
            filteredArticles.map((item) => {
              const imagePath = item.cover || item.image_url;
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={st.card} 
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('ArticleDetail', { article: item })}
                >
                  <View style={st.cardImgWrap}>
                    {getImageUrl(imagePath) ? (
                      <Image source={{ uri: getImageUrl(imagePath)! }} style={st.cardImg} resizeMode="cover" />
                    ) : (
                      <View style={st.imgFallback}>
                         <MaterialIcons name="health-and-safety" size={56} color={C.secondary} />
                      </View>
                    )}
                    
                    {/* Badge Kategori Hijau Mint */}
                    {item.kategori && (
                      <View style={st.cardBadge}>
                        <Text style={st.cardBadgeText}>{item.kategori}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={st.cardBody}>
                    <Text style={st.cardTitle} numberOfLines={2}>{item.judul}</Text>
                    <Text style={st.cardDesc} numberOfLines={3}>
                      {item.konten?.replace(/<[^>]*>/g, '') || 'Tidak ada deskripsi singkat tersedia.'}
                    </Text>
                    
                    <View style={st.readMoreDivider} />
                    
                    <View style={st.readMore}>
                      <Text style={st.readMoreText}>Baca Selengkapnya</Text>
                      <View style={st.readMoreIconWrap}>
                        <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={st.emptyState}>
              <View style={st.emptyIconWrap}>
                <MaterialIcons name="find-in-page" size={48} color={C.secondary} />
              </View>
              <Text style={st.emptyTitle}>Artikel Tidak Ditemukan</Text>
              <Text style={st.emptySub}>Coba gunakan kata kunci lain untuk mencari edukasi kesehatan.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles (Tema WEAR dengan Dominasi Hijau) ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { paddingTop: 0, paddingBottom: 40 },

  // Hero Section (Membuat Hijau Sangat Dominan)
  heroSection: { 
    backgroundColor: C.primary, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32, 
    marginBottom: S.xl, 
    overflow: 'hidden',
    elevation: 6,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 
  },
  heroImageStyle: { opacity: 0.15 },
  heroOverlay: { 
    paddingHorizontal: S.margin, 
    paddingTop: S.lg, 
    paddingBottom: S.xl,
    backgroundColor: 'rgba(1, 45, 29, 0.4)', // Transparansi gelap agar teks putih menyala
  },
  
  heroHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: S.lg 
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, fontWeight: '500', color: C.secondary, marginTop: 4 },
  badgeCount: { backgroundColor: C.secondary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeCountText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  // Search Bar Modern (Putih di atas background Hijau)
  searchBar: {
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: C.surface,
    borderWidth: 0, 
    borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 16, color: C.primary, marginHorizontal: 12, paddingVertical: 0, fontWeight: '600' },

  articleList: { paddingHorizontal: S.margin },

  // Card Design WEAR
  card: {
    backgroundColor: C.surface, 
    borderRadius: 24, 
    marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(1, 45, 29, 0.05)',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
    overflow: 'hidden',
  },
  cardImgWrap: { height: 180, backgroundColor: 'rgba(1, 45, 29, 0.03)', position: 'relative' },
  cardImg: { width: '100%', height: '100%' },
  imgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 168, 107, 0.08)' },
  
  cardBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  cardBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardBody: { padding: 20 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.primary, marginBottom: 8, lineHeight: 26 },
  cardDesc: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
  
  readMoreDivider: { height: 1, backgroundColor: C.outlineVariant, marginVertical: 16 },
  readMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readMoreText: { fontSize: 14, fontWeight: '800', color: C.primary },
  readMoreIconWrap: { backgroundColor: C.primary, padding: 6, borderRadius: 12 },

  // State
  loadingRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 15, color: C.primary, fontWeight: '600' },
  
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0, 168, 107, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.primary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },
});

export default EducationScreen;