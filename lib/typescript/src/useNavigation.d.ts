import type { GoogleNavViewRef } from './GoogleNavView';
import type { AudioGuidance, CameraPosition, Marker, RoutingOptions, Waypoint } from './types';
export declare function useNavigation(): {
    ref: import("react").RefObject<GoogleNavViewRef | null>;
    setDestinations: (waypoints: Waypoint[], options?: RoutingOptions) => void;
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
};
//# sourceMappingURL=useNavigation.d.ts.map