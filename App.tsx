import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; // Kita pakai ikon bawaan Expo

// 1. Import Semua Layar yang sudah kamu buat
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import MedicationReminderScreen from './screens/MedicationReminderScreen';

import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import EducationScreen from './screens/EducationScreen';
import HealthFacilityScreen from './screens/HealthFacilityScreen';
import BiometricAuthScreen from './screens/BiometricAuthScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 2. Buat Dunia Utama (Menu Bawah / Bottom Tabs)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Sembunyikan header default agar desain aslimu terlihat
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          // Menentukan ikon berdasarkan nama layar
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Log') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          // Render ikon dari @expo/vector-icons
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0043a2', // Warna primary dari desain HI-CARE
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 5, height: 60 }, // Sedikit penyesuaian tinggi tab
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Schedule" component={MedicationReminderScreen} />
      <Tab.Screen name="Log" component={EducationScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// 3. Buat Navigasi Utama (Root Stack)
export default function App() {
  return (
    <NavigationContainer>
      {/* initialRouteName menentukan halaman pertama saat aplikasi dibuka */}
      <Stack.Navigator initialRouteName="MainTabs" screenOptions={{ headerShown: false }}>
        
        {/* --- DUNIA BELUM LOGIN --- */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="BiometricAuth" component={BiometricAuthScreen} />
        
        {/* --- DUNIA SUDAH LOGIN (Membungkus Tabs) --- */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        
        {/* --- HALAMAN EKSTRA (Tidak ada di menu bawah, tapi bisa dipanggil) --- */}
        <Stack.Screen name="Education" component={EducationScreen} />
        <Stack.Screen name="HealthFacility" component={HealthFacilityScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}