import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GoogleNavView,
  GoogleNavProvider,
  useGoogleNav,
  useBackgroundLocation,
  AudioGuidance,
  createNavigationTheme,
  type GoogleNavViewRef,
  type OnRouteReadyEvent,
  type OnTurnByTurnUpdatedEvent,
  type OnRemainingTimeOrDistanceChangedEvent,
  type OnNavigationStateChangedEvent,
  type OnArrivalEvent,
  type OnLocationChangedEvent,
  type OnBackgroundLocationEvent,
  type OnSpeedingEvent,
  type WaypointETA,
} from 'react-native-google-nav';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, DeliveryStop, OTPStatus } from '../App';
import { GOOGLE_API_KEY } from '../config';
import DispatchModal, {
  type DispatchMode,
  type DispatchStopData,
  type UndeliveredStop,
} from '../components/DispatchModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigation'>;

const theme = createNavigationTheme({
  headerBackgroundColor: '#1A73E8',
  headerSecondaryBackgroundColor: '#174EA6',
  headerTextColor: '#FFFFFF',
  headerManeuverIconColor: '#FFFFFF',
});

type StopEntry = {
  title: string;
  latitude: number;
  longitude: number;
  metadata: Record<string, string>;
};

/**
 * Mounts/unmounts to start/stop background location tracking.
 * Rendered as null — side-effect only via useBackgroundLocation hook.
 */
function BackgroundLocationTracker({
  onLocation,
}: {
  onLocation: (e: OnBackgroundLocationEvent) => void;
}) {
  useBackgroundLocation(
    {
      intervalMs: 30000,
      notificationTitle: 'Delivery Tracking Active',
      notificationText: 'GPS location is being tracked',
    },
    onLocation
  );
  return null;
}

function NavigationContent({ route, navigation }: Props) {
  const { destinations, travelMode } = route.params;
  const { isInitialized, termsAccepted } = useGoogleNav();
  const viewRef = useRef<GoogleNavViewRef>(null);
  const [isNavReady, setIsNavReady] = useState(false);
  const [isRouteReady, setIsRouteReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [eta, setEta] = useState('');
  const [distance, setDistance] = useState('');
  const [nextManeuver, setNextManeuver] = useState('');
  const [navState, setNavState] = useState('IDLE');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [arrivedCount, setArrivedCount] = useState(0);
  const [deliveredIndices, setDeliveredIndices] = useState<Set<number>>(new Set());
  const [locationCount, setLocationCount] = useState(0);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgCount, setBgCount] = useState(0);
  const [lastBgLocation, setLastBgLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>('add');
  const [waypointETAs, setWaypointETAs] = useState<WaypointETA[]>([]);
  const [routePolylineLen, setRoutePolylineLen] = useState<number | null>(null);
  // Default camera perspective based on travel mode:
  // Driving/TwoWheeler → Tilted (0), Walking/Cycling → TopDownHeadingUp (2)
  const [cameraPerspective, setCameraPerspective] = useState(
    travelMode === 2 || travelMode === 3 ? 2 : 0
  ); // 0=Tilted, 1=TopDownNorthUp, 2=TopDownHeadingUp
  const [rerouteCount, setRerouteCount] = useState(0);
  const [speedingPct, setSpeedingPct] = useState<number | null>(null);
  const speedingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [otpResults, setOtpResults] = useState<Map<number, OTPStatus>>(new Map());
  const otpResultsRef = useRef<Map<number, OTPStatus>>(new Map());
  const skippedStopsRef = useRef<StopEntry[]>([]);
  const wasSimulatingRef = useRef(false);
  const pendingFinalRef = useRef(false);
  const tripEndedRef = useRef(false);
  const isSimulatingRef = useRef(false);
  const isNavigatingRef = useRef(false);  // true while real guidance (not simulation) is active
  const wasNavigatingRef = useRef(false); // true if guidance was active before OTP
  const otpPendingRef = useRef(false);
  const arrivalQueueRef = useRef<OnArrivalEvent[]>([]);

  // Mutable stops state — initialized from route params, updated by dispatch actions
  const [stopsState, setStopsState] = useState<StopEntry[]>(() =>
    destinations.map((d) => ({
      title: d.title,
      latitude: d.latitude,
      longitude: d.longitude,
      metadata: (d.metadata as Record<string, string>) ?? {},
    }))
  );

  const totalStops = stopsState.length;
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state so the OTP effect always reads fresh data
  const stopsStateRef = useRef(stopsState);
  const deliveredIndicesRef = useRef(deliveredIndices);
  stopsStateRef.current = stopsState;
  deliveredIndicesRef.current = deliveredIndices;

  const isActive = isNavigating || isSimulating;

  // Auto-collapse panel after expanding during active navigation/simulation
  const scheduleAutoCollapse = useCallback(() => {
    if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
    autoCollapseTimer.current = setTimeout(() => {
      setIsPanelExpanded(false);
    }, 4000);
  }, []);

  const expandPanel = useCallback(() => {
    setIsPanelExpanded(true);
    if (isActive) scheduleAutoCollapse();
  }, [isActive, scheduleAutoCollapse]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
    };
  }, []);

  const handleNavigationReady = useCallback(() => {
    console.log('[NavigationScreen] onNavigationReady fired, setting destinations:', destinations);
    setIsNavReady(true);
    viewRef.current?.setDestinations(
      destinations.map((d) => ({
        position: { latitude: d.latitude, longitude: d.longitude },
        title: d.title,
        metadata: d.metadata,
      })),
      { travelMode }
    );
  }, [destinations, travelMode]);

  const handleRouteReady = useCallback((event: OnRouteReadyEvent) => {
    console.log('[NavigationScreen] onRouteReady:', event);
    setIsRouteReady(true);
    const mins = Math.round(event.totalTimeSeconds / 60);
    const km = (event.totalDistanceMeters / 1000).toFixed(1);
    setEta(`${mins} min`);
    setDistance(`${km} km`);
  }, []);

  const handleTurnByTurn = useCallback(
    (event: OnTurnByTurnUpdatedEvent) => {
      const distText =
        event.distanceRemainingMeters > 1000
          ? `${(event.distanceRemainingMeters / 1000).toFixed(1)} km`
          : `${Math.round(event.distanceRemainingMeters)} m`;
      setNextManeuver(`In ${distText}: ${event.maneuver}`);
    },
    []
  );

  const handleRemainingChanged = useCallback(
    (event: OnRemainingTimeOrDistanceChangedEvent) => {
      const mins = Math.round(event.remainingTimeSeconds / 60);
      const km = (event.remainingDistanceMeters / 1000).toFixed(1);
      setEta(`${mins} min`);
      setDistance(`${km} km`);
    },
    []
  );

  const handleStateChanged = useCallback(
    (event: OnNavigationStateChangedEvent) => {
      console.log('[NavigationScreen] onNavigationStateChanged:', event.state);
      setNavState(event.state);
      if (event.state === 'NAVIGATING') {
        setIsNavigating(true);
      } else if (event.state === 'ARRIVED' || event.state === 'IDLE') {
        setIsNavigating(false);
      }
    },
    []
  );

  const buildSummary = useCallback(
    (arrivedSet: Set<number>, otpMap: Map<number, OTPStatus>): DeliveryStop[] => {
      // Active stops (still in stopsState)
      const active = stopsState.map((d, i) => ({
        title: d.title,
        latitude: d.latitude,
        longitude: d.longitude,
        metadata: d.metadata ?? {},
        delivered: arrivedSet.has(i) && otpMap.get(i) === 'verified',
        otpStatus: otpMap.get(i) ?? 'pending',
      }));
      // Skipped stops (removed from stopsState but preserved in ref)
      const skipped: DeliveryStop[] = skippedStopsRef.current.map((s) => ({
        title: s.title,
        latitude: s.latitude,
        longitude: s.longitude,
        metadata: s.metadata ?? {},
        delivered: false,
        otpStatus: 'cancelled',
      }));
      return [...active, ...skipped];
    },
    [stopsState]
  );

  // Handle OTP result returned from OTPVerificationScreen
  useEffect(() => {
    const otpResult = (route.params as any)?.otpResult as
      | { waypointIndex: number; status: OTPStatus }
      | undefined;
    if (!otpResult) return;

    console.log(`[NavigationScreen] OTP result: stop #${otpResult.waypointIndex} → ${otpResult.status}`);

    // Record result in ref (sync) and state (async) — ref is used below for summary building
    otpResultsRef.current.set(otpResult.waypointIndex, otpResult.status);
    setOtpResults((prev) => {
      const next = new Map(prev);
      next.set(otpResult.waypointIndex, otpResult.status);
      return next;
    });

    otpPendingRef.current = false;

    // Clear param immediately so it doesn't re-trigger on re-renders
    navigation.setParams({ otpResult: undefined } as any);

    if (pendingFinalRef.current) {
      // ── Final destination ── OTP done, build summary and navigate
      pendingFinalRef.current = false;
      tripEndedRef.current = true;
      setIsNavigating(false);
      setIsSimulating(false);
      isSimulatingRef.current = false;
      isNavigatingRef.current = false;
      wasSimulatingRef.current = false;
      wasNavigatingRef.current = false;

      // Use refs for fresh data — effect closure may capture stale state values
      const currentStops = stopsStateRef.current;
      const currentDelivered = deliveredIndicesRef.current;
      const currentOtpMap = new Map(otpResultsRef.current);

      const summaryStops: import('../App').DeliveryStop[] = [
        ...currentStops.map((d, i) => ({
          title: d.title,
          latitude: d.latitude,
          longitude: d.longitude,
          metadata: d.metadata ?? {},
          delivered: currentDelivered.has(i) && currentOtpMap.get(i) === 'verified',
          otpStatus: (currentOtpMap.get(i) ?? 'pending') as OTPStatus,
        })),
        ...skippedStopsRef.current.map((s) => ({
          title: s.title,
          latitude: s.latitude,
          longitude: s.longitude,
          metadata: s.metadata ?? {},
          delivered: false,
          otpStatus: 'cancelled' as OTPStatus,
        })),
      ];

      setTimeout(() => {
        navigation.replace('DeliverySummary', { stops: summaryStops });
      }, 400);
    } else {
      // ── Non-final stop ── resume navigation and process any queued arrivals
      if (wasSimulatingRef.current) {
        wasSimulatingRef.current = false;
        viewRef.current?.startSimulation();
        setIsSimulating(true);
        isSimulatingRef.current = true;
      } else if (wasNavigatingRef.current) {
        wasNavigatingRef.current = false;
        // Guidance was never stopped (stopping it resets waypoint progress).
        // Just re-engage camera follow so the map tracks the driver again.
        viewRef.current?.recenterCamera();
        isNavigatingRef.current = true;
      }

      setIsPanelExpanded(true);
      scheduleAutoCollapse();

      const queued = arrivalQueueRef.current.shift();
      if (queued) {
        console.log(`[NavigationScreen] Processing queued arrival #${queued.waypointIndex}`);
        setTimeout(() => { handleArrival(queued); }, 200);
      }
    }
  }, [(route.params as any)?.otpResult]);

  const handleArrival = useCallback(
    (event: OnArrivalEvent) => {
      console.log(
        `[NavigationScreen] onArrival: waypoint #${event.waypointIndex} "${event.waypointTitle}" meta=${JSON.stringify(event.waypointMetadata)} final=${event.isFinalDestination}`
      );
      setDeliveredIndices((prev) => {
        const next = new Set(prev);
        next.add(event.waypointIndex);
        return next;
      });
      setArrivedCount(event.waypointIndex + 1);

      // If trip already ended (e.g. all stops were skipped), ignore further arrivals
      if (tripEndedRef.current) {
        console.log('[NavigationScreen] Trip already ended, ignoring arrival');
        return;
      }

      // If this stop was already processed (verified, skipped, or cancelled), don't open OTP
      if (otpResultsRef.current.has(event.waypointIndex)) {
        console.log(`[NavigationScreen] Stop #${event.waypointIndex} already processed as '${otpResultsRef.current.get(event.waypointIndex)}', skipping OTP`);
        if (event.isFinalDestination) {
          tripEndedRef.current = true;
          setIsNavigating(false);
          setIsSimulating(false);
          isSimulatingRef.current = false;
          isNavigatingRef.current = false;
          setNextManeuver('All stops complete!');
          const currentStops = stopsStateRef.current;
          const summaryStops: DeliveryStop[] = [
            ...currentStops.map((d, i) => ({
              title: d.title,
              latitude: d.latitude,
              longitude: d.longitude,
              metadata: d.metadata ?? {},
              delivered: otpResultsRef.current.get(i) === 'verified',
              otpStatus: (otpResultsRef.current.get(i) ?? 'pending') as OTPStatus,
            })),
            ...skippedStopsRef.current.map((s) => ({
              title: s.title,
              latitude: s.latitude,
              longitude: s.longitude,
              metadata: s.metadata ?? {},
              delivered: false,
              otpStatus: 'cancelled' as OTPStatus,
            })),
          ];
          setTimeout(() => {
            navigation.replace('DeliverySummary', { stops: summaryStops });
          }, 500);
        }
        return;
      }

      // If OTP is already open for a previous stop, queue this arrival
      if (otpPendingRef.current) {
        console.log(`[NavigationScreen] OTP pending, queuing arrival #${event.waypointIndex}`);
        arrivalQueueRef.current.push(event);
        return;
      }

      // Dismiss dispatch modal if it's open — it would block the OTP navigation
      setDispatchModalVisible(false);

      // Pause simulation during OTP (real navigation keeps running in background).
      // stopSimulation only freezes the location simulator — guidance stays active
      // so the Navigator remembers which waypoints have been visited.
      if (isSimulatingRef.current) {
        wasSimulatingRef.current = true;
        viewRef.current?.stopSimulation();
        setIsSimulating(false);
        isSimulatingRef.current = false;
      } else if (isNavigatingRef.current) {
        // Real navigation: guidance keeps running. On OTP return we just recenter.
        wasNavigatingRef.current = true;
        isNavigatingRef.current = false;
      }

      const currentTotalStops = stopsStateRef.current.length;

      if (event.isFinalDestination) {
        pendingFinalRef.current = true;
        setIsNavigating(false);
        setNextManeuver(
          currentTotalStops > 1
            ? `All ${currentTotalStops} stops reached — verify last delivery`
            : 'You have arrived — verify delivery'
        );
      } else {
        setNextManeuver(
          `Arrived at stop ${event.waypointIndex + 1}/${currentTotalStops} — verify delivery`
        );
      }

      // Mark OTP as pending then navigate directly to OTPVerification.
      // Using setTimeout so the native stopSimulation command has time to
      // process before a new screen is presented (avoids iOS race).
      otpPendingRef.current = true;
      const stop = stopsStateRef.current[event.waypointIndex];
      const stopTitle = event.waypointTitle || stop?.title || `Stop ${event.waypointIndex + 1}`;
      console.log(`[NavigationScreen] Opening OTP for stop #${event.waypointIndex}, final: ${event.isFinalDestination}`);
      setTimeout(() => {
        navigation.navigate('OTPVerification', {
          waypointIndex: event.waypointIndex,
          waypointTitle: stopTitle,
          metadata: stop?.metadata ?? {},
          isFinalDestination: event.isFinalDestination,
        });
      }, 300);
    },
    [navigation]
  );

  const handleRerouting = useCallback(() => {
    setRerouteCount((c) => c + 1);
    console.log('[NavigationScreen] onRerouting — driver went off-route, recalculating');
  }, []);

  const handleSpeeding = useCallback((event: OnSpeedingEvent) => {
    setSpeedingPct(event.percentageAboveLimit);
    console.log(`[NavigationScreen] onSpeeding: ${event.percentageAboveLimit.toFixed(1)}% above limit`);
    // Clear speeding indicator after 5 seconds of no updates
    if (speedingTimerRef.current) clearTimeout(speedingTimerRef.current);
    speedingTimerRef.current = setTimeout(() => setSpeedingPct(null), 5000);
  }, []);

  const handleLocationChanged = useCallback(
    (event: OnLocationChangedEvent) => {
      setLocationCount((c) => {
        const next = c + 1;
        // Log every 5th foreground event so Xcode/Metro console stays readable
        if (next % 5 === 0) {
          console.log(
            `[FG Location] #${next} lat=${event.latitude.toFixed(5)} lng=${event.longitude.toFixed(5)} spd=${event.speed.toFixed(1)}m/s brg=${event.bearing.toFixed(0)}°`
          );
        }
        return next;
      });
      setLastLocation({ lat: event.latitude, lng: event.longitude });
    },
    []
  );

  const handleBgLocation = useCallback((event: OnBackgroundLocationEvent) => {
    setBgCount((c) => {
      const next = c + 1;
      // Log every background event — these are throttled to 3s anyway
      console.log(
        `[BG Location] #${next} lat=${event.latitude.toFixed(5)} lng=${event.longitude.toFixed(5)} spd=${event.speed.toFixed(1)}m/s ts=${event.timestamp}`
      );
      return next;
    });
    setLastBgLocation({ lat: event.latitude, lng: event.longitude });
  }, []);

  // === Dispatch Simulation Handlers ===

  // Compute undelivered stops for the modal stop picker
  const undeliveredStops: UndeliveredStop[] = stopsState
    .map((s, i) => ({ ...s, index: i, metadata: s.metadata }))
    .filter((_, i) => i >= arrivedCount);

  const openDispatchModal = useCallback((mode: DispatchMode) => {
    if (mode !== 'add' && arrivedCount >= totalStops) {
      Alert.alert('No More Stops', 'All stops have been delivered or skipped.');
      return;
    }
    setDispatchMode(mode);
    setDispatchModalVisible(true);
  }, [arrivedCount, totalStops]);

  const handleDispatchSubmit = useCallback(
    (data: DispatchStopData) => {
      // Auto-collapse panel after dispatch action so it doesn't obstruct navigation
      setIsPanelExpanded(false);
      if (isActive) scheduleAutoCollapse();

      if (dispatchMode === 'add') {
        viewRef.current?.addDestination(
          {
            position: { latitude: data.latitude, longitude: data.longitude },
            title: data.title,
            metadata: data.metadata,
          },
          -1
        );
        // Add to mutable stops state
        setStopsState((prev) => [
          ...prev,
          {
            title: data.title,
            latitude: data.latitude,
            longitude: data.longitude,
            metadata: data.metadata,
          },
        ]);
      } else if (dispatchMode === 'updateDetails') {
        const idx = data.stopIndex;
        const stop = stopsState[idx];
        if (!stop) return;
        viewRef.current?.updateDestination(idx, {
          position: { latitude: stop.latitude, longitude: stop.longitude },
          title: stop.title,
          metadata: data.metadata,
        });
        // Update mutable stops state
        setStopsState((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx]!, metadata: data.metadata };
          return next;
        });
      } else if (dispatchMode === 'changeAddress') {
        const idx = data.stopIndex;
        viewRef.current?.updateDestination(idx, {
          position: { latitude: data.latitude, longitude: data.longitude },
          title: data.title,
          metadata: data.metadata,
        });
        // Update mutable stops state
        setStopsState((prev) => {
          const next = [...prev];
          next[idx] = {
            title: data.title,
            latitude: data.latitude,
            longitude: data.longitude,
            metadata: data.metadata,
          };
          return next;
        });
      }
    },
    [dispatchMode, stopsState, isActive, scheduleAutoCollapse]
  );

  const simulateSkipStop = useCallback(() => {
    const nextIdx = arrivedCount;
    if (nextIdx >= totalStops) {
      Alert.alert('No More Stops', 'All stops have been delivered or skipped.');
      return;
    }
    const stop = stopsState[nextIdx];
    const title = stop?.title || `Stop ${nextIdx + 1}`;
    Alert.alert(
      'Skip Stop',
      `Remove "${title}" from route? This simulates a cancelled delivery.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            // Auto-collapse panel after skip
            setIsPanelExpanded(false);

            // Mark as cancelled SYNCHRONOUSLY before removeDestination
            // (removeDestination may trigger onArrival before React state updates)
            const skippedStop = stopsState[nextIdx];
            if (skippedStop) {
              skippedStopsRef.current.push(skippedStop);
            }
            // Record cancellation then shift all index-keyed state to match
            // the new index space after removal.  The native side will report
            // waypointIndex relative to the CURRENT storedWaypoints (which
            // shifts after removeDestination).  Without re-indexing, a
            // subsequent arrival at the "new index 0" would collide with the
            // cancelled entry and skip OTP.
            //
            // The cancelled stop's data is already in skippedStopsRef so we
            // don't need it in otpResultsRef any more.
            const shiftedOtp = new Map<number, OTPStatus>();
            for (const [k, v] of otpResultsRef.current) {
              if (k < nextIdx) shiftedOtp.set(k, v);
              else if (k > nextIdx) shiftedOtp.set(k - 1, v);
              // k === nextIdx is the cancelled entry — dropped
            }
            otpResultsRef.current = shiftedOtp;
            setOtpResults(new Map(shiftedOtp));

            // Shift deliveredIndices the same way
            setDeliveredIndices((prev) => {
              const shifted = new Set<number>();
              for (const idx of prev) {
                if (idx < nextIdx) shifted.add(idx);
                else if (idx > nextIdx) shifted.add(idx - 1);
              }
              return shifted;
            });

            viewRef.current?.removeDestination(nextIdx);
            const newStops = stopsState.filter((_, i) => i !== nextIdx);
            setStopsState(newStops);

            // Check if all remaining stops are delivered — if so, end trip
            const remainingUndelivered = newStops.length - arrivedCount;
            if (remainingUndelivered <= 0 && !tripEndedRef.current) {
              tripEndedRef.current = true;
              viewRef.current?.stopGuidance();
              viewRef.current?.stopSimulation();
              setIsNavigating(false);
              setIsSimulating(false);
              isSimulatingRef.current = false;
              isNavigatingRef.current = false;
              setNextManeuver('All stops complete!');

              // Build summary INLINE using local newStops to avoid stale closure
              const summaryStops: DeliveryStop[] = [
                ...newStops.map((d, i) => ({
                  title: d.title,
                  latitude: d.latitude,
                  longitude: d.longitude,
                  metadata: d.metadata ?? {},
                  delivered: otpResultsRef.current.get(i) === 'verified',
                  otpStatus: (otpResultsRef.current.get(i) ?? 'pending') as OTPStatus,
                })),
                ...skippedStopsRef.current.map((s) => ({
                  title: s.title,
                  latitude: s.latitude,
                  longitude: s.longitude,
                  metadata: s.metadata ?? {},
                  delivered: false,
                  otpStatus: 'cancelled' as OTPStatus,
                })),
              ];

              setTimeout(() => {
                navigation.replace('DeliverySummary', { stops: summaryStops });
              }, 500);
            }
          },
        },
      ]
    );
  }, [arrivedCount, totalStops, stopsState, navigation]);

  const startNavigation = () => {
    viewRef.current?.setAudioGuidance(
      AudioGuidance.VOICE_ALERTS_AND_GUIDANCE
    );
    viewRef.current?.startGuidance();
    isNavigatingRef.current = true;
    setIsPanelExpanded(false);
  };

  const stopNavigation = () => {
    viewRef.current?.stopGuidance();
    setIsSimulating(false);
    isSimulatingRef.current = false;
    isNavigatingRef.current = false;
    wasNavigatingRef.current = false;
    setIsPanelExpanded(true);
    if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
  };

  const endTrip = () => {
    viewRef.current?.stopGuidance();
    viewRef.current?.stopSimulation();
    isNavigatingRef.current = false;
    isSimulatingRef.current = false;
    navigation.replace('DeliverySummary', {
      stops: buildSummary(deliveredIndices, otpResults),
    });
  };

  const simulate = () => {
    viewRef.current?.setAudioGuidance(AudioGuidance.VOICE_ALERTS_AND_GUIDANCE);
    viewRef.current?.startSimulation();
    setIsSimulating(true);
    isSimulatingRef.current = true;
    setIsPanelExpanded(false);
  };

  // Wait for SDK initialization and T&C acceptance before rendering nav view
  if (!isInitialized || !termsAccepted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.loadingText}>
            {!isInitialized ? 'Initializing Navigation SDK...' : 'Waiting for Terms & Conditions...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GoogleNavView
        ref={viewRef}
        style={styles.map}
        mapType={1}
        trafficEnabled
        navigationUIEnabled
        headerEnabled
        footerEnabled
        tripProgressBarEnabled
        speedometerEnabled
        recenterButtonEnabled
        myLocationEnabled
        followingPerspective={cameraPerspective}
        theme={theme}
        onNavigationReady={handleNavigationReady}
        onRouteReady={handleRouteReady}
        onTurnByTurnUpdated={handleTurnByTurn}
        onRemainingTimeOrDistanceChanged={handleRemainingChanged}
        onNavigationStateChanged={handleStateChanged}
        onArrival={handleArrival}
        onLocationChanged={handleLocationChanged}
        onRerouting={handleRerouting}
        onSpeeding={handleSpeeding}
        onWaypointETAsUpdated={(e) => setWaypointETAs(e.waypoints)}
      />

      {/* Top bar with back and info */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {nextManeuver ? (
          <View style={styles.maneuverBanner}>
            <Text style={styles.maneuverText} numberOfLines={1}>
              {nextManeuver}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Bottom controls — left-side FAB when collapsed keeps nav arrow visible */}
      {isRouteReady && !isPanelExpanded ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={expandPanel}
          activeOpacity={0.8}
        >
          {eta ? <Text style={styles.fabEta}>{eta}</Text> : null}
          {distance ? <Text style={styles.fabDistance}>{distance}</Text> : null}
          <Text style={[
            styles.fabBadge,
            navState === 'ERROR' && { backgroundColor: '#FCECEA', color: '#EA4335' },
          ]}>{navState}</Text>
          <Text style={styles.fabExpandHint}>{'▶'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.bottomPanel}>
          {/* Drag handle for visual affordance */}
          {isActive && (
            <TouchableOpacity
              style={styles.collapseHandle}
              onPress={() => setIsPanelExpanded(false)}
            >
              <View style={styles.pillHandle} />
            </TouchableOpacity>
          )}

          {/* Always show state */}
          <View style={styles.infoRow}>
            {eta ? <Text style={styles.infoText}>{eta}</Text> : null}
            {distance ? (
              <Text style={styles.infoTextSecondary}>{distance}</Text>
            ) : null}
            <Text style={[
              styles.stateBadge,
              navState === 'ERROR' && { backgroundColor: '#FCECEA', color: '#EA4335' },
            ]}>{navState}</Text>
          </View>

          {/* Debug info */}
          <Text style={styles.debugText}>
            ready={isNavReady ? 'Y' : 'N'} route={isRouteReady ? 'Y' : 'N'} stops={totalStops} delivered={arrivedCount}/{totalStops}
          </Text>
          <Text style={styles.debugText}>
            FG loc={locationCount}{lastLocation ? ` (${lastLocation.lat.toFixed(4)},${lastLocation.lng.toFixed(4)})` : ' (no fix)'}
          </Text>
          <Text style={[styles.debugText, bgEnabled ? styles.debugTextBgActive : styles.debugTextBgOff]}>
            BG {bgEnabled ? `ON #${bgCount}` : 'OFF'}{lastBgLocation ? ` (${lastBgLocation.lat.toFixed(4)},${lastBgLocation.lng.toFixed(4)})` : ''}
          </Text>
          {rerouteCount > 0 && (
            <Text style={[styles.debugText, { color: '#F9AB00' }]}>reroutes: {rerouteCount}</Text>
          )}
          {speedingPct !== null && (
            <Text style={[styles.debugText, { color: '#EA4335', fontWeight: '700' }]}>
              SPEEDING {speedingPct.toFixed(0)}% over limit
            </Text>
          )}
          {routePolylineLen !== null && (
            <Text style={styles.debugText}>polyline: {routePolylineLen} points</Text>
          )}

          {/* Per-waypoint ETAs */}
          {waypointETAs.length > 0 && (
            <View style={styles.etaSection}>
              <Text style={styles.etaSectionTitle}>Per-Stop ETAs</Text>
              {waypointETAs.map((wp) => {
                const mins = Math.round(wp.remainingTimeSeconds / 60);
                const km = (wp.remainingDistanceMeters / 1000).toFixed(1);
                const delivered = deliveredIndices.has(wp.waypointIndex);
                return (
                  <View key={wp.waypointIndex} style={[styles.etaRow, delivered && styles.etaRowDelivered]}>
                    <Text style={styles.etaStopName} numberOfLines={1}>
                      #{wp.waypointIndex + 1} {wp.title || 'Stop'}
                    </Text>
                    <Text style={styles.etaValue}>
                      {delivered ? '✓' : `${mins}m · ${km}km`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            {!isNavigating && isRouteReady && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={startNavigation}
              >
                <Text style={styles.primaryButtonText}>Start Navigation</Text>
              </TouchableOpacity>
            )}

            {isNavigating && (
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={stopNavigation}
              >
                <Text style={styles.dangerButtonText}>Stop</Text>
              </TouchableOpacity>
            )}

            {isRouteReady && !isSimulating && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={simulate}
              >
                <Text style={styles.secondaryButtonText}>Simulate</Text>
              </TouchableOpacity>
            )}

            {isSimulating && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => {
                  // Explicitly stop guidance here (user intent) — stopSimulation alone
                  // no longer stops guidance so the waypoint state is preserved during OTP.
                  viewRef.current?.stopGuidance();
                  viewRef.current?.stopSimulation();
                  setIsSimulating(false);
                  isSimulatingRef.current = false;
                  setIsPanelExpanded(true);
                  if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
                }}
              >
                <Text style={styles.secondaryButtonText}>Stop Sim</Text>
              </TouchableOpacity>
            )}

            {isActive && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => viewRef.current?.recenterCamera()}
              >
                <Text style={styles.secondaryButtonText}>Re-center</Text>
              </TouchableOpacity>
            )}

            {/* Background location toggle — test by backgrounding the app */}
            {isRouteReady && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  bgEnabled ? styles.bgActiveButton : styles.secondaryButton,
                ]}
                onPress={async () => {
                  if (!bgEnabled) {
                    // Android 10+ and iOS both require explicit background location
                    // permission ("Allow all the time") before background tracking works.
                    const { status } = await Location.requestBackgroundPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert(
                        'Permission Required',
                        'Please allow "Always" location access in Settings to enable background tracking.'
                      );
                      return;
                    }
                    setBgCount(0);
                  }
                  setBgEnabled((v) => !v);
                }}
              >
                <Text style={bgEnabled ? styles.bgActiveButtonText : styles.secondaryButtonText}>
                  BG {bgEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            )}

            {isRouteReady && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => {
                  const next = (cameraPerspective + 1) % 3;
                  setCameraPerspective(next);
                  const labels = ['Tilted', 'North Up', 'Heading Up'];
                  console.log(`[NavigationScreen] Camera: ${labels[next]}`);
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  {['Tilted', 'North', 'Heading'][cameraPerspective]}
                </Text>
              </TouchableOpacity>
            )}

            {isRouteReady && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={async () => {
                  try {
                    const route = await viewRef.current?.getCurrentRoute();
                    if (route) {
                      setRoutePolylineLen(route.coordinates.length);
                      console.log('[NavigationScreen] Polyline:', route.encodedPolyline.substring(0, 80) + '...');
                      Alert.alert(
                        'Route Polyline',
                        `${route.coordinates.length} points\nEncoded: ${route.encodedPolyline.length} chars`,
                      );
                    }
                  } catch (err: any) {
                    Alert.alert('Error', err.message);
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>Get Route</Text>
              </TouchableOpacity>
            )}

            {/* End trip early — goes to summary with partial delivery report */}
            {isActive && (
              <TouchableOpacity
                style={[styles.actionButton, styles.endTripButton]}
                onPress={endTrip}
              >
                <Text style={styles.endTripButtonText}>End Trip</Text>
              </TouchableOpacity>
            )}

            {/* Manual retry button when no route */}
            {isNavReady && !isRouteReady && !isNavigating && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => {
                  console.log('[NavigationScreen] Retrying setDestinations');
                  viewRef.current?.setDestinations(
                    destinations.map((d) => ({
                      position: { latitude: d.latitude, longitude: d.longitude },
                      title: d.title,
                      metadata: d.metadata,
                    })),
                    { travelMode }
                  );
                }}
              >
                <Text style={styles.primaryButtonText}>Retry Route</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dispatch Simulation — Add Stop always available; stop-specific
              actions (Skip/Update/Change) only shown when stops remain */}
          {isRouteReady && (
            <View style={styles.dispatchSection}>
              <Text style={styles.dispatchTitle}>Dispatch Simulation</Text>
              <Text style={styles.dispatchSubtitle}>Simulates admin actions pushed to driver</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dispatchScroll}>
                <TouchableOpacity
                  style={[styles.dispatchButton, styles.dispatchAdd]}
                  onPress={() => openDispatchModal('add')}
                >
                  <Text style={styles.dispatchButtonText}>+ Add Stop</Text>
                </TouchableOpacity>
                {arrivedCount < totalStops && (
                  <>
                    <TouchableOpacity
                      style={[styles.dispatchButton, styles.dispatchSkip]}
                      onPress={simulateSkipStop}
                    >
                      <Text style={styles.dispatchButtonText}>Skip Next</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dispatchButton, styles.dispatchUpdate]}
                      onPress={() => openDispatchModal('updateDetails')}
                    >
                      <Text style={styles.dispatchButtonText}>Update Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dispatchButton, styles.dispatchRelocate]}
                      onPress={() => openDispatchModal('changeAddress')}
                    >
                      <Text style={styles.dispatchButtonText}>Change Addr</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          )}

          {!isNavReady && (
            <Text style={styles.loadingText}>Initializing navigation...</Text>
          )}
        </View>
      )}

      {/* Dispatch Modal — full Places Autocomplete + package details form */}
      <DispatchModal
        visible={dispatchModalVisible}
        mode={dispatchMode}
        undeliveredStops={undeliveredStops}
        onClose={() => setDispatchModalVisible(false)}
        onSubmit={handleDispatchSubmit}
      />

      {/* Background location tracker — mounts/unmounts based on toggle */}
      {bgEnabled && <BackgroundLocationTracker onLocation={handleBgLocation} />}
    </View>
  );
}

export default function NavigationScreen(props: Props) {
  return (
    <GoogleNavProvider apiKey={GOOGLE_API_KEY}>
      <NavigationContent {...props} />
    </GoogleNavProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 12,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  maneuverBanner: {
    backgroundColor: 'rgba(26,115,232,0.95)',
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 14,
  },
  maneuverText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    left: 12,
    bottom: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    minWidth: 56,
  },
  fabEta: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  fabDistance: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fabBadge: {
    fontSize: 9,
    color: '#4285F4',
    fontWeight: '600',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fabExpandHint: {
    fontSize: 10,
    color: '#999',
  },
  pillHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    marginBottom: 6,
  },
  collapseHandle: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  infoTextSecondary: {
    fontSize: 18,
    color: '#666',
  },
  stateBadge: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '600',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 'auto',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4285F4',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#EA4335',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  endTripButton: {
    backgroundColor: '#FF8F00',
  },
  endTripButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  debugText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    fontFamily: 'Courier',
  },
  debugTextBgActive: {
    color: '#34A853',
    fontWeight: '700',
  },
  debugTextBgOff: {
    color: '#bbb',
  },
  bgActiveButton: {
    backgroundColor: '#34A853',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  bgActiveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  etaSection: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  etaSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  etaRowDelivered: {
    opacity: 0.5,
  },
  etaStopName: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  etaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A73E8',
  },
  dispatchSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  dispatchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dispatchSubtitle: {
    fontSize: 11,
    color: '#999',
    marginBottom: 10,
  },
  dispatchScroll: {
    flexDirection: 'row',
  },
  dispatchButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 8,
  },
  dispatchAdd: {
    backgroundColor: '#E8F5E9',
  },
  dispatchSkip: {
    backgroundColor: '#FFF3E0',
  },
  dispatchUpdate: {
    backgroundColor: '#E3F2FD',
  },
  dispatchRelocate: {
    backgroundColor: '#F3E5F5',
  },
  dispatchButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});
