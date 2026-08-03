// @ts-ignore
global.Buffer = global.Buffer || require('buffer').Buffer;
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import notifee, { EventType } from '@notifee/react-native';
import { navigationRef } from './src/navigationRef';
import FloatingPlusButton from './components/FloatingPlusButton';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';



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
import SplashCheckScreen from './screens/auth/SplashCheckScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import DashboardScreen from './screens/patient/PatientDashboardScreen';
import MedicationReminderScreen from './screens/patient/MedicationReminderScreen';
import ChatScreen from './screens/common/ChatScreen';
import NakesChatScreen from './screens/nakes/NakesChatScreen';
import NakesDashboardScreen from './screens/nakes/NakesDashboardScreen';
import NakesPatientListScreen from './screens/nakes/NakesPatientListScreen';
import NakesPatientDetailScreen from './screens/nakes/NakesPatientDetailScreen';
import ProfileScreen from './screens/common/ProfileScreen';
import EducationScreen from './screens/patient/EducationScreen';
import BiometricAuthScreen from './screens/auth/BiometricAuthScreen';
import DiaryScreen from './screens/patient/DiaryScreen';
import HealthFacilityScreen from './screens/common/HealthFacilityScreen';
import ChatbotScreen from './screens/common/ChatbotScreen';
import PatientChatRoomScreen from './screens/patient/PatientChatRoomScreen';
import ArticleDetailScreen from './screens/patient/ArticleDetailScreen';
import NotificationListScreen from './screens/common/NotificationListScreen';

// 2. Tipe Data Navigasi (SANGAT PENTING agar TypeScript tidak cerewet)
export type RootStackParamList = {
  SplashCheck: undefined;
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
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Pengingat') {
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
        tabBarActiveTintColor: '#012D1D',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: Math.max(insets.bottom, 8), height: 60 + Math.max(insets.bottom, 8) },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Pengingat" component={MedicationReminderScreen} />
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
  const insets = useSafeAreaInsets();
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
        tabBarActiveTintColor: '#012D1D',
        tabBarInactiveTintColor: '#737784',
        tabBarStyle: { paddingBottom: Math.max(insets.bottom, 8), height: 60 + Math.max(insets.bottom, 8) },
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
// Listener untuk menangani event saat aplikasi di background / HP terkunci


// 4. Buat Navigasi Utama (Root Stack)
export default function App() {
  React.useEffect(() => {
    // ═══ EXPO-NOTIFICATIONS HANDLERS (untuk notif chat dari Laravel) ═══

    // 1. Tangani kondisi jika aplikasi mati total lalu dibuka lewat notifikasi expo
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response && navigationRef.isReady()) {
        const data = response.notification.request.content.data;
        if (data?.type === 'chat') {
          // @ts-ignore
          navigationRef.navigate('PatientChatRoom', { konsultasiId: data.chat_room_id });
        } else if (data?.type === 'alarm') {
          // @ts-ignore
          navigationRef.navigate('MainTabs', { screen: 'Pengingat' });
        }
      }
    });

    // 2. Tangani expo-notifications saat aplikasi sedang berjalan
    const expoSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      if (navigationRef.isReady()) {
        const data = response.notification.request.content.data;
        if (data?.type === 'chat') {
          // @ts-ignore
          navigationRef.navigate('PatientChatRoom', { konsultasiId: data.chat_room_id });
        } else if (data?.type === 'alarm') {
          // @ts-ignore
          navigationRef.navigate('MainTabs', { screen: 'Pengingat' });
        } else {
          // @ts-ignore
          navigationRef.navigate('MainTabs', { screen: 'Pengingat' });
        }
      }
    });

    // ═══ NOTIFEE HANDLERS (untuk alarm obat lokal) ═══

    // 3. Tangani Notifee saat app mati total → dibuka lewat klik notifikasi alarm
    notifee.getInitialNotification().then(initialNotification => {
      if (initialNotification && navigationRef.isReady()) {
        const data = initialNotification.notification.data;
        if (data?.type === 'alarm') {
          // @ts-ignore
          navigationRef.navigate('MainTabs', { screen: 'Pengingat' });
        }
      }
    });

    // 4. Tangani Notifee saat app di foreground (alarm berbunyi saat app aktif)
    const notifeeUnsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
        if (type === EventType.PRESS) {
          // Klik body notifikasi -> navigasi ke Pengingat
          if (navigationRef.isReady()) {
            const data = detail.notification?.data;
            if (data?.type === 'alarm') {
              // @ts-ignore
              navigationRef.navigate('MainTabs', { screen: 'Pengingat' });
            }
          }
        }
        if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'stop_alarm') {
        // Klik tombol "Konfirmasi Minum" → matikan notif + navigasi
        if (detail.notification?.id) {
          notifee.cancelNotification(detail.notification.id);
        }
        if (navigationRef.isReady()) {
          // @ts-ignore
          navigationRef.navigate('MainTabs', { screen: 'Pengingat' });
        }
      }
    });

    return () => {
      expoSubscription.remove();
      notifeeUnsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName="SplashCheck" screenOptions={{ headerShown: false }}>
          
          {/* --- DUNIA BELUM LOGIN --- */}
          <Stack.Screen name="SplashCheck" component={SplashCheckScreen} />
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
    </SafeAreaProvider>
  );
}