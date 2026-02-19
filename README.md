# react-native-google-nav

A React Native wrapper around the **Google Navigation SDK** for iOS and Android. Provides a native turn-by-turn navigation view with full Fabric (New Architecture) support and an optional Expo config plugin.

**Key features:**

- Turn-by-turn navigation with voice guidance
- Multi-stop routes with per-waypoint arrival events
- Route optimization via Google Routes API
- OTP-based delivery verification hook
- Background location streaming
- Simulation mode for testing without real GPS
- Theming, camera control, markers, and traffic overlays
- Expo config plugin for zero-config native setup

> **Important:** The Google Navigation SDK requires a [Google Maps Platform](https://cloud.google.com/maps-platform/) account with the **Navigation SDK** enabled. This is a **paid API** — you must have a valid billing account and API key with the Navigation SDK enabled for both iOS and Android.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Expo Setup](#expo-setup)
- [Bare React Native Setup](#bare-react-native-setup)
- [Basic Usage](#basic-usage)
- [API Reference](#api-reference)
  - [GoogleNavProvider](#googlenavprovider)
  - [GoogleNavView](#googlenavview)
  - [GoogleNavViewRef (Commands)](#googlenavviewref-commands)
  - [Props](#props)
  - [Events](#events)
- [Hooks](#hooks)
  - [useGoogleNav](#usegooglenav)
  - [useOTPVerification](#useotpverification)
  - [useBackgroundLocation](#usebackgroundlocation)
- [Route Optimization](#route-optimization)
- [Enums](#enums)
- [Theming](#theming)
- [Simulation Mode](#simulation-mode)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

1. **React Native 0.76+** (New Architecture / Fabric required)
2. **iOS 16+** / **Android API 24+**
3. A Google Cloud project with these APIs enabled:
   - **Navigation SDK for iOS**
   - **Navigation SDK for Android**
   - **Places API** (if using place search in your app)
   - **Routes API** (if using `optimizeWaypointOrder`)
4. API keys for iOS and Android with the above APIs enabled

### Getting Your API Keys

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Navigation SDK** for both iOS and Android
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Restrict the key:
   - **iOS key**: restrict to iOS apps with your bundle identifier
   - **Android key**: restrict to Android apps with your package name and SHA-1 fingerprint

---

## Installation

```sh
npm install JMilanya/react-native-google-nav
```

Or with yarn:

```sh
yarn add JMilanya/react-native-google-nav
```

### Peer Dependencies

```sh
npm install react react-native
# If using Expo:
npm install expo
```

---

## Expo Setup

The library ships with an Expo config plugin that handles all native configuration automatically.

### 1. Add the plugin to `app.json`

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-nav/expo-plugin",
        {
          "androidApiKey": "YOUR_ANDROID_API_KEY",
          "iosApiKey": "YOUR_IOS_API_KEY"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs your location for navigation.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs background location for navigation.",
        "UIBackgroundModes": ["location"]
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### 2. Prebuild and run

```sh
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android
```

> **Note:** This library uses native code and cannot run in Expo Go. You must use a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

---

## Bare React Native Setup

### iOS

1. Add the Google Navigation SDK to your `Podfile`:

```ruby
# ios/Podfile
pod 'GoogleNavigation', '~> 9.1'
```

2. Initialize the SDK in `AppDelegate.mm`:

```objc
#import <GoogleMaps/GoogleMaps.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  [GMSServices provideAPIKey:@"YOUR_IOS_API_KEY"];
  // ... rest of your setup
}
```

3. Add location permissions to `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs your location for navigation.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app needs background location for navigation.</string>
```

4. Install pods:

```sh
cd ios && pod install
```

### Android

1. Add the Navigation SDK dependency to your app's `build.gradle`:

```groovy
// android/app/build.gradle
dependencies {
    implementation "com.google.android.libraries.navigation:navigation:7.1.0"
}
```

2. Add your API key to `AndroidManifest.xml`:

```xml
<application>
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_ANDROID_API_KEY" />
</application>
```

3. Add location permissions to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

4. Ensure `minSdkVersion` is at least **24** in `android/build.gradle`.

---

## Basic Usage

```tsx
import React, { useRef } from 'react';
import { View, Button } from 'react-native';
import {
  GoogleNavProvider,
  GoogleNavView,
  TravelMode,
  type GoogleNavViewRef,
} from 'react-native-google-nav';

export default function NavigationScreen() {
  const navRef = useRef<GoogleNavViewRef>(null);

  const startNavigation = () => {
    navRef.current?.setDestinations(
      [
        {
          position: { latitude: -1.2921, longitude: 36.8219 },
          title: 'Nairobi CBD',
        },
        {
          position: { latitude: -1.2864, longitude: 36.8172 },
          title: 'University of Nairobi',
        },
      ],
      { travelMode: TravelMode.DRIVING }
    );
  };

  return (
    <GoogleNavProvider apiKey="YOUR_API_KEY">
      <View style={{ flex: 1 }}>
        <GoogleNavView
          ref={navRef}
          style={{ flex: 1 }}
          navigationUIEnabled
          headerEnabled
          tripProgressBarEnabled
          speedometerEnabled
          onNavigationReady={() => console.log('Navigation SDK ready')}
          onRouteReady={(e) =>
            console.log(`Route: ${e.totalDistanceMeters}m, ${e.totalTimeSeconds}s`)
          }
          onArrival={(e) =>
            console.log(`Arrived at stop #${e.waypointIndex}: ${e.waypointTitle}`)
          }
        />
        <Button title="Start Navigation" onPress={startNavigation} />
        <Button
          title="Start Simulation"
          onPress={() => navRef.current?.startSimulation()}
        />
      </View>
    </GoogleNavProvider>
  );
}
```

---

## API Reference

### GoogleNavProvider

Wraps your navigation screen. Initializes the SDK and shows the Google Terms & Conditions dialog.

```tsx
<GoogleNavProvider apiKey="YOUR_API_KEY">
  {children}
</GoogleNavProvider>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your Google Maps API key |
| `children` | `ReactNode` | Yes | Child components |

### GoogleNavView

The native navigation map view. Must be inside a `GoogleNavProvider`.

### GoogleNavViewRef (Commands)

Access these via a `ref` on `GoogleNavView`:

| Method | Signature | Description |
|--------|-----------|-------------|
| `setDestinations` | `(waypoints: Waypoint[], options?: RoutingOptions) => void` | Set one or more destinations and compute the route |
| `addDestination` | `(waypoint: Waypoint, atIndex?: number) => void` | Add a waypoint to the current route |
| `removeDestination` | `(atIndex: number) => void` | Remove a waypoint by index |
| `updateDestination` | `(atIndex: number, waypoint: Waypoint) => void` | Update a waypoint's position or metadata |
| `startGuidance` | `() => void` | Start real GPS turn-by-turn guidance |
| `stopGuidance` | `() => void` | Stop guidance |
| `clearDestinations` | `() => void` | Clear all destinations and route |
| `recenterCamera` | `() => void` | Re-center camera on the navigation arrow |
| `showRouteOverview` | `() => void` | Zoom out to show the full route |
| `moveCamera` | `(position: CameraPosition) => void` | Move camera to a specific position |
| `setAudioGuidance` | `(guidance: AudioGuidance) => void` | Set voice guidance level |
| `startSimulation` | `() => void` | Start simulated navigation along the route |
| `stopSimulation` | `() => void` | Stop simulation |
| `addMarker` | `(marker: Marker) => void` | Add a map marker |
| `removeMarker` | `(markerId: string) => void` | Remove a marker by ID |
| `clearMap` | `() => void` | Remove all markers |
| `getCurrentRoute` | `() => Promise<OnRoutePolylineEvent>` | Get the current route as an encoded polyline |

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `style` | `ViewStyle` | — | View style |
| `mapType` | `MapType` | `NORMAL` | Map type (normal, satellite, terrain, hybrid) |
| `mapColorScheme` | `number` | `0` | Color scheme (0=system, 1=light, 2=dark) |
| `compassEnabled` | `boolean` | `true` | Show compass |
| `myLocationButtonEnabled` | `boolean` | `true` | Show "my location" button |
| `myLocationEnabled` | `boolean` | `true` | Show blue dot for current location |
| `rotateGesturesEnabled` | `boolean` | `true` | Allow rotate gestures |
| `scrollGesturesEnabled` | `boolean` | `true` | Allow scroll/pan gestures |
| `tiltGesturesEnabled` | `boolean` | `true` | Allow tilt gestures |
| `zoomGesturesEnabled` | `boolean` | `true` | Allow zoom gestures |
| `trafficEnabled` | `boolean` | `false` | Show traffic layer |
| `buildingsEnabled` | `boolean` | `true` | Show 3D buildings |
| `indoorEnabled` | `boolean` | `false` | Show indoor maps |
| `navigationUIEnabled` | `boolean` | `true` | Show navigation UI (turn arrows, etc.) |
| `headerEnabled` | `boolean` | `true` | Show turn-by-turn header |
| `footerEnabled` | `boolean` | `true` | Show navigation footer |
| `tripProgressBarEnabled` | `boolean` | `false` | Show trip progress bar |
| `speedometerEnabled` | `boolean` | `false` | Show speedometer |
| `speedLimitIconEnabled` | `boolean` | `false` | Show speed limit icon |
| `recenterButtonEnabled` | `boolean` | `true` | Show recenter button |
| `trafficIncidentCardsEnabled` | `boolean` | `true` | Show traffic incident cards |
| `followingPerspective` | `CameraPerspective` | `TILTED` | Camera perspective during navigation |
| `theme` | `NavigationTheme` | — | Custom navigation theme colors |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onMapReady` | — | Map view is ready |
| `onMapClick` | `{ latitude, longitude }` | User tapped the map |
| `onNavigationReady` | — | Navigation SDK initialized |
| `onRouteReady` | `{ totalTimeSeconds, totalDistanceMeters }` | Route computed successfully |
| `onArrival` | `{ waypointIndex, isFinalDestination, waypointTitle, waypointLatitude, waypointLongitude, waypointMetadata }` | Arrived at a waypoint |
| `onLocationChanged` | `{ latitude, longitude, bearing, speed, accuracy }` | Location update (throttled to every 30s) |
| `onTurnByTurnUpdated` | `{ distanceRemainingMeters, timeRemainingSeconds, fullRoadName, maneuver }` | Turn-by-turn instruction updated |
| `onNavigationStateChanged` | `{ state }` | Navigation state changed |
| `onRemainingTimeOrDistanceChanged` | `{ remainingTimeSeconds, remainingDistanceMeters }` | ETA/distance updated |
| `onRouteChanged` | — | Route was recalculated |
| `onTrafficUpdated` | — | Traffic data updated |
| `onRerouting` | — | Rerouting in progress |
| `onSpeeding` | `{ percentageAboveLimit }` | Driver is speeding |
| `onWaypointETAsUpdated` | `{ waypoints: WaypointETA[] }` | Per-waypoint ETA updates |

---

## Hooks

### useGoogleNav

Access the navigation context from any child of `GoogleNavProvider`.

```tsx
import { useGoogleNav } from 'react-native-google-nav';

function MyComponent() {
  const { isInitialized, termsAccepted, navigationState } = useGoogleNav();
  // ...
}
```

### useOTPVerification

Backend-agnostic OTP delivery verification hook. Generates a code, calls your backend to send it to the customer, and verifies the code the driver enters.

```tsx
import { useOTPVerification } from 'react-native-google-nav';

function OTPScreen({ waypointIndex, orderId }) {
  const otp = useOTPVerification({
    waypointIndex,
    waypointTitle: 'Stop 1',
    expirySeconds: 300,
    maxAttempts: 3,
    callbacks: {
      onGenerate: async (wpIndex, code, expiresAt) => {
        // Send OTP to your backend → backend pushes to customer
        await api.sendOTP({ orderId, code, expiresAt });
      },
      onVerify: async (wpIndex, code) => {
        // Validate OTP with your backend
        const result = await api.verifyOTP({ orderId, code });
        return result.valid;
      },
    },
  });

  return (
    <View>
      {otp.status === 'idle' && (
        <Button onPress={otp.generate} title="Generate OTP" />
      )}
      {otp.status === 'sent' && (
        <>
          <Text>Time remaining: {otp.remainingSeconds}s</Text>
          <TextInput
            value={otp.enteredCode}
            onChangeText={otp.setEnteredCode}
            maxLength={6}
            keyboardType="number-pad"
          />
          <Button onPress={otp.verify} title="Verify" />
        </>
      )}
      {otp.status === 'verified' && <Text>Delivery confirmed!</Text>}
      {otp.status === 'failed' && <Text>Verification failed</Text>}
    </View>
  );
}
```

**Return values:**

| Property | Type | Description |
|----------|------|-------------|
| `status` | `OTPDeliveryStatus` | Current status: `idle`, `generating`, `sent`, `verifying`, `verified`, `failed`, `expired` |
| `otp` | `string` | The generated OTP code |
| `enteredCode` | `string` | The code entered by the driver |
| `setEnteredCode` | `(code: string) => void` | Update the entered code |
| `generate` | `() => Promise<void>` | Generate a new OTP and call `onGenerate` |
| `verify` | `() => Promise<boolean>` | Verify the entered code via `onVerify` |
| `reset` | `() => void` | Reset to idle state |
| `attempts` | `number` | Number of verification attempts |
| `maxAttempts` | `number` | Maximum allowed attempts |
| `remainingSeconds` | `number` | Seconds until OTP expires |
| `isExpired` | `boolean` | Whether the OTP has expired |
| `record` | `OTPDeliveryRecord \| null` | Full delivery record |

### useBackgroundLocation

Stream location updates in the background via a foreground service (Android) or background location mode (iOS).

```tsx
import { useBackgroundLocation } from 'react-native-google-nav';

function TrackingComponent() {
  useBackgroundLocation(
    {
      intervalMs: 30000,
      notificationTitle: 'Delivery Active',
      notificationText: 'Tracking your delivery route',
    },
    (location) => {
      console.log(`Background: ${location.latitude}, ${location.longitude}`);
      // Send to your backend
    }
  );
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `intervalMs` | `number` | `5000` | Update interval in ms (Android only) |
| `notificationTitle` | `string` | `'Location Active'` | Foreground service notification title (Android) |
| `notificationText` | `string` | `'Tracking delivery location'` | Foreground service notification text (Android) |

---

## Route Optimization

Optimize waypoint order for the most efficient route using the Google Routes API.

```tsx
import { optimizeWaypointOrder, TravelMode } from 'react-native-google-nav';

const result = await optimizeWaypointOrder({
  apiKey: 'YOUR_API_KEY',
  origin: { latitude: -1.28, longitude: 36.82 },
  waypoints: [
    { position: { latitude: -1.30, longitude: 36.80 }, title: 'Stop A' },
    { position: { latitude: -1.29, longitude: 36.85 }, title: 'Stop B' },
    { position: { latitude: -1.31, longitude: 36.83 }, title: 'Stop C' },
  ],
  travelMode: TravelMode.DRIVING,
});

// result.waypoints — reordered waypoints
// result.optimizedOrder — original indices in optimized order
// result.totalDistanceMeters
// result.totalDurationSeconds

navRef.current?.setDestinations(result.waypoints, {
  travelMode: TravelMode.DRIVING,
});
```

> **Note:** Route optimization requires the **Routes API** enabled on your API key. It supports DRIVING and TWO_WHEELER modes only, with a maximum of 25 intermediate waypoints.

---

## Enums

### TravelMode

| Value | Description |
|-------|-------------|
| `DRIVING` (0) | Car/truck routing |
| `CYCLING` (1) | Bicycle routing |
| `WALKING` (2) | Pedestrian routing |
| `TWO_WHEELER` (3) | Motorbike/scooter routing |

### AudioGuidance

| Value | Description |
|-------|-------------|
| `SILENT` (0) | No audio |
| `VOICE_ALERTS_ONLY` (1) | Alert sounds only |
| `VOICE_ALERTS_AND_GUIDANCE` (2) | Full voice guidance |
| `VIBRATION` (3) | Vibration alerts |

### CameraPerspective

| Value | Description |
|-------|-------------|
| `TILTED` (0) | 3D tilted perspective (default for driving) |
| `TOP_DOWN_NORTH` (1) | Top-down, north-up |
| `TOP_DOWN_HEADING` (2) | Top-down, heading-up |

### MapType

| Value | Description |
|-------|-------------|
| `NORMAL` (1) | Standard map |
| `SATELLITE` (2) | Satellite imagery |
| `TERRAIN` (3) | Terrain map |
| `HYBRID` (4) | Satellite + labels |

---

## Theming

Customize navigation UI colors:

```tsx
<GoogleNavView
  theme={{
    headerBackgroundColor: '#1a73e8',
    headerSecondaryBackgroundColor: '#1565c0',
    headerTextColor: '#ffffff',
    headerManeuverIconColor: '#ffffff',
    routeColor: '#4285f4',
    routeTraveledColor: '#aaaaaa',
    trafficColorNormal: '#4caf50',
    trafficColorSlow: '#ff9800',
    trafficColorTrafficJam: '#f44336',
  }}
/>
```

Or use the built-in themes:

```tsx
import { DefaultNavigationTheme, DarkNavigationTheme } from 'react-native-google-nav';

<GoogleNavView theme={DarkNavigationTheme} />
```

---

## Simulation Mode

Test navigation without real GPS movement. After setting destinations:

```tsx
// Start simulated driving along the route
navRef.current?.startSimulation();

// Stop simulation (e.g., at a delivery stop for OTP verification)
navRef.current?.stopSimulation();

// Resume after OTP — rebuilds route with remaining waypoints
navRef.current?.startSimulation();
```

Simulation speed varies by travel mode for realistic testing.

---

## Troubleshooting

### "Navigation SDK not initialized"
- Ensure `GoogleNavProvider` wraps your navigation screen
- Verify your API key has the Navigation SDK enabled
- Check that the user accepted the Terms & Conditions dialog

### "Searching for GPS" on Android emulator
- This is expected briefly when simulation is paused. It resolves when simulation resumes.

### iOS build fails with "GoogleNavigation not found"
- Run `cd ios && pod install --repo-update`
- Ensure your Podfile has `platform :ios, '16.0'` or higher

### Android build fails
- Ensure `minSdkVersion` is at least 24
- Ensure `compileSdkVersion` is at least 36
- The Navigation SDK requires Google Play Services

### Route optimization returns error
- Ensure the **Routes API** is enabled on your API key
- Walking and cycling modes do not support route optimization

---

## Example App

The `example/` directory contains a full-featured delivery navigation app demonstrating:

- Multi-stop route planning with place search
- Route optimization
- Turn-by-turn navigation with simulation
- OTP delivery verification at each stop
- Stop skipping/cancellation with index management
- Background location tracking
- Delivery summary screen

To run the example:

```sh
cd example
npm install
# Add your API keys to example/src/config.ts and example/app.json
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android
```

---

## Contributing

See the [contributing guide](CONTRIBUTING.md) for development workflow and pull request guidelines.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
