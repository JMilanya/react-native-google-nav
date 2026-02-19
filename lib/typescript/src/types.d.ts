export declare enum TravelMode {
    DRIVING = 0,
    CYCLING = 1,
    WALKING = 2,
    TWO_WHEELER = 3
}
export declare enum AudioGuidance {
    SILENT = 0,
    VOICE_ALERTS_ONLY = 1,
    VOICE_ALERTS_AND_GUIDANCE = 2,
    VIBRATION = 3
}
export declare enum NavigationState {
    IDLE = "IDLE",
    ROUTE_REQUESTED = "ROUTE_REQUESTED",
    ROUTE_READY = "ROUTE_READY",
    NAVIGATING = "NAVIGATING",
    ARRIVED = "ARRIVED",
    ERROR = "ERROR"
}
export declare enum MapType {
    NORMAL = 1,
    SATELLITE = 2,
    TERRAIN = 3,
    HYBRID = 4
}
export declare enum CameraPerspective {
    TILTED = 0,
    TOP_DOWN_NORTH = 1,
    TOP_DOWN_HEADING = 2
}
export declare enum MapColorScheme {
    SYSTEM = 0,
    LIGHT = 1,
    DARK = 2
}
export type LatLng = {
    latitude: number;
    longitude: number;
};
export type CameraPosition = {
    target: LatLng;
    zoom?: number;
    bearing?: number;
    tilt?: number;
};
export type Waypoint = {
    position: LatLng;
    title?: string;
    placeId?: string;
    metadata?: Record<string, string>;
};
export type RoutingOptions = {
    travelMode?: TravelMode;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
};
export type RouteInfo = {
    remainingTimeSeconds: number;
    remainingDistanceMeters: number;
    totalTimeSeconds: number;
    totalDistanceMeters: number;
};
export type StepInfo = {
    distanceRemainingMeters: number;
    timeRemainingSeconds: number;
    fullRoadName: string;
    exitNumber?: string;
    maneuver: string;
};
export type Marker = {
    markerId: string;
    position: LatLng;
    title?: string;
    snippet?: string;
};
export type NavigationTheme = {
    headerBackgroundColor?: string;
    headerBackgroundColorNightMode?: string;
    headerSecondaryBackgroundColor?: string;
    headerTextColor?: string;
    headerManeuverIconColor?: string;
    routeColor?: string;
    routeTraveledColor?: string;
    trafficColorNormal?: string;
    trafficColorSlow?: string;
    trafficColorTrafficJam?: string;
};
export type OnArrivalEvent = {
    waypointIndex: number;
    isFinalDestination: boolean;
    waypointLatitude: number;
    waypointLongitude: number;
    waypointTitle: string;
    waypointMetadata: Record<string, string>;
};
export type OnRouteChangedEvent = {};
export type OnLocationChangedEvent = {
    latitude: number;
    longitude: number;
    bearing: number;
    speed: number;
    accuracy: number;
};
export type OnTurnByTurnUpdatedEvent = {
    distanceRemainingMeters: number;
    timeRemainingSeconds: number;
    fullRoadName: string;
    maneuver: string;
};
export type OnNavigationStateChangedEvent = {
    state: string;
};
export type OnRemainingTimeOrDistanceChangedEvent = {
    remainingTimeSeconds: number;
    remainingDistanceMeters: number;
};
export type OnTrafficUpdatedEvent = {};
export type OnReroutingEvent = {};
export type OnNavigationReadyEvent = {};
export type OnRouteReadyEvent = {
    totalTimeSeconds: number;
    totalDistanceMeters: number;
};
export type OnSpeedingEvent = {
    percentageAboveLimit: number;
};
export type OnMapReadyEvent = {};
export type OnMapClickEvent = {
    latitude: number;
    longitude: number;
};
export type OnRoutePolylineEvent = {
    encodedPolyline: string;
    coordinates: LatLng[];
};
export type WaypointETA = {
    waypointIndex: number;
    remainingTimeSeconds: number;
    remainingDistanceMeters: number;
    title: string;
};
export type OnWaypointETAsUpdatedEvent = {
    waypoints: WaypointETA[];
};
export type BackgroundLocationOptions = {
    /** Location update interval in milliseconds. Android only — iOS delivers as fast as hardware allows. Default: 5000 */
    intervalMs?: number;
    /** Android foreground service notification title. Default: 'Location Active' */
    notificationTitle?: string;
    /** Android foreground service notification body text. Default: 'Tracking delivery location' */
    notificationText?: string;
};
export type OnBackgroundLocationEvent = {
    latitude: number;
    longitude: number;
    bearing: number;
    speed: number;
    accuracy: number;
    /** Unix timestamp in milliseconds */
    timestamp: number;
};
export type OTPDeliveryStatus = 'idle' | 'generating' | 'sent' | 'awaiting_entry' | 'verifying' | 'verified' | 'failed' | 'expired';
export type OTPDeliveryRecord = {
    waypointIndex: number;
    waypointTitle: string;
    otp: string;
    status: OTPDeliveryStatus;
    generatedAt: string;
    verifiedAt?: string;
    expiresAt: string;
    attempts: number;
    metadata?: Record<string, string>;
};
//# sourceMappingURL=types.d.ts.map