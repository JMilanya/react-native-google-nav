import type { LatLng, Waypoint } from './types';
import { TravelMode } from './types';
export interface OptimizeWaypointOrderOptions {
    apiKey: string;
    origin: LatLng;
    waypoints: Waypoint[];
    travelMode?: TravelMode;
    returnToOrigin?: boolean;
}
export interface OptimizeWaypointOrderResult {
    waypoints: Waypoint[];
    optimizedOrder: number[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
}
/**
 * Optimizes the order of waypoints for the most efficient route using
 * the Google Routes API (computeRoutes with optimizeWaypointOrder).
 *
 * Supports up to 25 intermediate waypoints per Google API limits.
 *
 * @example
 * ```ts
 * import { optimizeWaypointOrder } from 'react-native-google-nav';
 *
 * const result = await optimizeWaypointOrder({
 *   apiKey: 'YOUR_KEY',
 *   origin: { latitude: -1.28, longitude: 36.82 },
 *   waypoints: deliveryStops,
 *   travelMode: TravelMode.DRIVING,
 * });
 * viewRef.current?.setDestinations(result.waypoints, { travelMode: TravelMode.DRIVING });
 * ```
 */
export declare function optimizeWaypointOrder(options: OptimizeWaypointOrderOptions): Promise<OptimizeWaypointOrderResult>;
//# sourceMappingURL=routeOptimization.d.ts.map