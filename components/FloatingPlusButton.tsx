import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const FloatingPlusButton = () => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={st.fab}
      onPress={() => {
        // Arahkan ke menu Alarm (sesuai dengan nama Tab.Screen di App.tsx)
        navigation.navigate('Alarm' as never);
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
    backgroundColor: '#0043a2', 
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
