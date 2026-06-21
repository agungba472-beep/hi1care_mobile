import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const FloatingPlusButton = () => {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={st.fab}
      onPress={() => {
        // Karena tombol ini di luar Tab.Navigator, kita harus memanggil nama Stack utama dulu,
        // baru masuk ke nama Tab-nya.
        navigation.navigate('MainTabs', { screen: 'Pengingat' });
      }}
      activeOpacity={0.85}
    >
      <MaterialIcons name="add" size={32} color="#ffffff" />
    </TouchableOpacity>
  );
};

const st = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90, 
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#012D1D', 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 8 },
    }),
  },
});

export default FloatingPlusButton;
