import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomHeader from '../components/CustomHeader';
import api from '../src/api';
import { useFocusEffect } from '@react-navigation/native';

const NotificationListScreen = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Mencoba mengambil data dari backend Laravel (Jika endpoint sudah dibuat)
      const response = await api.get('/patient/notifications'); 
      setNotifications(response.data.data || []);
    } catch (error) {
      console.log('Gagal mengambil data notifikasi:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const renderItem = ({ item }: { item: any }) => {
    // Menyesuaikan is_read dari db (bisa berupa int/boolean/string enum)
    const isUnread = item.is_read === 0 || item.is_read === false || item.status === 'belum_dibaca';
    
    return (
      <TouchableOpacity style={[st.card, isUnread ? st.cardUnread : st.cardRead]} activeOpacity={0.7}>
        <View style={st.iconContainer}>
          <MaterialIcons 
            name={isUnread ? "notifications-active" : "notifications-none"} 
            size={28} 
            color={isUnread ? "#0043a2" : "#94a3b8"} 
          />
        </View>
        <View style={st.contentContainer}>
          <Text style={[st.title, isUnread && st.titleUnread]}>{item.judul}</Text>
          <Text style={st.message} numberOfLines={2}>{item.pesan}</Text>
          <Text style={st.time}>{item.created_at || 'Baru Saja'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={st.safe}>
      <CustomHeader title="Notifikasi Saya" showBackButton={true} />
      {loading ? (
        <ActivityIndicator size="large" color="#0043a2" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={st.listContainer}
          ListEmptyComponent={
            <View style={st.emptyContainer}>
              <MaterialIcons name="notifications-off" size={64} color="#cbd5e1" />
              <Text style={st.emptyText}>Belum ada notifikasi masuk.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  listContainer: { padding: 16 },
  card: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, elevation: 1 },
  cardUnread: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  cardRead: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', opacity: 0.85 },
  iconContainer: { marginRight: 16, justifyContent: 'center' },
  contentContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 4 },
  titleUnread: { color: '#0043a2', fontWeight: '800' },
  message: { fontSize: 14, color: '#64748b', marginBottom: 8, lineHeight: 20 },
  time: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 16 }
});

export default NotificationListScreen;
