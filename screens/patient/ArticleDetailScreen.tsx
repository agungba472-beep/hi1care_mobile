import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, useWindowDimensions, Platform } from 'react-native';
import { Image } from 'expo-image'; // Ganti dari 'react-native' agar gambar cover ter-cache di disk
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../src/api';

// ── Design Tokens (Tema Hijau Dominan WEAR) ──
const C = {
  primary: '#012D1D',
  secondary: '#00A86B',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  outlineVariant: '#E2E8F0',
} as const;

// ── Image Helper ──
const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || 'http://127.0.0.1:8000';
  return `${baseUrl}/storage/${path}`;
};

// ── Component ──
const ArticleDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  
  const article = route.params?.article;

  if (!article) {
    return (
      <View style={st.centered}>
        <Text style={st.errorText}>Artikel tidak ditemukan.</Text>
      </View>
    );
  }

  const imagePath = article.cover || article.image_url;
  const imageSource = getImageUrl(imagePath);

  // Membersihkan tag HTML dasar dari konten jika ada
  const rawContent = article.konten || '';
  const cleanContent = rawContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');

  // Format tanggal dijadikan 1 baris agar tidak error saat di-copy
  const formattedDate = new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* GAMBAR COVER (FULL WIDTH) */}
        <View style={st.coverWrap}>
          {imageSource ? (
            <Image
              source={{ uri: imageSource }}
              style={[st.coverImage, { width }]}
              contentFit="cover"
              cachePolicy="disk"
              transition={200}
            />
          ) : (
            <View style={[st.coverPlaceholder, { width }]}>
              <MaterialIcons name="health-and-safety" size={72} color={C.secondary} />
            </View>
          )}
          
          {/* FLOATING BACK BUTTON */}
          <SafeAreaView style={st.floatingBackArea}>
            <TouchableOpacity 
              style={st.floatingBackBtn} 
              onPress={() => navigation.goBack()} 
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-back" size={24} color={C.primary} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* ISI ARTIKEL (OVERLAP SHEET) */}
        <View style={st.body}>
          {article.kategori && (
            <View style={st.badge}>
              <Text style={st.badgeText}>{article.kategori}</Text>
            </View>
          )}

          <Text style={st.title}>{article.judul}</Text>
          <Text style={st.date}>Dipublikasikan: {formattedDate}</Text>

          <View style={st.divider} />

          <Text style={st.content}>{cleanContent}</Text>
        </View>
        
      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: C.textSecondary },
  
  scroll: { paddingBottom: 60 },
  
  coverWrap: { position: 'relative' },
  coverImage: { height: 360, backgroundColor: '#E2E8F0' },
  coverPlaceholder: { height: 360, backgroundColor: 'rgba(0, 168, 107, 0.05)', alignItems: 'center', justifyContent: 'center' },
  
  floatingBackArea: {
    position: 'absolute', top: Platform.OS === 'android' ? 40 : 20, left: 20, zIndex: 10,
  },
  floatingBackBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  
  body: { 
    paddingHorizontal: 24, paddingVertical: 32,
    backgroundColor: C.surface, 
    borderTopLeftRadius: 36, borderTopRightRadius: 36, 
    marginTop: -40, // Overlap sheet effect yang lebih dalam
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 15,
    minHeight: 500, // Memastikan background putih menutupi seluruh area bawah
  },
  
  badge: {
    alignSelf: 'flex-start', backgroundColor: C.secondary,
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999, marginBottom: 16,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  title: { fontSize: 26, fontWeight: '800', color: C.primary, lineHeight: 34, marginBottom: 12, letterSpacing: -0.5 },
  date: { fontSize: 14, color: C.textSecondary, marginBottom: 24, fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: C.outlineVariant, marginBottom: 24 },
  
  content: { fontSize: 16, lineHeight: 28, color: C.textPrimary, textAlign: 'justify' },
});

export default ArticleDetailScreen;
