"use strict";

import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import NativeGoogleNavView, { Commands } from './GoogleNavViewNativeComponent';
import { TravelMode } from "./types.js";
import { jsx as _jsx } from "react/jsx-runtime";
export const GoogleNavView = /*#__PURE__*/forwardRef((props, ref) => {
  const nativeRef = useRef(null);
  const routePolylineResolveRef = useRef(null);
  useImperativeHandle(ref, () => ({
    setDestinations(waypoints, options = {}) {
      if (!nativeRef.current) return;
      const waypointsJson = JSON.stringify(waypoints.map(wp => ({
        latitude: wp.position.latitude,
        longitude: wp.position.longitude,
        title: wp.title ?? '',
        placeId: wp.placeId ?? '',
        metadata: wp.metadata ?? {}
      })));
      Commands.setDestinations(nativeRef.current, waypointsJson, options.travelMode ?? TravelMode.DRIVING, options.avoidTolls ?? false, options.avoidHighways ?? false, options.avoidFerries ?? false);
    },
    addDestination(waypoint, atIndex = -1) {
      if (!nativeRef.current) return;
      const wpJson = JSON.stringify({
        latitude: waypoint.position.latitude,
        longitude: waypoint.position.longitude,
        title: waypoint.title ?? '',
        placeId: waypoint.placeId ?? '',
        metadata: waypoint.metadata ?? {}
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
        metadata: waypoint.metadata ?? {}
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
      if (nativeRef.current) Commands.moveCamera(nativeRef.current, position.target.latitude, position.target.longitude, position.zoom ?? 14, position.bearing ?? 0, position.tilt ?? 0);
    },
    setAudioGuidance(guidance) {
      if (nativeRef.current) Commands.setAudioGuidance(nativeRef.current, guidance);
    },
    startSimulation() {
      if (nativeRef.current) Commands.startSimulation(nativeRef.current);
    },
    stopSimulation() {
      if (nativeRef.current) Commands.stopSimulation(nativeRef.current);
    },
    addMarker(marker) {
      if (nativeRef.current) Commands.addMarker(nativeRef.current, marker.markerId, marker.position.latitude, marker.position.longitude, marker.title ?? '', marker.snippet ?? '');
    },
    removeMarker(markerId) {
      if (nativeRef.current) Commands.removeMarker(nativeRef.current, markerId);
    },
    clearMap() {
      if (nativeRef.current) Commands.clearMap(nativeRef.current);
    },
    getCurrentRoute() {
      return new Promise((resolve, reject) => {
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
    }
  }));
  const handleRoutePolyline = useCallback(e => {
    let coordinates = [];
    try {
      coordinates = JSON.parse(e.nativeEvent.coordinatesJson || '[]');
    } catch {}
    const event = {
      encodedPolyline: e.nativeEvent.encodedPolyline,
      coordinates
    };
    if (routePolylineResolveRef.current) {
      routePolylineResolveRef.current(event);
      routePolylineResolveRef.current = null;
    }
  }, []);
  const handleWaypointETAs = useCallback(e => {
    let waypoints = [];
    try {
      waypoints = JSON.parse(e.nativeEvent.waypointETAsJson || '[]');
    } catch {}
    props.onWaypointETAsUpdated?.({
      waypoints
    });
  }, [props.onWaypointETAsUpdated]);
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
  return /*#__PURE__*/_jsx(NativeGoogleNavView, {
    ref: nativeRef,
    style: style,
    ...restProps,
    // Theme colors
    headerBackgroundColor: theme?.headerBackgroundColor,
    headerSecondaryBackgroundColor: theme?.headerSecondaryBackgroundColor,
    headerTextColor: theme?.headerTextColor,
    headerManeuverIconColor: theme?.headerManeuverIconColor
    // Bubbling events
    ,
    onMapReady: onMapReady ? () => onMapReady() : undefined,
    onMapClick: onMapClick ? e => onMapClick(e.nativeEvent) : undefined,
    onNavigationReady: onNavigationReady ? () => onNavigationReady() : undefined,
    onRouteReady: onRouteReady ? e => onRouteReady(e.nativeEvent) : undefined
    // Direct events
    ,
    onArrival: onArrival ? e => {
      let metadata = {};
      try {
        metadata = JSON.parse(e.nativeEvent.waypointMetadata || '{}');
      } catch {}
      onArrival({
        waypointIndex: e.nativeEvent.waypointIndex,
        isFinalDestination: e.nativeEvent.isFinalDestination,
        waypointLatitude: e.nativeEvent.waypointLatitude,
        waypointLongitude: e.nativeEvent.waypointLongitude,
        waypointTitle: e.nativeEvent.waypointTitle,
        waypointMetadata: metadata
      });
    } : undefined,
    onLocationChanged: onLocationChanged ? e => onLocationChanged(e.nativeEvent) : undefined,
    onTurnByTurnUpdated: onTurnByTurnUpdated ? e => onTurnByTurnUpdated(e.nativeEvent) : undefined,
    onNavigationStateChanged: onNavigationStateChanged ? e => onNavigationStateChanged(e.nativeEvent) : undefined,
    onRemainingTimeOrDistanceChanged: onRemainingTimeOrDistanceChanged ? e => onRemainingTimeOrDistanceChanged(e.nativeEvent) : undefined,
    onRouteChanged: onRouteChanged ? () => onRouteChanged() : undefined,
    onTrafficUpdated: onTrafficUpdated ? () => onTrafficUpdated() : undefined,
    onRerouting: onRerouting ? () => onRerouting() : undefined,
    onSpeeding: onSpeeding ? e => onSpeeding(e.nativeEvent) : undefined,
    onRoutePolyline: handleRoutePolyline,
    onWaypointETAsUpdated: handleWaypointETAs
  });
});
//# sourceMappingURL=GoogleNavView.js.map