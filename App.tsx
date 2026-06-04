import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { navigationRef } from './src/navigationRef';
import FloatingPlusButton from './components/FloatingPlusButton';


// Konfigurasi Notifikasi Global agar muncul meskipun aplikasi sedang aktif / di background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 1. Import Semua Layar
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import MedicationReminderScreen from './screens/MedicationReminderScreen';
import ChatScreen from './screens/ChatScreen';
import NakesChatScreen from './screens/NakesChatScreen';
import NakesDashboardScreen from './screens/NakesDashboardScreen';
import NakesPatientListScreen from './screens/NakesPatientListScreen';
import NakesPatientDetailScreen from './screens/NakesPatientDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import EducationScreen from './screens/EducationScreen';
import BiometricAuthScreen from './screens/BiometricAuthScreen';
import DiaryScreen from './screens/DiaryScreen';
import HealthFacilityScreen from './screens/HealthFacilityScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import PatientChatRoomScreen from './screens/PatientChatRoomScreen';
import ArticleDetailScreen from './screens/ArticleDetailScreen';
import NotificationListScreen from './screens/NotificationListScreen';

// 2. Tipe Data Navigasi (SANGAT PENTING agar TypeScript tidak cerewet)
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  BiometricAuth: undefined;
  MainTabs: undefined;
  Education: undefined;
  NakesChat: { chatId?: number; receiver_id?: number };
  NakesTabs: undefined;
  NakesPatientDetailScreen: { patientId: number };
  Diary: undefined;
  HealthFacility: undefined;
  Chatbot: undefined;
  PatientChatRoom: { konsultasiId: number };
  ArticleDetail: { article: any };
  NotificationListScreen: undefined;
};

// Pasangkan tipe datanya ke Stack
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// 3. Buat Dunia Utama (Menu Bawah / Bottom Tabs)
function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
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
    <FloatingPlusButton />
    </View>
  );
}

// 3b. Nakes-specific Bottom Tabs
function NakesTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'dashboard';
          if (route.name === 'NakesDashboard') iconName = 'dashboard';
          else if (route.name === 'NakesPatients') iconName = 'people';
          // --- ICON BARU UNTUK TAB PESAN ---
          else if (route.name === 'NakesChatTab') iconName = 'chat'; 
          else if (route.name === 'NakesProfile') iconName = 'person';
          
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0043a2',
        tabBarInactiveTintColor: '#737784',
        tabBarStyle: { paddingBottom: 5, height: 60 },
      })}
    >
      <Tab.Screen 
        name="NakesDashboard" 
        component={NakesDashboardScreen} 
        options={{ title: 'Beranda' }} 
      />
      <Tab.Screen 
        name="NakesPatients" 
        component={NakesPatientListScreen} 
        options={{ title: 'Monitoring' }} 
      />
      
      {/* --- MENU TAB BARU UNTUK CHAT / INBOX --- */}
      <Tab.Screen 
        name="NakesChatTab" 
        component={NakesChatScreen} 
        options={{ title: 'Pesan' }} 
      />

      <Tab.Screen 
        name="NakesProfile" 
        component={ProfileScreen} 
        options={{ title: 'Profil Akun' }} 
      />
    </Tab.Navigator>
  );
}
// 4. Buat Navigasi Utama (Root Stack)
export default function App() {
  return (
    <View style={{ flex: 1 }}>
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
        <Stack.Screen name="NakesTabs" component={NakesTabs} options={{ headerShown: false }} />
        <Stack.Screen name="NakesPatientDetailScreen" component={NakesPatientDetailScreen} />
        <Stack.Screen name="Diary" component={DiaryScreen} />
        <Stack.Screen name="HealthFacility" component={HealthFacilityScreen} />
        <Stack.Screen name="Chatbot" component={ChatbotScreen} />
        <Stack.Screen name="PatientChatRoom" component={PatientChatRoomScreen} />
        <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
        <Stack.Screen name="NotificationListScreen" component={NotificationListScreen} />

      </Stack.Navigator>
    </NavigationContainer>
    </View>
  );
}