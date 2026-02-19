// Components
export { GoogleNavView } from './GoogleNavView';
export type { GoogleNavViewRef, GoogleNavViewProps } from './GoogleNavView';

// Provider & Context
export { GoogleNavProvider, useGoogleNav } from './GoogleNavProvider';
export type { GoogleNavProviderProps } from './GoogleNavProvider';

// Hooks
export { useNavigation } from './useNavigation';
export { useOTPVerification } from './useOTPVerification';
export { useBackgroundLocation } from './useBackgroundLocation';
export type {
  OTPCallbacks,
  UseOTPVerificationOptions,
  UseOTPVerificationReturn,
} from './useOTPVerification';

// Route Optimization
export { optimizeWaypointOrder } from './routeOptimization';
export type {
  OptimizeWaypointOrderOptions,
  OptimizeWaypointOrderResult,
} from './routeOptimization';

// Theme
export {
  DefaultNavigationTheme,
  DarkNavigationTheme,
  createNavigationTheme,
} from './theme';

// Types & Enums
export {
  TravelMode,
  AudioGuidance,
  NavigationState,
  MapType,
  CameraPerspective,
  MapColorScheme,
} from './types';

export type {
  LatLng,
  CameraPosition,
  Waypoint,
  RoutingOptions,
  RouteInfo,
  StepInfo,
  Marker,
  NavigationTheme,
  OnArrivalEvent,
  OnRouteChangedEvent,
  OnLocationChangedEvent,
  OnTurnByTurnUpdatedEvent,
  OnNavigationStateChangedEvent,
  OnRemainingTimeOrDistanceChangedEvent,
  OnTrafficUpdatedEvent,
  OnReroutingEvent,
  OnNavigationReadyEvent,
  OnRouteReadyEvent,
  OnSpeedingEvent,
  OnMapReadyEvent,
  OnMapClickEvent,
  OnRoutePolylineEvent,
  WaypointETA,
  OnWaypointETAsUpdatedEvent,
  OTPDeliveryStatus,
  OTPDeliveryRecord,
  BackgroundLocationOptions,
  OnBackgroundLocationEvent,
} from './types';
