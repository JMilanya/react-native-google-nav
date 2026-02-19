import {} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import NavigationScreen from './screens/NavigationScreen';
import MapPickerScreen from './screens/MapPickerScreen';
import DeliverySummaryScreen from './screens/DeliverySummaryScreen';
import OTPVerificationScreen from './screens/OTPVerificationScreen';
import type { TravelMode } from 'react-native-google-nav';

export type OTPStatus = 'verified' | 'cancelled' | 'skipped' | 'pending';

export type DeliveryStop = {
  title: string;
  latitude: number;
  longitude: number;
  metadata: Record<string, string>;
  delivered: boolean;
  otpStatus: OTPStatus;
};

export type RootStackParamList = {
  Home:
    | { pickedLocation?: { latitude: number; longitude: number } }
    | undefined;
  Navigation: {
    start: { latitude: number; longitude: number };
    destinations: {
      latitude: number;
      longitude: number;
      title: string;
      metadata?: Record<string, string>;
    }[];
    travelMode: TravelMode;
    otpResult?: { waypointIndex: number; status: OTPStatus };
  };
  DeliverySummary: {
    stops: DeliveryStop[];
  };
  MapPicker: undefined;
  OTPVerification: {
    waypointIndex: number;
    waypointTitle: string;
    metadata?: Record<string, string>;
    isFinalDestination: boolean;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Navigation" component={NavigationScreen} />
          <Stack.Screen
            name="MapPicker"
            component={MapPickerScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="DeliverySummary"
            component={DeliverySummaryScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="OTPVerification"
            component={OTPVerificationScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
