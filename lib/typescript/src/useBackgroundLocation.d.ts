import type { BackgroundLocationOptions, OnBackgroundLocationEvent } from './types';
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
export declare function useBackgroundLocation(options: BackgroundLocationOptions, onLocation: (event: OnBackgroundLocationEvent) => void): void;
//# sourceMappingURL=useBackgroundLocation.d.ts.map