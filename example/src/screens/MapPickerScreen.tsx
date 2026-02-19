import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { type MapPressEvent, Marker } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'MapPicker'>;

export default function MapPickerScreen({ navigation }: Props) {
  const [pin, setPin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const handlePress = (e: MapPressEvent) => {
    setPin(e.nativeEvent.coordinate);
  };

  const handleConfirm = () => {
    if (!pin) return;
    navigation.navigate('Home', { pickedLocation: pin });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onPress={handlePress}
      >
        {pin && <Marker coordinate={pin} />}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Drop a Pin</Text>
        <View style={styles.backButton}>
          <Text style={styles.backButtonText}> </Text>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.bottomPanel}>
        {pin ? (
          <Text style={styles.coordsText}>
            {pin.latitude.toFixed(6)}, {pin.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.hintText}>Tap on the map to drop a pin</Text>
        )}

        <TouchableOpacity
          style={[styles.confirmButton, !pin && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!pin}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  coordsText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 16,
  },
  hintText: {
    fontSize: 15,
    color: '#999',
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: '#4285F4',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
