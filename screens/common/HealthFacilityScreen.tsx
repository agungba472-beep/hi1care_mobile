import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Linking,
  ActivityIndicator, SafeAreaView, Platform, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location'; // <── Mengaktifkan Radar Sensor GPS HP
import api from '../../src/api';

// ── Design Tokens (WEAR Serene Assurance) ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#012D1D', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff',
  secondary: '#00A86B', background: '#f8f9ff',
  success: '#16a34a' // Warna hijau sukses untuk keterangan jarak
} as const;

interface Faskes {
  id: number;
  nama: string;
  alamat: string;
  kontak: string;
  tipe: string;
  layanan: string;
  latitude: string;
  longitude: string;
  distance?: number | null; // Properti dinamis jarak hasil hitungan GPS
}

const HealthFacilityScreen = () => {
  const navigation = useNavigation();
  const [faskes, setFaskes] = useState<Faskes[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  // Titik Koordinat Pusat Kabupaten Subang jika GPS mati
  const defaultLat = -6.5681146;
  const defaultLng = 107.7661608;

  // ── Fungsi Helper Matematika: Rumus Haversine (Hitung Jarak Koordinat Bumi) ──
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius bumi dalam satuan Kilometer
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Mengembalikan hasil dalam KM
  };

  useEffect(() => {
    initLocationAndFaskes();
  }, []);

  const initLocationAndFaskes = async () => {
    let coords: { latitude: number; longitude: number } | null = null;

    // Langkah 1: Minta izin sensor lokasi GPS ke perangkat pasien
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        setUserLocation(coords);
      }
    } catch (e) {
      console.log("Akses GPS ditolak atau bermasalah, menggunakan list standar:", e);
    }

    // Langkah 2: Ambil data Faskes asli Subang dari API Laravel
    try {
      const response = await api.get('/faskes');
      const rawFaskes = response.data.data || response.data;

      // Langkah 3: Suntikkan kalkulasi jarak ke setiap item Faskes
      let processedFaskes = rawFaskes.map((item: Faskes) => {
        if (coords && item.latitude && item.longitude) {
          const distance = calculateHaversineDistance(
            coords.latitude,
            coords.longitude,
            parseFloat(item.latitude),
            parseFloat(item.longitude)
          );
          return { ...item, distance: distance };
        }
        return { ...item, distance: null };
      });

      // Langkah 4: Urutkan list otomatis dari yang TERDEKAT ke TERJAUH
      processedFaskes.sort((a: Faskes, b: Faskes) => {
        if (a.distance === null || a.distance === undefined) return 1;
        if (b.distance === null || b.distance === undefined) return -1;
        return a.distance - b.distance;
      });

      setFaskes(processedFaskes);
    } catch (error) {
      console.error("Gagal memuat data faskes via API:", error);
    } finally {
      setLoading(false);
    }
  };

  // Kirim data penanda (Markers) dan lokasi user ke peta Leaflet internal
  const handleMapLoad = () => {
    if (faskes.length > 0) {
      const message = JSON.stringify({ 
        type: 'SET_MARKERS', 
        payload: faskes,
        userLat: userLocation?.latitude || null,
        userLng: userLocation?.longitude || null
      });
      if (Platform.OS === 'web' && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(message, '*');
      } else if (webViewRef.current) {
        webViewRef.current.postMessage(message);
      }
    }
  };

  useEffect(() => {
    handleMapLoad();
  }, [faskes, userLocation]);

  // ACTION 1: Menggeser Peta Leaflet internal aplikasi ke Faskes tertentu
  const panToLocation = (lat: string | null, lng: string | null, name: string) => {
    if (!lat || !lng) {
      Alert.alert('Lokasi Belum Tersedia', `Koordinat untuk ${name} belum diset.`);
      return;
    }
    const message = JSON.stringify({ type: 'PAN_TO', lat: parseFloat(lat), lng: parseFloat(lng) });
    if (Platform.OS === 'web' && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(message, '*');
    } else if (webViewRef.current) {
      webViewRef.current.postMessage(message);
    }
  };

  const openGoogleMapsRoute = (lat: string | null, lng: string | null, name: string) => {
    if (!lat || !lng) {
      Alert.alert('Gagal Membuka Navigasi', 'Koordinat faskes tidak valid.');
      return;
    }
    const universalUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}(${encodeURIComponent(name)})`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(name)})`,
      default: universalUrl
    });

    Linking.canOpenURL(url || '').then((supported) => {
      if (supported && url) {
        Linking.openURL(url);
      } else {
        Linking.openURL(universalUrl);
      }
    });
  };

  // ACTION 3: Hubungi Nomor Kontak Faskes via Dialer Telepon HP
  const callFaskes = (phone: string) => {
    if (!phone) {
      Alert.alert('Kontak Kosong', 'Fasilitas kesehatan ini belum mendaftarkan nomor aktif.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  // ── Source Code HTML Leaflet Map dengan Penanda Lokasi Pasien (Pin Biru) ──
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; background: #eff4ff; }
            html, body, #map { height: 100%; width: 100%; }
            .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .leaflet-popup-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; color: #0d1c2e; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map').setView([${defaultLat}, ${defaultLng}], 11);
            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                attribution: '© Google Maps'
            }).addTo(map);

            var markers = [];
            var userMarker = null;

            function handleData(data) {
                if (data.type === 'SET_MARKERS') {
                    // Hapus pin lama
                    markers.forEach(m => map.removeLayer(m));
                    markers = [];
                    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }

                    // 1. Gambar Pin Lokasi Pasien Berdiri (Warna Biru)
                    if (data.userLat && data.userLng) {
                        var blueIcon = new L.Icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        });
                        userMarker = L.marker([data.userLat, data.userLng], {icon: blueIcon}).addTo(map)
                            .bindPopup('<b>📍 Lokasi Anda Saat Ini</b>').openPopup();
                        
                        // Fokuskan peta ke sekitar posisi pasien
                        map.setView([data.userLat, data.userLng], 12);
                    }

                    // 2. Gambar Pin Daftar Faskes Subang (Warna Standar)
                    data.payload.forEach(f => {
                        if (f.latitude && f.longitude) {
                            var marker = L.marker([parseFloat(f.latitude), parseFloat(f.longitude)]).addTo(map)
                                .bindPopup('<b>' + f.nama + '</b><br/><span style="color:#00A86B;font-weight:600;">' + f.tipe + '</span><br/>' + f.alamat);
                            markers.push(marker);
                        }
                    });
                } else if (data.type === 'PAN_TO') {
                    map.setView([data.lat, data.lng], 16, { animate: true, duration: 1.5 });
                }
            }

            document.addEventListener("message", function(event) {
                handleData(JSON.parse(event.data));
            });
            window.addEventListener("message", function(event) {
                if(typeof event.data === 'string') {
                    try { handleData(JSON.parse(event.data)); } catch(e){}
                }
            });
        </script>
    </body>
    </html>
  `;

  const renderItem = ({ item }: { item: Faskes }) => (
    <View style={st.card}>
      <View style={st.cardHeader}>
        <View style={st.iconBox}>
          <MaterialIcons 
            name={item.tipe.toLowerCase().includes('rumah sakit') ? "local-hospital" : "medical-services"} 
            size={24} color={C.primary} 
          />
        </View>
        <View style={st.headerText}>
          <Text style={st.faskesName}>{item.nama}</Text>
          <Text style={st.faskesType}>{item.tipe}</Text>
        </View>
      </View>
      
      <View style={st.cardBody}>
        {/* ── FITUR UTAMA: Jarak Indikator Dinamis ── */}
        <View style={st.infoRow}>
          <MaterialIcons name="my-location" size={16} color={C.success} style={{ marginTop: 2 }} />
          <Text style={[st.infoText, { color: C.success, fontWeight: '700' }]}>
            {item.distance !== null && item.distance !== undefined
              ? `${item.distance.toFixed(1)} km dari lokasi Anda`
              : 'Menghitung jarak / GPS mati...'}
          </Text>
        </View>

        <View style={st.infoRow}>
          <MaterialIcons name="location-on" size={16} color={C.outline} style={{ marginTop: 2 }} />
          <Text style={st.infoText}>{item.alamat}</Text>
        </View>
        <View style={st.infoRow}>
          <MaterialIcons name="stars" size={16} color={C.secondary} style={{ marginTop: 2 }} />
          <Text style={st.infoText}><Text style={{ fontWeight: '600' }}>Layanan HIV:</Text> {item.layanan}</Text>
        </View>
      </View>

      <View style={st.cardFooter}>
        <TouchableOpacity style={[st.actionBtn, st.btnCall]} onPress={() => callFaskes(item.kontak)}>
          <MaterialIcons name="phone" size={16} color={C.primary} />
          <Text style={[st.actionText, { color: C.primary }]}>Hubungi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[st.actionBtn, st.btnMapInternal]} onPress={() => panToLocation(item.latitude, item.longitude, item.nama)}>
          <MaterialIcons name="center-focus-strong" size={16} color={C.secondary} />
          <Text style={[st.actionText, { color: C.secondary }]}>Lihat Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[st.actionBtn, st.btnRouteExternal]} onPress={() => openGoogleMapsRoute(item.latitude, item.longitude, item.nama)}>
          <MaterialIcons name="directions" size={16} color={C.onPrimary} />
          <Text style={[st.actionText, { color: C.onPrimary }]}>Rute</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={st.container}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity style={st.iconBtn} activeOpacity={0.7} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Fasilitas Kesehatan Terdekat</Text>
        </View>
      </View>

      <View style={st.mapContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            ref={iframeRef}
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={handleMapLoad}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={{ flex: 1 }}
            scrollEnabled={false}
            onLoadEnd={handleMapLoad}
          />
        )}
      </View>

      <View style={st.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={faskes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={st.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// ── Styles ──
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#012D1D', letterSpacing: -0.3 },
  mapContainer: {
    height: '38%', backgroundColor: '#e0e0e0',
    borderBottomWidth: 2, borderBottomColor: C.outlineVariant
  },
  listContainer: { flex: 1 },
  listContent: { padding: 16, gap: 14, paddingBottom: 32 },
  card: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: `${C.outlineVariant}90`,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center'
  },
  headerText: { flex: 1 },
  faskesName: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  faskesType: { fontSize: 11, fontWeight: '600', color: C.outline, marginTop: 1, textTransform: 'uppercase' },
  cardBody: { gap: 6, marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  infoText: { flex: 1, fontSize: 13, color: C.onSurfaceVariant, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 4
  },
  btnCall: { backgroundColor: C.surfaceContainerLow, borderWidth: 1, borderColor: `${C.primary}33` },
  btnMapInternal: { backgroundColor: `${C.secondary}12`, borderWidth: 1, borderColor: `${C.secondary}33` },
  btnRouteExternal: { backgroundColor: C.primary },
  actionText: { fontSize: 12, fontWeight: '700' }
});

export default HealthFacilityScreen;
