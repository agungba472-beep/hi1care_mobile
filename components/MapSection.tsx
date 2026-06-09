import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface Props {
  mapHeight?: number;
  userLocation: { latitude: number; longitude: number } | null;
  faskesData: { id: number; nama: string; alamat?: string; latitude?: any; longitude?: any }[]; 
}

const MapSection: React.FC<Props> = ({ mapHeight = 300, userLocation, faskesData = [] }) => {
  const mapRef = useRef<MapView>(null);

  // Animasi pindah ke region jika userLocation berubah
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [userLocation]);

  if (!userLocation) {
    return (
      <View style={[st.container, { height: mapHeight, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#012D1D" />
        <Text style={st.loadingText}>Mencari lokasi Anda...</Text>
      </View>
    );
  }

  return (
    <View style={[st.container, { height: mapHeight }]}>
      <MapView
        ref={mapRef}
        style={st.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* User Marker (Biru) */}
        <Marker
          coordinate={userLocation}
          title="Lokasi Anda"
          description="Posisi GPS Anda saat ini"
          pinColor="blue"
        />

        {/* Faskes Markers (Merah) */}
        {faskesData && faskesData.length > 0 && faskesData.map((faskes) => {
          const lat = parseFloat(faskes.latitude);
          const lon = parseFloat(faskes.longitude);
          
          if (isNaN(lat) || isNaN(lon)) return null;

          return (
            <Marker
              key={faskes.id}
              coordinate={{ latitude: lat, longitude: lon }}
              title={faskes.nama}
              description={faskes.alamat || ''}
              pinColor="red"
            />
          );
        })}
      </MapView>
    </View>
  );
};

const st = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#f8f9ff',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    marginTop: 12,
    color: '#0d1c2e',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default MapSection;
