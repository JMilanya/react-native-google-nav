"use strict";

import { useEffect, useRef } from 'react';
import { NativeEventEmitter } from 'react-native';
import NativeGoogleNavModule from "./NativeGoogleNavModule.js";
const emitter = new NativeEventEmitter(NativeGoogleNavModule);

/**
 * Starts background location streaming via the GoogleNavModule foreground service
 * (Android) or CLLocationManager background mode (iOS).
 *
 * Options are read once on mount — unmount and remount to change them.
 * Stops automatically on unmount.
 *
 * iOS prerequisites: add `"location"` to `UIBackgroundModes` in app.json:
 *   "ios": { "infoPlist": { "UIBackgroundModes": ["location"] } }
 *
 * Android prerequisites: call this after requesting
 *   ACCESS_FINE_LOCATION and ACCESS_BACKGROUND_LOCATION from the user.
 */
export function useBackgroundLocation(options, onLocation) {
  const onLocationRef = useRef(onLocation);
  onLocationRef.current = onLocation;

  // Capture options once on mount — stable for the lifetime of the effect
  const optionsRef = useRef(options);
  useEffect(() => {
    const {
      intervalMs = 30000,
      notificationTitle = 'Location Active',
      notificationText = 'Tracking delivery location'
    } = optionsRef.current;
    let started = false;
    const subscription = emitter.addListener('onBackgroundLocationUpdate', event => {
      onLocationRef.current(event);
    });
    NativeGoogleNavModule.startBackgroundLocationUpdates(intervalMs, notificationTitle, notificationText).then(() => {
      started = true;
    }).catch(err => {
      console.warn('[useBackgroundLocation] Failed to start:', err);
    });
    return () => {
      subscription.remove();
      if (started) {
        NativeGoogleNavModule.stopBackgroundLocationUpdates().catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
//# sourceMappingURL=useBackgroundLocation.js.map