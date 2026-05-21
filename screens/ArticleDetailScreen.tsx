import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, useWindowDimensions, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../src/api';

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

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* GAMBAR COVER (FULL WIDTH) */}
        <View style={st.coverWrap}>
          {imageSource ? (
            <Image source={{ uri: imageSource }} style={[st.coverImage, { width }]} resizeMode="cover" />
          ) : (
            <View style={[st.coverPlaceholder, { width }]}>
              <MaterialIcons name="local-hospital" size={64} color="#cbd5e1" />
            </View>
          )}
          
          {/* FLOATING BACK BUTTON */}
          <SafeAreaView style={st.floatingBackArea}>
            <TouchableOpacity 
              style={st.floatingBackBtn} 
              onPress={() => navigation.goBack()} 
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-back" size={24} color="#1e293b" />
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
          <Text style={st.date}>
            Dipublikasikan: {new Date(article.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </Text>

          <View style={st.divider} />

          <Text style={st.content}>{cleanContent}</Text>
        </View>
        
      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#64748b' },
  
  scroll: { paddingBottom: 60 },
  
  coverWrap: { position: 'relative' },
  coverImage: { height: 320, backgroundColor: '#f1f5f9' },
  coverPlaceholder: { height: 320, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  
  floatingBackArea: {
    position: 'absolute', top: Platform.OS === 'android' ? 40 : 20, left: 20, zIndex: 10,
  },
  floatingBackBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  
  body: { 
    paddingHorizontal: 24, paddingVertical: 32,
    backgroundColor: '#ffffff', 
    borderTopLeftRadius: 30, borderTopRightRadius: 30, 
    marginTop: -30, // Overlap sheet effect
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10,
    minHeight: 500, // Memastikan background putih menutupi seluruh area bawah
  },
  
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, marginBottom: 16,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  title: { fontSize: 26, fontWeight: '800', color: '#1e293b', lineHeight: 34, marginBottom: 12, letterSpacing: -0.5 },
  date: { fontSize: 14, color: '#64748b', marginBottom: 24, fontWeight: '500' },
  
  divider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 24 },
  
  content: { fontSize: 16, lineHeight: 28, color: '#334155', textAlign: 'justify' },
});

export default ArticleDetailScreen;
