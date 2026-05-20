import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { navigationRef } from './src/navigationRef';

// 1. Import Semua Layar
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import MedicationReminderScreen from './screens/MedicationReminderScreen';
import ChatScreen from './screens/ChatScreen';
import NakesChatScreen from './screens/NakesChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import EducationScreen from './screens/EducationScreen';
import BiometricAuthScreen from './screens/BiometricAuthScreen';
import DiaryScreen from './screens/DiaryScreen';
import HealthFacilityScreen from './screens/HealthFacilityScreen';

// 2. Tipe Data Navigasi (SANGAT PENTING agar TypeScript tidak cerewet)
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  BiometricAuth: undefined;
  MainTabs: undefined;
  Education: undefined;
  NakesChat: undefined;
  Diary: undefined;
  HealthFacility: undefined;
};

// Pasangkan tipe datanya ke Stack
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// 3. Buat Dunia Utama (Menu Bawah / Bottom Tabs)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Alarm') {
            iconName = focused ? 'alarm' : 'alarm-outline';
          } else if (route.name === 'Edukasi') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0043a2',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 5, height: 60 },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Alarm" component={MedicationReminderScreen} />
      <Tab.Screen name="Edukasi" component={EducationScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// 4. Buat Navigasi Utama (Root Stack)
export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        
        {/* --- DUNIA BELUM LOGIN --- */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="BiometricAuth" component={BiometricAuthScreen} />
        
        {/* --- DUNIA SUDAH LOGIN (Membungkus Tabs) --- */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        
        {/* --- HALAMAN EKSTRA --- */}
        <Stack.Screen name="Education" component={EducationScreen} />
        <Stack.Screen name="NakesChat" component={NakesChatScreen} />
        <Stack.Screen name="Diary" component={DiaryScreen} />
        <Stack.Screen name="HealthFacility" component={HealthFacilityScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}