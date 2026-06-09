import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../src/api';

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  hideBell?: boolean;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({ title, showBackButton, hideBell }) => {
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Ambil data jumlah notifikasi setiap kali halaman di-fokuskan
  useFocusEffect(
    React.useCallback(() => {
      if (hideBell) return;
      
      const fetchNotifCount = async () => {
        try {
          const response = await api.get('/patient/dashboard');
          setUnreadCount(response.data.data.unread_notif_count || 0);
        } catch (error) {
          console.log("[Header] Gagal mengambil data notifikasi:", error);
        }
      };
      fetchNotifCount();
    }, [])
  );

  return (
    <View style={st.headerContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {showBackButton && (
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ marginRight: 12, padding: 4 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#012D1D" />
          </TouchableOpacity>
        )}
        <Text style={st.headerTitle}>{title}</Text>
      </View>
      
      {!hideBell && (
        <TouchableOpacity 
          style={st.bellButton} 
          onPress={() => {
            navigation.navigate('NotificationListScreen' as never);
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="notifications-none" size={28} color="#012D1D" />
          
          {unreadCount > 0 && (
            <View style={st.redBadge}>
              <Text style={st.redBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const st = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#012D1D',
    letterSpacing: 0.5,
  },
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  redBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  redBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default CustomHeader;
