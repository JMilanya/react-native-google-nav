"use strict";

import { useRef, useCallback } from 'react';
export function useNavigation() {
  const ref = useRef(null);
  const setDestinations = useCallback((waypoints, options) => {
    ref.current?.setDestinations(waypoints, options);
  }, []);
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
  const moveCamera = useCallback(position => {
    ref.current?.moveCamera(position);
  }, []);
  const setAudioGuidance = useCallback(guidance => {
    ref.current?.setAudioGuidance(guidance);
  }, []);
  const startSimulation = useCallback(() => {
    ref.current?.startSimulation();
  }, []);
  const stopSimulation = useCallback(() => {
    ref.current?.stopSimulation();
  }, []);
  const addMarker = useCallback(marker => {
    ref.current?.addMarker(marker);
  }, []);
  const removeMarker = useCallback(markerId => {
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
    clearMap
  };
}
//# sourceMappingURL=useNavigation.js.map