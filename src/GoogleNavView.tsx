import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import type { HostComponent, StyleProp, ViewStyle } from 'react-native';
import NativeGoogleNavView, {
  Commands,
  type NativeProps,
} from './GoogleNavViewNativeComponent';
import type {
  AudioGuidance,
  CameraPosition,
  CameraPerspective,
  LatLng,
  MapType,
  Marker,
  NavigationTheme,
  OnArrivalEvent,
  OnLocationChangedEvent,
  OnMapClickEvent,
  OnNavigationStateChangedEvent,
  OnRemainingTimeOrDistanceChangedEvent,
  OnRoutePolylineEvent,
  OnRouteReadyEvent,
  OnSpeedingEvent,
  OnTurnByTurnUpdatedEvent,
  OnWaypointETAsUpdatedEvent,
  RoutingOptions,
  WaypointETA,
  Waypoint,
} from './types';
import { TravelMode } from './types';

export interface GoogleNavViewRef {
  setDestinations: (waypoints: Waypoint[], options?: RoutingOptions) => void;
  addDestination: (waypoint: Waypoint, atIndex?: number) => void;
  removeDestination: (atIndex: number) => void;
  updateDestination: (atIndex: number, waypoint: Waypoint) => void;
  startGuidance: () => void;
  stopGuidance: () => void;
  clearDestinations: () => void;
  recenterCamera: () => void;
  showRouteOverview: () => void;
  moveCamera: (position: CameraPosition) => void;
  setAudioGuidance: (guidance: AudioGuidance) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  addMarker: (marker: Marker) => void;
  removeMarker: (markerId: string) => void;
  clearMap: () => void;
  getCurrentRoute: () => Promise<OnRoutePolylineEvent>;
}

export interface GoogleNavViewProps {
  style?: StyleProp<ViewStyle>;

  // Map configuration
  mapType?: MapType;
  mapColorScheme?: number;

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
  followingPerspective?: CameraPerspective;

  // Theming
  theme?: NavigationTheme;

  // Event handlers
  onMapReady?: () => void;
  onMapClick?: (event: OnMapClickEvent) => void;
  onNavigationReady?: () => void;
  onRouteReady?: (event: OnRouteReadyEvent) => void;
  onArrival?: (event: OnArrivalEvent) => void;
  onLocationChanged?: (event: OnLocationChangedEvent) => void;
  onTurnByTurnUpdated?: (event: OnTurnByTurnUpdatedEvent) => void;
  onNavigationStateChanged?: (event: OnNavigationStateChangedEvent) => void;
  onRemainingTimeOrDistanceChanged?: (
    event: OnRemainingTimeOrDistanceChangedEvent
  ) => void;
  onRouteChanged?: () => void;
  onTrafficUpdated?: () => void;
  onRerouting?: () => void;
  onSpeeding?: (event: OnSpeedingEvent) => void;
  onWaypointETAsUpdated?: (event: OnWaypointETAsUpdatedEvent) => void;
}

export const GoogleNavView = forwardRef<GoogleNavViewRef, GoogleNavViewProps>(
  (props, ref) => {
    const nativeRef =
      useRef<React.ElementRef<HostComponent<NativeProps>>>(null);
    const routePolylineResolveRef = useRef<
      ((value: OnRoutePolylineEvent) => void) | null
    >(null);

    useImperativeHandle(ref, () => ({
      setDestinations(waypoints, options = {}) {
        if (!nativeRef.current) return;
        const waypointsJson = JSON.stringify(
          waypoints.map((wp) => ({
            latitude: wp.position.latitude,
            longitude: wp.position.longitude,
            title: wp.title ?? '',
            placeId: wp.placeId ?? '',
            metadata: wp.metadata ?? {},
          }))
        );
        Commands.setDestinations(
          nativeRef.current,
          waypointsJson,
          options.travelMode ?? TravelMode.DRIVING,
          options.avoidTolls ?? false,
          options.avoidHighways ?? false,
          options.avoidFerries ?? false
        );
      },
      addDestination(waypoint, atIndex = -1) {
        if (!nativeRef.current) return;
        const wpJson = JSON.stringify({
          latitude: waypoint.position.latitude,
          longitude: waypoint.position.longitude,
          title: waypoint.title ?? '',
          placeId: waypoint.placeId ?? '',
          metadata: waypoint.metadata ?? {},
        });
        Commands.addDestination(nativeRef.current, wpJson, atIndex);
      },
      removeDestination(atIndex) {
        if (!nativeRef.current) return;
        Commands.removeDestination(nativeRef.current, atIndex);
      },
      updateDestination(atIndex, waypoint) {
        if (!nativeRef.current) return;
        const wpJson = JSON.stringify({
          latitude: waypoint.position.latitude,
          longitude: waypoint.position.longitude,
          title: waypoint.title ?? '',
          placeId: waypoint.placeId ?? '',
          metadata: waypoint.metadata ?? {},
        });
        Commands.updateDestination(nativeRef.current, atIndex, wpJson);
      },
      startGuidance() {
        if (nativeRef.current) Commands.startGuidance(nativeRef.current);
      },
      stopGuidance() {
        if (nativeRef.current) Commands.stopGuidance(nativeRef.current);
      },
      clearDestinations() {
        if (nativeRef.current) Commands.clearDestinations(nativeRef.current);
      },
      recenterCamera() {
        if (nativeRef.current) Commands.recenterCamera(nativeRef.current);
      },
      showRouteOverview() {
        if (nativeRef.current) Commands.showRouteOverview(nativeRef.current);
      },
      moveCamera(position) {
        if (nativeRef.current)
          Commands.moveCamera(
            nativeRef.current,
            position.target.latitude,
            position.target.longitude,
            position.zoom ?? 14,
            position.bearing ?? 0,
            position.tilt ?? 0
          );
      },
      setAudioGuidance(guidance) {
        if (nativeRef.current)
          Commands.setAudioGuidance(nativeRef.current, guidance);
      },
      startSimulation() {
        if (nativeRef.current) Commands.startSimulation(nativeRef.current);
      },
      stopSimulation() {
        if (nativeRef.current) Commands.stopSimulation(nativeRef.current);
      },
      addMarker(marker) {
        if (nativeRef.current)
          Commands.addMarker(
            nativeRef.current,
            marker.markerId,
            marker.position.latitude,
            marker.position.longitude,
            marker.title ?? '',
            marker.snippet ?? ''
          );
      },
      removeMarker(markerId) {
        if (nativeRef.current)
          Commands.removeMarker(nativeRef.current, markerId);
      },
      clearMap() {
        if (nativeRef.current) Commands.clearMap(nativeRef.current);
      },
      getCurrentRoute() {
        return new Promise<OnRoutePolylineEvent>((resolve, reject) => {
          if (!nativeRef.current) {
            reject(new Error('GoogleNavView not ready'));
            return;
          }
          routePolylineResolveRef.current = resolve;
          Commands.getCurrentRoute(nativeRef.current);
          setTimeout(() => {
            if (routePolylineResolveRef.current) {
              routePolylineResolveRef.current = null;
              reject(new Error('getCurrentRoute timed out'));
            }
          }, 5000);
        });
      },
    }));

    const handleRoutePolyline = useCallback(
      (e: { nativeEvent: { encodedPolyline: string; coordinatesJson: string } }) => {
        let coordinates: LatLng[] = [];
        try {
          coordinates = JSON.parse(e.nativeEvent.coordinatesJson || '[]');
        } catch {}
        const event: OnRoutePolylineEvent = {
          encodedPolyline: e.nativeEvent.encodedPolyline,
          coordinates,
        };
        if (routePolylineResolveRef.current) {
          routePolylineResolveRef.current(event);
          routePolylineResolveRef.current = null;
        }
      },
      []
    );

    const handleWaypointETAs = useCallback(
      (e: { nativeEvent: { waypointETAsJson: string } }) => {
        let waypoints: WaypointETA[] = [];
        try {
          waypoints = JSON.parse(e.nativeEvent.waypointETAsJson || '[]');
        } catch {}
        props.onWaypointETAsUpdated?.({ waypoints });
      },
      [props.onWaypointETAsUpdated]
    );

    const {
      style,
      theme,
      onMapReady,
      onMapClick,
      onNavigationReady,
      onRouteReady,
      onArrival,
      onLocationChanged,
      onTurnByTurnUpdated,
      onNavigationStateChanged,
      onRemainingTimeOrDistanceChanged,
      onRouteChanged,
      onTrafficUpdated,
      onRerouting,
      onSpeeding,
      onWaypointETAsUpdated: _onWaypointETAs,
      ...restProps
    } = props;

    return (
      <NativeGoogleNavView
        ref={nativeRef}
        style={style}
        {...restProps}
        // Theme colors
        headerBackgroundColor={theme?.headerBackgroundColor}
        headerSecondaryBackgroundColor={theme?.headerSecondaryBackgroundColor}
        headerTextColor={theme?.headerTextColor}
        headerManeuverIconColor={theme?.headerManeuverIconColor}
        // Bubbling events
        onMapReady={onMapReady ? () => onMapReady() : undefined}
        onMapClick={
          onMapClick
            ? (e: { nativeEvent: { latitude: number; longitude: number } }) =>
                onMapClick(e.nativeEvent)
            : undefined
        }
        onNavigationReady={
          onNavigationReady ? () => onNavigationReady() : undefined
        }
        onRouteReady={
          onRouteReady
            ? (e: {
                nativeEvent: {
                  totalTimeSeconds: number;
                  totalDistanceMeters: number;
                };
              }) => onRouteReady(e.nativeEvent)
            : undefined
        }
        // Direct events
        onArrival={
          onArrival
            ? (e: {
                nativeEvent: {
                  waypointIndex: number;
                  isFinalDestination: boolean;
                  waypointLatitude: number;
                  waypointLongitude: number;
                  waypointTitle: string;
                  waypointMetadata: string;
                };
              }) => {
                let metadata: Record<string, string> = {};
                try {
                  metadata = JSON.parse(e.nativeEvent.waypointMetadata || '{}');
                } catch {}
                onArrival({
                  waypointIndex: e.nativeEvent.waypointIndex,
                  isFinalDestination: e.nativeEvent.isFinalDestination,
                  waypointLatitude: e.nativeEvent.waypointLatitude,
                  waypointLongitude: e.nativeEvent.waypointLongitude,
                  waypointTitle: e.nativeEvent.waypointTitle,
                  waypointMetadata: metadata,
                });
              }
            : undefined
        }
        onLocationChanged={
          onLocationChanged
            ? (e: { nativeEvent: OnLocationChangedEvent }) =>
                onLocationChanged(e.nativeEvent)
            : undefined
        }
        onTurnByTurnUpdated={
          onTurnByTurnUpdated
            ? (e: { nativeEvent: OnTurnByTurnUpdatedEvent }) =>
                onTurnByTurnUpdated(e.nativeEvent)
            : undefined
        }
        onNavigationStateChanged={
          onNavigationStateChanged
            ? (e: { nativeEvent: OnNavigationStateChangedEvent }) =>
                onNavigationStateChanged(e.nativeEvent)
            : undefined
        }
        onRemainingTimeOrDistanceChanged={
          onRemainingTimeOrDistanceChanged
            ? (e: {
                nativeEvent: OnRemainingTimeOrDistanceChangedEvent;
              }) => onRemainingTimeOrDistanceChanged(e.nativeEvent)
            : undefined
        }
        onRouteChanged={onRouteChanged ? () => onRouteChanged() : undefined}
        onTrafficUpdated={
          onTrafficUpdated ? () => onTrafficUpdated() : undefined
        }
        onRerouting={onRerouting ? () => onRerouting() : undefined}
        onSpeeding={
          onSpeeding
            ? (e: { nativeEvent: OnSpeedingEvent }) =>
                onSpeeding(e.nativeEvent)
            : undefined
        }
        onRoutePolyline={handleRoutePolyline}
        onWaypointETAsUpdated={handleWaypointETAs}
      />
    );
  }
);
