import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import * as Location from 'expo-location';
import { TravelMode, optimizeWaypointOrder } from 'react-native-google-nav';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { GOOGLE_API_KEY } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

const TRAVEL_MODES = [
  { label: 'Drive', value: TravelMode.DRIVING, icon: '🚗' },
  { label: 'Cycle', value: TravelMode.CYCLING, icon: '🚲' },
  { label: 'Walk', value: TravelMode.WALKING, icon: '🚶' },
  { label: '2-Wheeler', value: TravelMode.TWO_WHEELER, icon: '🏍️' },
];

type InputMode = 'search' | 'map';

export default function HomeScreen({ navigation, route }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [stops, setStops] = useState<
    {
      name: string;
      latitude: number;
      longitude: number;
      packageId: string;
      customerName: string;
      phone: string;
      deliveryWindow: string;
    }[]
  >([]);
  const [metaPackageId, setMetaPackageId] = useState('');
  const [metaCustomerName, setMetaCustomerName] = useState('');
  const [metaPhone, setMetaPhone] = useState('');
  const [metaDeliveryWindow, setMetaDeliveryWindow] = useState('');
  const nextPkgNum = useRef(1);
  const [startLocation, setStartLocation] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [travelMode, setTravelMode] = useState<TravelMode>(TravelMode.DRIVING);
  const [isStarting, setIsStarting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingRef = useRef(false);

  // Handle returning from MapPicker
  useEffect(() => {
    const params = route.params as
      | { pickedLocation?: { latitude: number; longitude: number } }
      | undefined;
    if (params?.pickedLocation) {
      const loc = params.pickedLocation;
      const newStop = {
        name: `Pin: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        packageId: `PKG-${String(nextPkgNum.current).padStart(3, '0')}`,
        customerName: `Customer ${nextPkgNum.current}`,
        phone: '',
        deliveryWindow: '9am-5pm',
      };
      nextPkgNum.current++;
      setStops((prev) => [...prev, newStop]);
      setSelectedPlace(null);
      setInputMode('map');
    }
  }, [route.params]);

  const addStop = useCallback(
    (place: { name: string; latitude: number; longitude: number }) => {
      setStops((prev) => [
        ...prev,
        {
          ...place,
          packageId: metaPackageId || `PKG-${String(nextPkgNum.current).padStart(3, '0')}`,
          customerName: metaCustomerName || `Customer ${nextPkgNum.current}`,
          phone: metaPhone,
          deliveryWindow: metaDeliveryWindow || '9am-5pm',
        },
      ]);
      nextPkgNum.current++;
      setSelectedPlace(null);
      setSearchQuery('');
      setMetaPackageId('');
      setMetaCustomerName('');
      setMetaPhone('');
      setMetaDeliveryWindow('');
    },
    [metaPackageId, metaCustomerName, metaPhone, metaDeliveryWindow]
  );

  const removeStop = useCallback((index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const searchPlaces = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setPredictions([]);
        return;
      }

      setIsSearching(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== 'OK') {
          console.warn('[Places Autocomplete]', data.status, data.error_message);
        }
        if (data.predictions) {
          setPredictions(data.predictions);
        }
      } catch (err) {
        console.warn('[Places Autocomplete] fetch error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      if (isSelectingRef.current) return;
      setSearchQuery(text);
      setSelectedPlace(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchPlaces(text), 300);
    },
    [searchPlaces]
  );

  const selectPlace = useCallback(
    async (prediction: PlacePrediction) => {
      isSelectingRef.current = true;
      Keyboard.dismiss();
      setPredictions([]);
      setSearchQuery(prediction.structured_formatting.main_text);
      // Allow the state update to flush before re-enabling search
      setTimeout(() => { isSelectingRef.current = false; }, 500);

      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.result?.geometry?.location) {
          setSelectedPlace({
            name: data.result.name || prediction.structured_formatting.main_text,
            latitude: data.result.geometry.location.lat,
            longitude: data.result.geometry.location.lng,
          });
        }
      } catch (err) {
        console.warn('[Place Details] fetch error:', err);
        Alert.alert('Error', 'Failed to get place details.');
      }
    },
    []
  );

  const handleOptimizeRoute = async () => {
    if (stops.length < 3) {
      Alert.alert('Need more stops', 'Route optimization requires at least 3 stops.');
      return;
    }
    setIsOptimizing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let origin = { latitude: 37.422, longitude: -122.084 };
      if (status === 'granted') {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          origin = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
        }
      }
      const result = await optimizeWaypointOrder({
        apiKey: GOOGLE_API_KEY,
        origin,
        waypoints: stops.map((s) => ({
          position: { latitude: s.latitude, longitude: s.longitude },
          title: s.name,
          metadata: { packageId: s.packageId, customerName: s.customerName, phone: s.phone, deliveryWindow: s.deliveryWindow },
        })),
        travelMode,
      });
      // Reorder stops based on optimization result
      const reorderedStops = result.optimizedOrder.map((idx) => stops[idx]!);
      setStops(reorderedStops);
      const km = (result.totalDistanceMeters / 1000).toFixed(1);
      const mins = Math.round(result.totalDurationSeconds / 60);
      Alert.alert('Route Optimized', `Order: ${result.optimizedOrder.map((i) => i + 1).join(' → ')}\n${km} km · ${mins} min`);
    } catch (err: any) {
      Alert.alert('Optimization Error', err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleStartTrip = async () => {
    if (stops.length === 0) {
      Alert.alert('Missing destination', 'Please add at least one stop.');
      return;
    }

    setIsStarting(true);

    try {
      let start: { latitude: number; longitude: number };

      if (useCurrentLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission denied',
            'Location permission is required for navigation.'
          );
          setIsStarting(false);
          return;
        }

        try {
          // Try last known position first (works reliably on emulators)
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown) {
            start = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            };
            console.log('[HomeScreen] Got last known location:', start);
          } else {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
            start = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            console.log('[HomeScreen] Got current location:', start);
          }
        } catch (locError: any) {
          console.warn('[HomeScreen] Location unavailable, using default (Googleplex):', locError?.message);
          // Fall back to Googleplex so emulator testing works seamlessly
          start = { latitude: 37.422, longitude: -122.084 };
        }
      } else {
        const parts = startLocation.split(',').map((s) => parseFloat(s.trim()));
        if (parts.length !== 2 || parts.some(isNaN)) {
          Alert.alert('Invalid start', 'Enter start location as lat,lng');
          setIsStarting(false);
          return;
        }
        start = { latitude: parts[0]!, longitude: parts[1]! };
      }

      // Auto-optimize stop order for driving/two-wheeler with 3+ stops.
      // Uses the resolved start position so the API picks the best origin.
      let finalStops = stops;
      if (
        stops.length >= 3 &&
        (travelMode === TravelMode.DRIVING || travelMode === TravelMode.TWO_WHEELER)
      ) {
        try {
          const result = await optimizeWaypointOrder({
            apiKey: GOOGLE_API_KEY,
            origin: start,
            waypoints: stops.map((s) => ({
              position: { latitude: s.latitude, longitude: s.longitude },
              title: s.name,
              metadata: {
                packageId: s.packageId,
                customerName: s.customerName,
                phone: s.phone,
                deliveryWindow: s.deliveryWindow,
              },
            })),
            travelMode,
          });
          finalStops = result.optimizedOrder.map((idx) => stops[idx]!);
          setStops(finalStops);
        } catch (optErr: any) {
          console.warn(
            '[HomeScreen] Auto-optimize failed, using original order:',
            optErr?.message
          );
        }
      }

      console.log('[HomeScreen] Navigating with:', { start, stops: finalStops, travelMode });

      navigation.navigate('Navigation', {
        start,
        destinations: finalStops.map((s, i) => ({
          latitude: s.latitude,
          longitude: s.longitude,
          title: s.name || `Stop ${i + 1}`,
          metadata: {
            packageId: s.packageId,
            customerName: s.customerName,
            phone: s.phone,
            deliveryWindow: s.deliveryWindow,
          },
        })),
        travelMode,
      });
    } catch (error: any) {
      console.error('[HomeScreen] Start trip error:', error);
      Alert.alert(
        'Error',
        `Something went wrong starting the trip.\n\n${error?.message || error}`
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Google Navigation</Text>
      <Text style={styles.subtitle}>Turn-by-turn navigation demo</Text>

      {/* Input Mode Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, inputMode === 'search' && styles.tabActive]}
          onPress={() => setInputMode('search')}
        >
          <Text
            style={[
              styles.tabText,
              inputMode === 'search' && styles.tabTextActive,
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, inputMode === 'map' && styles.tabActive]}
          onPress={() => setInputMode('map')}
        >
          <Text
            style={[
              styles.tabText,
              inputMode === 'map' && styles.tabTextActive,
            ]}
          >
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Tab */}
      {inputMode === 'search' && (
        <View>
          <Text style={styles.label}>Search for a place</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search restaurants, addresses..."
              placeholderTextColor="#999"
              autoCorrect={false}
            />
            {isSearching && (
              <ActivityIndicator
                style={styles.searchSpinner}
                size="small"
                color="#4285F4"
              />
            )}
          </View>

          {predictions.length > 0 && (
            <View style={styles.predictionsContainer}>
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.place_id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionItem}
                    onPress={() => selectPlace(item)}
                  >
                    <Text style={styles.predictionMain} numberOfLines={1}>
                      {item.structured_formatting.main_text}
                    </Text>
                    <Text style={styles.predictionSecondary} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {selectedPlace && (
            <View style={styles.metadataForm}>
              <Text style={styles.metadataFormTitle}>Delivery details for: {selectedPlace.name}</Text>
              <TextInput
                style={styles.metaInput}
                value={metaPackageId}
                onChangeText={setMetaPackageId}
                placeholder={`Package ID (e.g. PKG-${String(nextPkgNum.current).padStart(3, '0')})`}
                placeholderTextColor="#999"
              />
              <TextInput
                style={styles.metaInput}
                value={metaCustomerName}
                onChangeText={setMetaCustomerName}
                placeholder={`Customer name (e.g. Customer ${nextPkgNum.current})`}
                placeholderTextColor="#999"
              />
              <TextInput
                style={styles.metaInput}
                value={metaPhone}
                onChangeText={setMetaPhone}
                placeholder="Phone (e.g. +254712345678)"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.metaInput}
                value={metaDeliveryWindow}
                onChangeText={setMetaDeliveryWindow}
                placeholder="Delivery window (e.g. 9am-12pm)"
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.addStopButton}
                onPress={() => addStop(selectedPlace)}
              >
                <Text style={styles.addStopButtonText}>+ Add Stop</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Map Tab */}
      {inputMode === 'map' && (
        <View>
          <TouchableOpacity
            style={styles.mapPickerButton}
            onPress={() => navigation.navigate('MapPicker')}
          >
            <Text style={styles.mapPickerButtonText}>Drop a Pin on the Map</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stops List */}
      {stops.length > 0 && (
        <View style={styles.stopsContainer}>
          <Text style={styles.label}>Stops ({stops.length})</Text>
          {stops.map((stop, index) => (
            <View key={`${stop.latitude}-${stop.longitude}-${index}`} style={styles.stopItem}>
              <View style={styles.stopNumber}>
                <Text style={styles.stopNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
                <Text style={styles.stopMeta} numberOfLines={1}>
                  {stop.packageId} - {stop.customerName}
                </Text>
                <Text style={styles.stopCoords}>
                  {stop.deliveryWindow} | {stop.phone || 'No phone'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeStop(index)}
              >
                <Text style={styles.removeButtonText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Start Location */}
      <View style={styles.row}>
        <Text style={styles.label}>Use current location</Text>
        <Switch
          value={useCurrentLocation}
          onValueChange={setUseCurrentLocation}
          trackColor={{ true: '#4285F4' }}
        />
      </View>

      {!useCurrentLocation && (
        <>
          <Text style={styles.label}>Start Location (lat,lng)</Text>
          <TextInput
            style={styles.input}
            value={startLocation}
            onChangeText={setStartLocation}
            placeholder="37.7749,-122.4194"
            placeholderTextColor="#999"
            keyboardType="numbers-and-punctuation"
          />
        </>
      )}

      {/* Travel Mode */}
      <Text style={styles.label}>Travel Mode</Text>
      <View style={styles.modeContainer}>
        {TRAVEL_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.value}
            style={[
              styles.modeButton,
              travelMode === mode.value && styles.modeButtonActive,
            ]}
            onPress={() => setTravelMode(mode.value)}
          >
            <Text style={styles.modeIcon}>{mode.icon}</Text>
            <Text
              style={[
                styles.modeLabel,
                travelMode === mode.value && styles.modeLabelActive,
              ]}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Optimize Route Button — only for driving/two-wheeler */}
      {stops.length >= 3 && (travelMode === TravelMode.DRIVING || travelMode === TravelMode.TWO_WHEELER) && (
        <TouchableOpacity
          style={[styles.optimizeButton, isOptimizing && styles.startButtonDisabled]}
          onPress={handleOptimizeRoute}
          disabled={isOptimizing}
        >
          {isOptimizing ? (
            <View style={styles.startButtonRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.optimizeButtonText}> Optimizing...</Text>
            </View>
          ) : (
            <Text style={styles.optimizeButtonText}>Optimize Route Order</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Start Button */}
      <TouchableOpacity
        style={[styles.startButton, (stops.length === 0 || isStarting) && styles.startButtonDisabled]}
        onPress={handleStartTrip}
        disabled={stops.length === 0 || isStarting}
      >
        {isStarting ? (
          <View style={styles.startButtonRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.startButtonText}> Getting location...</Text>
          </View>
        ) : (
          <Text style={styles.startButtonText}>
            {stops.length <= 1 ? 'Start Trip' : `Start Trip (${stops.length} stops)`}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#4285F4',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  searchContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#1a1a1a',
  },
  searchSpinner: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  predictionsContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginTop: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  predictionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  predictionMain: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  predictionSecondary: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  metadataForm: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  metadataFormTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  metaInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  addStopButton: {
    backgroundColor: '#34A853',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    alignItems: 'center',
  },
  addStopButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  stopsContainer: {
    marginTop: 8,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  stopMeta: {
    fontSize: 13,
    color: '#4285F4',
    fontWeight: '500',
    marginTop: 2,
  },
  stopCoords: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#EA4335',
    fontSize: 13,
    fontWeight: 'bold',
  },
  selectedPlace: {
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  selectedPlaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A73E8',
  },
  selectedPlaceCoords: {
    fontSize: 13,
    color: '#5F6368',
    marginTop: 4,
  },
  mapPickerButton: {
    borderWidth: 2,
    borderColor: '#4285F4',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  mapPickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  modeButtonActive: {
    borderColor: '#4285F4',
    backgroundColor: '#E8F0FE',
  },
  modeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  modeLabelActive: {
    color: '#4285F4',
  },
  optimizeButton: {
    backgroundColor: '#34A853',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  optimizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#4285F4',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: '#B0C4DE',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
