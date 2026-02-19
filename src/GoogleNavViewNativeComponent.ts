import type { HostComponent, ViewProps, ColorValue, CodegenTypes } from 'react-native';
import { codegenNativeComponent, codegenNativeCommands } from 'react-native';

// Event payload types for codegen
type OnMapReadyEventData = Readonly<{}>;
type OnMapClickEventData = Readonly<{
  latitude: CodegenTypes.Double;
  longitude: CodegenTypes.Double;
}>;
type OnNavigationReadyEventData = Readonly<{}>;
type OnRouteReadyEventData = Readonly<{
  totalTimeSeconds: CodegenTypes.Double;
  totalDistanceMeters: CodegenTypes.Double;
}>;
type OnArrivalEventData = Readonly<{
  waypointIndex: CodegenTypes.Int32;
  isFinalDestination: boolean;
  waypointLatitude: CodegenTypes.Double;
  waypointLongitude: CodegenTypes.Double;
  waypointTitle: string;
  waypointMetadata: string;
}>;
type OnLocationChangedEventData = Readonly<{
  latitude: CodegenTypes.Double;
  longitude: CodegenTypes.Double;
  bearing: CodegenTypes.Double;
  speed: CodegenTypes.Double;
  accuracy: CodegenTypes.Double;
}>;
type OnTurnByTurnEventData = Readonly<{
  distanceRemainingMeters: CodegenTypes.Double;
  timeRemainingSeconds: CodegenTypes.Double;
  fullRoadName: string;
  maneuver: string;
}>;
type OnNavigationStateChangedEventData = Readonly<{
  state: string;
}>;
type OnRemainingTimeOrDistanceChangedEventData = Readonly<{
  remainingTimeSeconds: CodegenTypes.Double;
  remainingDistanceMeters: CodegenTypes.Double;
}>;
type OnRouteChangedEventData = Readonly<{}>;
type OnTrafficUpdatedEventData = Readonly<{}>;
type OnReroutingEventData = Readonly<{}>;
type OnSpeedingEventData = Readonly<{
  percentageAboveLimit: CodegenTypes.Double;
}>;
type OnRoutePolylineEventData = Readonly<{
  encodedPolyline: string;
  coordinatesJson: string;
}>;
type OnWaypointETAsUpdatedEventData = Readonly<{
  waypointETAsJson: string;
}>;

// Native component props
export interface NativeProps extends ViewProps {
  // Map configuration
  mapType?: CodegenTypes.WithDefault<CodegenTypes.Int32, 1>;
  mapColorScheme?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;

  // Map controls
  compassEnabled?: boolean;
  myLocationButtonEnabled?: boolean;
  myLocationEnabled?: boolean;
  rotateGesturesEnabled?: boolean;
  scrollGesturesEnabled?: boolean;
  tiltGesturesEnabled?: boolean;
  zoomGesturesEnabled?: boolean;
  trafficEnabled?: boolean;
  buildingsEnabled?: boolean;
  indoorEnabled?: boolean;

  // Navigation UI
  navigationUIEnabled?: boolean;
  headerEnabled?: boolean;
  footerEnabled?: boolean;
  tripProgressBarEnabled?: boolean;
  speedometerEnabled?: boolean;
  speedLimitIconEnabled?: boolean;
  recenterButtonEnabled?: boolean;
  trafficIncidentCardsEnabled?: boolean;
  followingPerspective?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;

  // Theming
  headerBackgroundColor?: ColorValue;
  headerSecondaryBackgroundColor?: ColorValue;
  headerTextColor?: ColorValue;
  headerManeuverIconColor?: ColorValue;

  // Events - Bubbling
  onMapReady?: CodegenTypes.BubblingEventHandler<OnMapReadyEventData>;
  onMapClick?: CodegenTypes.BubblingEventHandler<OnMapClickEventData>;
  onNavigationReady?: CodegenTypes.BubblingEventHandler<OnNavigationReadyEventData>;
  onRouteReady?: CodegenTypes.BubblingEventHandler<OnRouteReadyEventData>;

  // Events - Direct
  onArrival?: CodegenTypes.DirectEventHandler<OnArrivalEventData>;
  onLocationChanged?: CodegenTypes.DirectEventHandler<OnLocationChangedEventData>;
  onTurnByTurnUpdated?: CodegenTypes.DirectEventHandler<OnTurnByTurnEventData>;
  onNavigationStateChanged?: CodegenTypes.DirectEventHandler<OnNavigationStateChangedEventData>;
  onRemainingTimeOrDistanceChanged?: CodegenTypes.DirectEventHandler<OnRemainingTimeOrDistanceChangedEventData>;
  onRouteChanged?: CodegenTypes.DirectEventHandler<OnRouteChangedEventData>;
  onTrafficUpdated?: CodegenTypes.DirectEventHandler<OnTrafficUpdatedEventData>;
  onRerouting?: CodegenTypes.DirectEventHandler<OnReroutingEventData>;
  onSpeeding?: CodegenTypes.DirectEventHandler<OnSpeedingEventData>;
  onRoutePolyline?: CodegenTypes.DirectEventHandler<OnRoutePolylineEventData>;
  onWaypointETAsUpdated?: CodegenTypes.DirectEventHandler<OnWaypointETAsUpdatedEventData>;
}

// Native commands
type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  setDestinations: (
    viewRef: React.ElementRef<ComponentType>,
    waypointsJson: string,
    travelMode: CodegenTypes.Int32,
    avoidTolls: boolean,
    avoidHighways: boolean,
    avoidFerries: boolean
  ) => void;
  startGuidance: (viewRef: React.ElementRef<ComponentType>) => void;
  stopGuidance: (viewRef: React.ElementRef<ComponentType>) => void;
  clearDestinations: (viewRef: React.ElementRef<ComponentType>) => void;
  recenterCamera: (viewRef: React.ElementRef<ComponentType>) => void;
  showRouteOverview: (viewRef: React.ElementRef<ComponentType>) => void;
  moveCamera: (
    viewRef: React.ElementRef<ComponentType>,
    latitude: CodegenTypes.Double,
    longitude: CodegenTypes.Double,
    zoom: CodegenTypes.Float,
    bearing: CodegenTypes.Float,
    tilt: CodegenTypes.Float
  ) => void;
  setAudioGuidance: (
    viewRef: React.ElementRef<ComponentType>,
    audioGuidance: CodegenTypes.Int32
  ) => void;
  startSimulation: (viewRef: React.ElementRef<ComponentType>) => void;
  stopSimulation: (viewRef: React.ElementRef<ComponentType>) => void;
  addMarker: (
    viewRef: React.ElementRef<ComponentType>,
    markerId: string,
    latitude: CodegenTypes.Double,
    longitude: CodegenTypes.Double,
    title: string,
    snippet: string
  ) => void;
  removeMarker: (
    viewRef: React.ElementRef<ComponentType>,
    markerId: string
  ) => void;
  clearMap: (viewRef: React.ElementRef<ComponentType>) => void;
  addDestination: (
    viewRef: React.ElementRef<ComponentType>,
    waypointJson: string,
    atIndex: CodegenTypes.Int32
  ) => void;
  removeDestination: (
    viewRef: React.ElementRef<ComponentType>,
    atIndex: CodegenTypes.Int32
  ) => void;
  updateDestination: (
    viewRef: React.ElementRef<ComponentType>,
    atIndex: CodegenTypes.Int32,
    waypointJson: string
  ) => void;
  getCurrentRoute: (viewRef: React.ElementRef<ComponentType>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'setDestinations',
    'startGuidance',
    'stopGuidance',
    'clearDestinations',
    'recenterCamera',
    'showRouteOverview',
    'moveCamera',
    'setAudioGuidance',
    'startSimulation',
    'stopSimulation',
    'addMarker',
    'removeMarker',
    'clearMap',
    'addDestination',
    'removeDestination',
    'updateDestination',
    'getCurrentRoute',
  ],
});

export default codegenNativeComponent<NativeProps>(
  'GoogleNavView'
) as HostComponent<NativeProps>;
