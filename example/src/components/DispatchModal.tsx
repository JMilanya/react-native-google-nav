import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { GOOGLE_API_KEY } from '../config';

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

export type DispatchMode = 'add' | 'updateDetails' | 'changeAddress';

export type DispatchStopData = {
  stopIndex: number; // which stop this applies to (-1 for new)
  latitude: number;
  longitude: number;
  title: string;
  metadata: Record<string, string>;
};

export type UndeliveredStop = {
  index: number; // index in the full stops array
  title: string;
  latitude: number;
  longitude: number;
  metadata?: Record<string, string>;
};

type Props = {
  visible: boolean;
  mode: DispatchMode;
  undeliveredStops: UndeliveredStop[];
  onClose: () => void;
  onSubmit: (data: DispatchStopData) => void;
};

const MODE_CONFIG = {
  add: {
    title: 'Add New Stop',
    subtitle: 'Search for the delivery address and enter package details',
    submitLabel: 'Add Stop to Route',
    showSearch: true,
  },
  updateDetails: {
    title: 'Update Delivery Details',
    subtitle: 'Edit package details for the next stop (no route change)',
    submitLabel: 'Update Details',
    showSearch: false,
  },
  changeAddress: {
    title: 'Change Delivery Address',
    subtitle: 'Search for the new address (route will recalculate)',
    submitLabel: 'Update Address & Reroute',
    showSearch: true,
  },
};

export default function DispatchModal({
  visible,
  mode,
  undeliveredStops,
  onClose,
  onSubmit,
}: Props) {
  const config = MODE_CONFIG[mode];
  const [selectedStopIdx, setSelectedStopIdx] = useState(0);
  const selectedStop = mode !== 'add' ? undeliveredStops[selectedStopIdx] : undefined;

  // Place search state
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingRef = useRef(false);

  // Metadata fields
  const [packageId, setPackageId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryWindow, setDeliveryWindow] = useState('');

  const prevVisibleRef = useRef(false);
  const stopsRef = useRef(undeliveredStops);
  stopsRef.current = undeliveredStops;

  // Reset state only when modal first opens (visible transitions false → true)
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setSearchQuery('');
      setPredictions([]);
      setSelectedPlace(null);
      isSelectingRef.current = false;
      setSelectedStopIdx(0);

      if (mode === 'add') {
        setPackageId('');
        setCustomerName('');
        setPhone('');
        setDeliveryWindow('');
      } else {
        const stop = stopsRef.current[0];
        if (stop) {
          setPackageId(stop.metadata?.packageId || '');
          setCustomerName(stop.metadata?.customerName || '');
          setPhone(stop.metadata?.phone || '');
          setDeliveryWindow(stop.metadata?.deliveryWindow || '');
        }
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, mode]);

  // Update metadata fields when user picks a different stop
  const handleStopSelect = useCallback((idx: number) => {
    setSelectedStopIdx(idx);
    const stop = stopsRef.current[idx];
    if (stop) {
      setPackageId(stop.metadata?.packageId || '');
      setCustomerName(stop.metadata?.customerName || '');
      setPhone(stop.metadata?.phone || '');
      setDeliveryWindow(stop.metadata?.deliveryWindow || '');
    }
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      return;
    }
    setIsSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.predictions) {
        setPredictions(data.predictions);
      }
    } catch (err) {
      console.warn('[DispatchModal] Places search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

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

  const selectPlace = useCallback(async (prediction: PlacePrediction) => {
    isSelectingRef.current = true;
    Keyboard.dismiss();
    setPredictions([]);
    setSearchQuery(prediction.structured_formatting.main_text);
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 500);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.result?.geometry?.location) {
        setSelectedPlace({
          name:
            data.result.name ||
            prediction.structured_formatting.main_text,
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        });
      }
    } catch (err) {
      console.warn('[DispatchModal] Place details error:', err);
    }
  }, []);

  const canSubmit = () => {
    if (config.showSearch && !selectedPlace) return false;
    return true;
  };

  const handleSubmit = () => {
    let lat: number;
    let lng: number;
    let title: string;
    let stopIndex = -1;

    if (config.showSearch && selectedPlace) {
      lat = selectedPlace.latitude;
      lng = selectedPlace.longitude;
      title = selectedPlace.name;
    } else if (selectedStop) {
      lat = selectedStop.latitude;
      lng = selectedStop.longitude;
      title = selectedStop.title;
    } else {
      return;
    }

    if (mode !== 'add' && selectedStop) {
      stopIndex = selectedStop.index;
    }

    onSubmit({
      stopIndex,
      latitude: lat,
      longitude: lng,
      title,
      metadata: {
        packageId: packageId || 'PKG-NEW',
        customerName: customerName || 'Customer',
        phone,
        deliveryWindow: deliveryWindow || '9am-5pm',
      },
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.subtitle}>{config.subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.bodyContent}
        >
          {/* Stop Picker for update modes */}
          {mode !== 'add' && undeliveredStops.length > 0 && (
            <View style={styles.stopPickerSection}>
              <Text style={styles.stopPickerLabel}>Select stop to {mode === 'updateDetails' ? 'update' : 'relocate'}:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stopPickerScroll}>
                {undeliveredStops.map((stop, idx) => (
                  <TouchableOpacity
                    key={stop.index}
                    style={[
                      styles.stopPickerChip,
                      idx === selectedStopIdx && styles.stopPickerChipActive,
                    ]}
                    onPress={() => handleStopSelect(idx)}
                  >
                    <Text style={[
                      styles.stopPickerChipText,
                      idx === selectedStopIdx && styles.stopPickerChipTextActive,
                    ]}>
                      #{stop.index + 1} {stop.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedStop && (
                <View style={styles.currentStopBanner}>
                  <Text style={styles.currentStopLabel}>Selected stop:</Text>
                  <Text style={styles.currentStopTitle}>{selectedStop.title}</Text>
                  <Text style={styles.currentStopCoords}>
                    {selectedStop.latitude.toFixed(5)},{' '}
                    {selectedStop.longitude.toFixed(5)}
                  </Text>
                  {selectedStop.metadata?.customerName && (
                    <Text style={styles.currentStopCoords}>
                      {selectedStop.metadata.customerName} | {selectedStop.metadata.phone || 'No phone'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Places Search */}
          {config.showSearch && (
            <View>
              <Text style={styles.fieldLabel}>
                {mode === 'add'
                  ? 'Delivery Address'
                  : 'New Delivery Address'}
              </Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholder="Search restaurants, addresses..."
                  placeholderTextColor="#999"
                  autoCorrect={false}
                  autoFocus={true}
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
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.predictionItem}
                        onPress={() => selectPlace(item)}
                      >
                        <Text
                          style={styles.predictionMain}
                          numberOfLines={1}
                        >
                          {item.structured_formatting.main_text}
                        </Text>
                        <Text
                          style={styles.predictionSecondary}
                          numberOfLines={1}
                        >
                          {item.structured_formatting.secondary_text}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {selectedPlace && (
                <View style={styles.selectedBanner}>
                  <Text style={styles.selectedName}>
                    {selectedPlace.name}
                  </Text>
                  <Text style={styles.selectedCoords}>
                    {selectedPlace.latitude.toFixed(5)},{' '}
                    {selectedPlace.longitude.toFixed(5)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Metadata Form */}
          <Text style={styles.sectionTitle}>Package Details</Text>

          <Text style={styles.fieldLabel}>Package ID</Text>
          <TextInput
            style={styles.input}
            value={packageId}
            onChangeText={setPackageId}
            placeholder="e.g. PKG-001"
            placeholderTextColor="#999"
          />

          <Text style={styles.fieldLabel}>Customer Name</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="e.g. John Doe"
            placeholderTextColor="#999"
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +254712345678"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Delivery Window</Text>
          <TextInput
            style={styles.input}
            value={deliveryWindow}
            onChangeText={setDeliveryWindow}
            placeholder="e.g. 2pm-4pm"
            placeholderTextColor="#999"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !canSubmit() && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit()}
          >
            <Text style={styles.submitButtonText}>{config.submitLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    maxWidth: 260,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stopPickerSection: {
    marginBottom: 16,
  },
  stopPickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  stopPickerScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stopPickerChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  stopPickerChipActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#4285F4',
  },
  stopPickerChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  stopPickerChipTextActive: {
    color: '#4285F4',
    fontWeight: '600',
  },
  currentStopBanner: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  currentStopLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F57F17',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentStopTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  currentStopCoords: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
    marginBottom: 8,
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
    marginBottom: 8,
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
  selectedBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  selectedCoords: {
    fontSize: 12,
    color: '#66BB6A',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#34A853',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
