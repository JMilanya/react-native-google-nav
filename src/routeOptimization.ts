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

const TRAVEL_MODE_MAP: Record<number, string> = {
  [TravelMode.DRIVING]: 'DRIVE',
  [TravelMode.CYCLING]: 'TWO_WHEELER',
  [TravelMode.WALKING]: 'WALK',
  [TravelMode.TWO_WHEELER]: 'TWO_WHEELER',
};

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
export async function optimizeWaypointOrder(
  options: OptimizeWaypointOrderOptions
): Promise<OptimizeWaypointOrderResult> {
  const {
    apiKey,
    origin,
    waypoints,
    travelMode = TravelMode.DRIVING,
  } = options;

  if (
    travelMode === TravelMode.WALKING ||
    travelMode === TravelMode.CYCLING
  ) {
    throw new Error(
      'Route optimization is only supported for DRIVING and TWO_WHEELER travel modes. ' +
        'Walking and cycling routes cannot be optimized.'
    );
  }

  if (waypoints.length === 0) {
    return {
      waypoints: [],
      optimizedOrder: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
    };
  }

  if (waypoints.length === 1) {
    return {
      waypoints: [...waypoints],
      optimizedOrder: [0],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
    };
  }

  if (waypoints.length > 25) {
    throw new Error(
      'Google Routes API supports a maximum of 25 intermediate waypoints. ' +
        `Got ${waypoints.length}. Consider splitting into multiple routes.`
    );
  }

  const lastWaypoint = waypoints[waypoints.length - 1]!;
  const intermediates = waypoints.slice(0, -1);

  const apiTravelMode = TRAVEL_MODE_MAP[travelMode] ?? 'DRIVE';

  // routingPreference is only valid for DRIVE and TWO_WHEELER.
  // The Routes API returns 400 if it's set for WALK or BICYCLE.
  const supportsRoutingPref =
    travelMode === TravelMode.DRIVING || travelMode === TravelMode.TWO_WHEELER;

  const body: Record<string, unknown> = {
    origin: {
      location: {
        latLng: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: lastWaypoint.position.latitude,
          longitude: lastWaypoint.position.longitude,
        },
      },
    },
    intermediates: intermediates.map((wp) => ({
      location: {
        latLng: {
          latitude: wp.position.latitude,
          longitude: wp.position.longitude,
        },
      },
    })),
    travelMode: apiTravelMode,
    optimizeWaypointOrder: true,
    ...(supportsRoutingPref && { routingPreference: 'TRAFFIC_AWARE' }),
  };

  const response = await fetch(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Routes API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route) {
    throw new Error('No route returned from Routes API');
  }

  // The API returns optimizedIntermediateWaypointIndex — the reordered indices
  // of the intermediate waypoints (0-based, referring to the intermediates array).
  const optimizedIndices: number[] =
    route.optimizedIntermediateWaypointIndex ?? intermediates.map((_: unknown, i: number) => i);

  // Rebuild the waypoints array in the optimized order.
  // The last waypoint (destination) stays at the end.
  const reorderedWaypoints: Waypoint[] = [
    ...optimizedIndices.map((idx: number) => intermediates[idx]!),
    lastWaypoint,
  ];

  // Build full optimized order (indices into original waypoints array)
  const fullOptimizedOrder = [
    ...optimizedIndices,
    waypoints.length - 1,
  ];

  const durationStr: string = route.duration ?? '0s';
  const durationSeconds = parseFloat(durationStr.replace('s', '')) || 0;

  return {
    waypoints: reorderedWaypoints,
    optimizedOrder: fullOptimizedOrder,
    totalDistanceMeters: route.distanceMeters ?? 0,
    totalDurationSeconds: durationSeconds,
  };
}
