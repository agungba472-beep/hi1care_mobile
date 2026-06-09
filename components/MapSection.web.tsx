import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ── Leaflet Icons Fix ──
// Secara default, icon Leaflet bisa broken di React karena URL webpack
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Props {
  mapHeight?: number;
  userLocation: { latitude: number; longitude: number } | null;
  faskesData: { id: number; nama: string; alamat?: string; latitude?: any; longitude?: any }[];
}

// Komponen Helper untuk auto pan map Leaflet ketika koordinat berubah
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const MapSection: React.FC<Props> = ({ mapHeight = 300, userLocation, faskesData = [] }) => {
  // SSR Check: Mencegah error 'window is not defined' saat initial render (misalnya Next.js/Expo Web)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return null;

  if (!userLocation) {
    return (
      <View style={[st.containerWrap, { height: mapHeight + 24 }]}>
        <View style={[st.mapBox, { height: mapHeight, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#012D1D" />
          <Text style={st.loadingText}>Mencari lokasi Anda...</Text>
        </View>
      </View>
    );
  }

  const center: [number, number] = [userLocation.latitude, userLocation.longitude];

  return (
    <View style={st.containerWrap}>
      <View style={[st.mapBox, { height: mapHeight }]}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          {/* Layer Peta Dasar */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <MapUpdater center={center} />
          
          {/* User Marker (Biru) */}
          <Marker position={center} icon={blueIcon}>
            <Popup>
              <strong>Lokasi Anda</strong><br />
              Posisi GPS saat ini
            </Popup>
          </Marker>

          {/* Faskes Markers (Merah) */}
          {faskesData && faskesData.length > 0 && faskesData.map((faskes) => {
            const lat = parseFloat(faskes.latitude);
            const lon = parseFloat(faskes.longitude);
            if (isNaN(lat) || isNaN(lon)) return null;

            return (
              <Marker key={faskes.id} position={[lat, lon]} icon={redIcon}>
                <Popup>
                  <strong style={{ fontSize: 14 }}>{faskes.nama}</strong><br />
                  {faskes.alamat}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </View>
    </View>
  );
};

const st = StyleSheet.create({
  containerWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#f0f4ff', // Matches background WEAR HealthFacilityScreen
    alignItems: 'center',
  },
  mapBox: {
    width: '100%',
    maxWidth: 800,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#012D1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#0d1c2e',
    fontWeight: '600',
  }
});

export default MapSection;
