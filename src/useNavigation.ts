import { useRef, useCallback } from 'react';
import type { GoogleNavViewRef } from './GoogleNavView';
import type {
  AudioGuidance,
  CameraPosition,
  Marker,
  RoutingOptions,
  Waypoint,
} from './types';

export function useNavigation() {
  const ref = useRef<GoogleNavViewRef>(null);

  const setDestinations = useCallback(
    (waypoints: Waypoint[], options?: RoutingOptions) => {
      ref.current?.setDestinations(waypoints, options);
    },
    []
  );

  const startGuidance = useCallback(() => {
    ref.current?.startGuidance();
  }, []);

  const stopGuidance = useCallback(() => {
    ref.current?.stopGuidance();
  }, []);

  const clearDestinations = useCallback(() => {
    ref.current?.clearDestinations();
  }, []);

  const recenterCamera = useCallback(() => {
    ref.current?.recenterCamera();
  }, []);

  const showRouteOverview = useCallback(() => {
    ref.current?.showRouteOverview();
  }, []);

  const moveCamera = useCallback((position: CameraPosition) => {
    ref.current?.moveCamera(position);
  }, []);

  const setAudioGuidance = useCallback((guidance: AudioGuidance) => {
    ref.current?.setAudioGuidance(guidance);
  }, []);

  const startSimulation = useCallback(() => {
    ref.current?.startSimulation();
  }, []);

  const stopSimulation = useCallback(() => {
    ref.current?.stopSimulation();
  }, []);

  const addMarker = useCallback((marker: Marker) => {
    ref.current?.addMarker(marker);
  }, []);

  const removeMarker = useCallback((markerId: string) => {
    ref.current?.removeMarker(markerId);
  }, []);

  const clearMap = useCallback(() => {
    ref.current?.clearMap();
  }, []);

  return {
    ref,
    setDestinations,
    startGuidance,
    stopGuidance,
    clearDestinations,
    recenterCamera,
    showRouteOverview,
    moveCamera,
    setAudioGuidance,
    startSimulation,
    stopSimulation,
    addMarker,
    removeMarker,
    clearMap,
  };
}
