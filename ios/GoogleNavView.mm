#import "GoogleNavView.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/GoogleNavViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/GoogleNavViewSpec/Props.h>
#import <react/renderer/components/GoogleNavViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

#import <GoogleMaps/GoogleMaps.h>
#import <GoogleNavigation/GoogleNavigation.h>

using namespace facebook::react;

@interface GoogleNavView () <RCTGoogleNavViewViewProtocol,
    GMSNavigatorListener,
    GMSRoadSnappedLocationProviderListener,
    GMSMapViewNavigationUIDelegate>
@end

@implementation GoogleNavView {
    GMSMapView *_mapView;
    BOOL _mapInitialized;
    BOOL _readyEventsPending;
    NSInteger _followingPerspective;
    NSInteger _currentTravelMode;
    CLLocation *_previousLocation;
    BOOL _isGuidanceActive;
    NSMutableArray *_storedWaypoints;
    NSInteger _currentWaypointIndex;
    NSInteger _lastTravelMode;
    BOOL _lastAvoidTolls;
    BOOL _lastAvoidHighways;
    BOOL _lastAvoidFerries;
    BOOL _isSimulationActive;
    NSTimeInterval _lastETAEmitTime;
    NSTimeInterval _lastLocationEmitTime;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<GoogleNavViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const GoogleNavViewProps>();
        _props = defaultProps;
        _mapInitialized = NO;
        _readyEventsPending = NO;
    }
    return self;
}

- (void)updateEventEmitter:(const EventEmitter::Shared &)eventEmitter
{
    [super updateEventEmitter:eventEmitter];

    // Fabric calls updateEventEmitter AFTER updateProps, so _eventEmitter
    // is nil during initializeMapWithProps. Emit deferred ready events here.
    if (_readyEventsPending && _eventEmitter) {
        _readyEventsPending = NO;
        NSLog(@"[GoogleNavView] Emitting deferred onNavigationReady + onMapReady");
        auto emitter = std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter);
        if (emitter) {
            GoogleNavViewEventEmitter::OnNavigationReady navEvent;
            emitter->onNavigationReady(navEvent);

            GoogleNavViewEventEmitter::OnMapReady mapEvent;
            emitter->onMapReady(mapEvent);
        }
    }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &newViewProps = *std::static_pointer_cast<GoogleNavViewProps const>(props);

    if (!_mapInitialized) {
        [self initializeMapWithProps:newViewProps];
        _mapInitialized = YES;
    } else {
        [self applyProps:newViewProps];
    }

    [super updateProps:props oldProps:oldProps];
}

- (void)initializeMapWithProps:(const GoogleNavViewProps &)props
{
    NSLog(@"[GoogleNavView] initializeMapWithProps called");
    NSLog(@"[GoogleNavView] Terms accepted: %d", [GMSNavigationServices areTermsAndConditionsAccepted]);
    GMSCameraPosition *camera = [GMSCameraPosition cameraWithLatitude:37.7749
                                                            longitude:-122.4194
                                                                 zoom:12.0];
    GMSMapViewOptions *options = [[GMSMapViewOptions alloc] init];
    options.frame = self.bounds;
    options.camera = camera;

    _mapView = [[GMSMapView alloc] initWithOptions:options];
    _mapView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    _mapView.navigationEnabled = YES;
    NSLog(@"[GoogleNavView] navigationEnabled set to YES, navigator: %@", _mapView.navigator);
    _mapView.settings.compassButton = props.compassEnabled;
    _mapView.settings.myLocationButton = props.myLocationButtonEnabled;
    _mapView.myLocationEnabled = props.myLocationEnabled;
    _mapView.settings.rotateGestures = props.rotateGesturesEnabled;
    _mapView.settings.scrollGestures = props.scrollGesturesEnabled;
    _mapView.settings.tiltGestures = props.tiltGesturesEnabled;
    _mapView.settings.zoomGestures = props.zoomGesturesEnabled;
    _mapView.trafficEnabled = props.trafficEnabled;
    _mapView.buildingsEnabled = props.buildingsEnabled;
    _mapView.indoorEnabled = props.indoorEnabled;

    // Navigation UI
    _mapView.settings.navigationHeaderEnabled = props.headerEnabled;
    _mapView.settings.navigationFooterEnabled = props.footerEnabled;
    _mapView.settings.navigationTripProgressBarEnabled = props.tripProgressBarEnabled;
    _mapView.shouldDisplaySpeedometer = props.speedometerEnabled;
    _mapView.shouldDisplaySpeedLimit = props.speedLimitIconEnabled;
    _mapView.settings.recenterButtonEnabled = props.recenterButtonEnabled;

    // Camera following perspective
    _followingPerspective = props.followingPerspective;
    _mapView.followingPerspective = [self gmsCameraPerspective];

    _mapView.navigationUIDelegate = self;

    self.contentView = _mapView;

    // Set up navigator listeners
    [_mapView.navigator addListener:self];
    [_mapView.roadSnappedLocationProvider addListener:self];
    [_mapView.roadSnappedLocationProvider startUpdatingLocation];

    // Mark ready events as pending — they'll be emitted in updateEventEmitter:
    // because _eventEmitter is nil during the first updateProps call in Fabric.
    if (_eventEmitter) {
        NSLog(@"[GoogleNavView] Emitting onNavigationReady immediately");
        auto emitter = std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter);
        if (emitter) {
            GoogleNavViewEventEmitter::OnNavigationReady navEvent;
            emitter->onNavigationReady(navEvent);
            GoogleNavViewEventEmitter::OnMapReady mapEvent;
            emitter->onMapReady(mapEvent);
        }
    } else {
        NSLog(@"[GoogleNavView] _eventEmitter nil, deferring ready events");
        _readyEventsPending = YES;
    }
}

- (void)applyProps:(const GoogleNavViewProps &)props
{
    if (!_mapView) return;

    _mapView.mapType = (GMSMapViewType)props.mapType;
    _mapView.settings.compassButton = props.compassEnabled;
    _mapView.settings.myLocationButton = props.myLocationButtonEnabled;
    _mapView.myLocationEnabled = props.myLocationEnabled;
    _mapView.settings.rotateGestures = props.rotateGesturesEnabled;
    _mapView.settings.scrollGestures = props.scrollGesturesEnabled;
    _mapView.settings.tiltGestures = props.tiltGesturesEnabled;
    _mapView.settings.zoomGestures = props.zoomGesturesEnabled;
    _mapView.trafficEnabled = props.trafficEnabled;
    _mapView.buildingsEnabled = props.buildingsEnabled;
    _mapView.indoorEnabled = props.indoorEnabled;

    // Navigation UI
    _mapView.settings.navigationHeaderEnabled = props.headerEnabled;
    _mapView.settings.navigationFooterEnabled = props.footerEnabled;
    _mapView.settings.navigationTripProgressBarEnabled = props.tripProgressBarEnabled;
    _mapView.shouldDisplaySpeedometer = props.speedometerEnabled;
    _mapView.shouldDisplaySpeedLimit = props.speedLimitIconEnabled;
    _mapView.settings.recenterButtonEnabled = props.recenterButtonEnabled;

    // Camera following perspective
    _followingPerspective = props.followingPerspective;
    _mapView.followingPerspective = [self gmsCameraPerspective];

    // Theming colors
    if (props.headerBackgroundColor) {
        _mapView.settings.navigationHeaderPrimaryBackgroundColor =
            RCTUIColorFromSharedColor(props.headerBackgroundColor);
    }
    if (props.headerSecondaryBackgroundColor) {
        _mapView.settings.navigationHeaderSecondaryBackgroundColor =
            RCTUIColorFromSharedColor(props.headerSecondaryBackgroundColor);
    }
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
    RCTGoogleNavViewHandleCommand(self, commandName, args);
}

#pragma mark - Commands (RCTGoogleNavViewViewProtocol)

- (void)setDestinations:(NSString *)waypointsJson
             travelMode:(NSInteger)travelMode
             avoidTolls:(BOOL)avoidTolls
          avoidHighways:(BOOL)avoidHighways
           avoidFerries:(BOOL)avoidFerries
{
    NSLog(@"[GoogleNavView] setDestinations called: %@, travelMode: %ld", waypointsJson, (long)travelMode);
    NSLog(@"[GoogleNavView] navigator: %@, navigationEnabled: %d", _mapView.navigator, _mapView.navigationEnabled);
    NSData *data = [waypointsJson dataUsingEncoding:NSUTF8StringEncoding];
    NSArray *waypointsArray = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];

    // Store waypoints for arrival index tracking
    _storedWaypoints = [waypointsArray mutableCopy];
    _currentWaypointIndex = 0;
    _lastTravelMode = travelMode;
    _lastAvoidTolls = avoidTolls;
    _lastAvoidHighways = avoidHighways;
    _lastAvoidFerries = avoidFerries;

    NSMutableArray<GMSNavigationWaypoint *> *navWaypoints = [NSMutableArray new];
    for (NSDictionary *wp in waypointsArray) {
        CLLocationCoordinate2D coord = CLLocationCoordinate2DMake(
            [wp[@"latitude"] doubleValue],
            [wp[@"longitude"] doubleValue]
        );
        NSString *placeId = wp[@"placeId"];
        GMSNavigationWaypoint *navWp;
        if (placeId && placeId.length > 0) {
            navWp = [[GMSNavigationWaypoint alloc] initWithPlaceID:placeId title:wp[@"title"] ?: @""];
        } else {
            navWp = [[GMSNavigationWaypoint alloc] initWithLocation:coord title:wp[@"title"] ?: @""];
        }
        if (navWp) {
            [navWaypoints addObject:navWp];
        }
    }

    // Emit state change
    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnNavigationStateChanged stateEvent;
        stateEvent.state = "ROUTE_REQUESTED";
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onNavigationStateChanged(stateEvent);
    }

    // Store travel mode for camera perspective logic
    _currentTravelMode = travelMode;

    // Set travel mode on the map view
    // 0 = DRIVING (car/truck)
    // 1 = CYCLING (bicycle) → uses TWO_WHEELER routes (cycling unavailable in many regions)
    // 2 = WALKING
    // 3 = TWO_WHEELER (motorbike/tuk-tuk)
    switch (travelMode) {
        case 0: _mapView.travelMode = GMSNavigationTravelModeDriving; break;
        case 1: _mapView.travelMode = GMSNavigationTravelModeTwoWheeler; break;
        case 2: _mapView.travelMode = GMSNavigationTravelModeWalking; break;
        case 3: _mapView.travelMode = GMSNavigationTravelModeTwoWheeler; break;
        default: _mapView.travelMode = GMSNavigationTravelModeDriving; break;
    }

    // Set avoid options on the navigator
    _mapView.navigator.avoidsHighways = avoidHighways;
    _mapView.navigator.avoidsTolls = avoidTolls;
    _mapView.navigator.avoidsFerries = avoidFerries;

    GMSNavigationRoutingOptions *routingOptions = [[GMSNavigationRoutingOptions alloc] init];

    __weak GoogleNavView *weakSelf = self;
    [_mapView.navigator setDestinations:navWaypoints
                         routingOptions:routingOptions
                               callback:^(GMSRouteStatus routeStatus) {
        GoogleNavView *strongSelf = weakSelf;
        if (!strongSelf) return;

        NSLog(@"[GoogleNavView] Route callback: status=%ld", (long)routeStatus);
        if (routeStatus == GMSRouteStatusOK) {
            if (strongSelf->_eventEmitter) {
                GoogleNavViewEventEmitter::OnRouteReady routeEvent;
                routeEvent.totalTimeSeconds = strongSelf->_mapView.navigator.timeToNextDestination;
                routeEvent.totalDistanceMeters = strongSelf->_mapView.navigator.distanceToNextDestination;
                std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(strongSelf->_eventEmitter)->onRouteReady(routeEvent);

                GoogleNavViewEventEmitter::OnNavigationStateChanged readyState;
                readyState.state = "ROUTE_READY";
                std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(strongSelf->_eventEmitter)->onNavigationStateChanged(readyState);
            }
        } else {
            NSLog(@"[GoogleNavView] Route FAILED with status: %ld", (long)routeStatus);
            if (strongSelf->_eventEmitter) {
                // Include status code in the error state for debugging
                NSString *errorStr = [NSString stringWithFormat:@"ERROR_%ld", (long)routeStatus];
                GoogleNavViewEventEmitter::OnNavigationStateChanged errorState;
                errorState.state = std::string([errorStr UTF8String]);
                std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(strongSelf->_eventEmitter)->onNavigationStateChanged(errorState);
            }
        }
    }];
}

- (void)startGuidance
{
    NSLog(@"[GoogleNavView] startGuidance called, navigator: %@", _mapView.navigator);
    _isGuidanceActive = YES;
    _previousLocation = nil;
    _mapView.navigator.guidanceActive = YES;
    _mapView.navigator.sendsBackgroundNotifications = YES;
    _mapView.followingPerspective = [self gmsCameraPerspective];
    _mapView.cameraMode = GMSNavigationCameraModeFollowing;
    _mapView.navigator.voiceGuidance = GMSNavigationVoiceGuidanceAlertsAndGuidance;

    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnNavigationStateChanged event;
        event.state = "NAVIGATING";
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onNavigationStateChanged(event);
    }
}

- (void)stopGuidance
{
    _isGuidanceActive = NO;
    _previousLocation = nil;
    _mapView.navigator.guidanceActive = NO;

    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnNavigationStateChanged event;
        event.state = "IDLE";
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onNavigationStateChanged(event);
    }
}

- (void)clearDestinations
{
    [_mapView.navigator clearDestinations];
}

- (void)addDestination:(NSString *)waypointJson atIndex:(NSInteger)atIndex
{
    NSData *data = [waypointJson dataUsingEncoding:NSUTF8StringEncoding];
    NSDictionary *wpDict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    if (!wpDict) return;

    if (!_storedWaypoints) {
        _storedWaypoints = [NSMutableArray new];
    }

    NSInteger insertIdx = (atIndex < 0 || atIndex > (NSInteger)_storedWaypoints.count) ? (NSInteger)_storedWaypoints.count : atIndex;
    [_storedWaypoints insertObject:wpDict atIndex:insertIdx];
    if (insertIdx <= _currentWaypointIndex) {
        _currentWaypointIndex++;
    }
    [self rebuildRoute];
}

- (void)removeDestination:(NSInteger)atIndex
{
    if (atIndex < 0 || atIndex >= (NSInteger)_storedWaypoints.count) return;
    [_storedWaypoints removeObjectAtIndex:atIndex];
    if (atIndex < _currentWaypointIndex) {
        _currentWaypointIndex--;
    } else if (atIndex == _currentWaypointIndex && _currentWaypointIndex >= (NSInteger)_storedWaypoints.count) {
        _currentWaypointIndex = (NSInteger)_storedWaypoints.count - 1;
    }
    if (_storedWaypoints.count == 0) {
        [_mapView.navigator clearDestinations];
        return;
    }
    [self rebuildRoute];
}

- (void)updateDestination:(NSInteger)atIndex waypointJson:(NSString *)waypointJson
{
    if (atIndex < 0 || atIndex >= (NSInteger)_storedWaypoints.count) return;

    NSData *data = [waypointJson dataUsingEncoding:NSUTF8StringEncoding];
    NSDictionary *newWpDict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    if (!newWpDict) return;

    NSDictionary *oldWpDict = _storedWaypoints[atIndex];
    BOOL positionChanged =
        fabs([newWpDict[@"latitude"] doubleValue] - [oldWpDict[@"latitude"] doubleValue]) > 1e-7 ||
        fabs([newWpDict[@"longitude"] doubleValue] - [oldWpDict[@"longitude"] doubleValue]) > 1e-7;

    // Merge: use new values, fall back to old
    NSMutableDictionary *merged = [oldWpDict mutableCopy];
    [merged addEntriesFromDictionary:newWpDict];
    [_storedWaypoints replaceObjectAtIndex:atIndex withObject:[merged copy]];

    // Only rebuild route if position changed and stop hasn't been delivered yet
    if (positionChanged && atIndex >= _currentWaypointIndex) {
        [self rebuildRoute];
    }
}

- (void)rebuildRoute
{
    NSInteger count = _storedWaypoints.count;
    if (_currentWaypointIndex >= count) {
        [_mapView.navigator clearDestinations];
        return;
    }

    NSMutableArray<GMSNavigationWaypoint *> *navWaypoints = [NSMutableArray new];
    for (NSInteger i = _currentWaypointIndex; i < count; i++) {
        NSDictionary *wp = _storedWaypoints[i];
        CLLocationCoordinate2D coord = CLLocationCoordinate2DMake(
            [wp[@"latitude"] doubleValue],
            [wp[@"longitude"] doubleValue]
        );
        NSString *placeId = wp[@"placeId"];
        GMSNavigationWaypoint *navWp;
        if (placeId && placeId.length > 0) {
            navWp = [[GMSNavigationWaypoint alloc] initWithPlaceID:placeId title:wp[@"title"] ?: @""];
        } else {
            navWp = [[GMSNavigationWaypoint alloc] initWithLocation:coord title:wp[@"title"] ?: @""];
        }
        if (navWp) [navWaypoints addObject:navWp];
    }

    if (navWaypoints.count == 0) {
        [_mapView.navigator clearDestinations];
        return;
    }

    // Emit state change
    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnNavigationStateChanged stateEvent;
        stateEvent.state = "ROUTE_REQUESTED";
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onNavigationStateChanged(stateEvent);
    }

    // Stop guidance before setting new destinations so the SDK accepts the
    // new waypoint list. Do NOT call stopSimulation — that wipes the simulated
    // position and forces the route to recalculate from real GPS.
    BOOL wasGuidanceActive = _mapView.navigator.guidanceActive;
    BOOL wasSimulating = _isSimulationActive;
    _mapView.navigator.guidanceActive = NO;

    // Restore travel mode for non-driving modes
    switch (_lastTravelMode) {
        case 0: _mapView.travelMode = GMSNavigationTravelModeDriving; break;
        case 1: _mapView.travelMode = GMSNavigationTravelModeTwoWheeler; break;
        case 2: _mapView.travelMode = GMSNavigationTravelModeWalking; break;
        case 3: _mapView.travelMode = GMSNavigationTravelModeTwoWheeler; break;
        default: _mapView.travelMode = GMSNavigationTravelModeDriving; break;
    }

    _mapView.navigator.avoidsHighways = _lastAvoidHighways;
    _mapView.navigator.avoidsTolls = _lastAvoidTolls;
    _mapView.navigator.avoidsFerries = _lastAvoidFerries;

    GMSNavigationRoutingOptions *routingOptions = [[GMSNavigationRoutingOptions alloc] init];

    __weak GoogleNavView *weakSelf = self;
    [_mapView.navigator setDestinations:navWaypoints
                         routingOptions:routingOptions
                               callback:^(GMSRouteStatus routeStatus) {
        GoogleNavView *strongSelf = weakSelf;
        if (!strongSelf) return;

        if (routeStatus == GMSRouteStatusOK) {
            if (strongSelf->_eventEmitter) {
                GoogleNavViewEventEmitter::OnRouteReady routeEvent;
                routeEvent.totalTimeSeconds = strongSelf->_mapView.navigator.timeToNextDestination;
                routeEvent.totalDistanceMeters = strongSelf->_mapView.navigator.distanceToNextDestination;
                std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(strongSelf->_eventEmitter)->onRouteReady(routeEvent);

                GoogleNavViewEventEmitter::OnNavigationStateChanged readyState;
                readyState.state = "ROUTE_READY";
                std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(strongSelf->_eventEmitter)->onNavigationStateChanged(readyState);
            }
            // Always restart guidance — the SDK needs it for arrival
            // detection, even during simulation-only mode.
            if (wasGuidanceActive || wasSimulating) {
                strongSelf->_mapView.navigator.guidanceActive = YES;
            }
            // Re-compute the simulation path along the new route from
            // the current (simulated) position.
            if (wasSimulating) {
                strongSelf->_mapView.locationSimulator.speedMultiplier = 5.0;
                [strongSelf->_mapView.locationSimulator simulateLocationsAlongExistingRoute];
            }
        } else {
            if (strongSelf->_eventEmitter) {
                NSString *errorStr = [NSString stringWithFormat:@"ERROR_%ld", (long)routeStatus];
                GoogleNavViewEventEmitter::OnNavigationStateChanged errorState;
                errorState.state = std::string([errorStr UTF8String]);
                std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(strongSelf->_eventEmitter)->onNavigationStateChanged(errorState);
            }
        }
    }];
}

- (void)recenterCamera
{
    _mapView.followingPerspective = [self gmsCameraPerspective];
    _mapView.cameraMode = GMSNavigationCameraModeFollowing;
}

- (void)showRouteOverview
{
    _mapView.cameraMode = GMSNavigationCameraModeOverview;
}

- (void)moveCamera:(double)latitude
          longitude:(double)longitude
               zoom:(float)zoom
            bearing:(float)bearing
               tilt:(float)tilt
{
    GMSCameraPosition *camera = [GMSCameraPosition cameraWithLatitude:latitude
                                                            longitude:longitude
                                                                 zoom:zoom
                                                              bearing:bearing
                                                         viewingAngle:tilt];
    [_mapView animateToCameraPosition:camera];
}

- (void)setAudioGuidance:(NSInteger)audioGuidance
{
    switch (audioGuidance) {
        case 0: _mapView.navigator.voiceGuidance = GMSNavigationVoiceGuidanceSilent; break;
        case 1: _mapView.navigator.voiceGuidance = GMSNavigationVoiceGuidanceAlertsOnly; break;
        case 2: _mapView.navigator.voiceGuidance = GMSNavigationVoiceGuidanceAlertsAndGuidance; break;
        default: break;
    }
}

- (void)startSimulation
{
    NSLog(@"[GoogleNavView] startSimulation called");
    // Stop any existing simulation first to avoid running two simulators.
    [_mapView.locationSimulator stopSimulation];
    _isGuidanceActive = YES;
    _isSimulationActive = YES;
    _previousLocation = nil;
    // guidanceActive MUST be YES for didArriveAtWaypoint to fire,
    // even when using the location simulator (not real GPS navigation).
    _mapView.navigator.guidanceActive = YES;
    _mapView.navigator.voiceGuidance = GMSNavigationVoiceGuidanceAlertsAndGuidance;
    _mapView.followingPerspective = [self gmsCameraPerspective];
    _mapView.cameraMode = GMSNavigationCameraModeFollowing;
    _mapView.locationSimulator.speedMultiplier = 5.0;
    [_mapView.locationSimulator simulateLocationsAlongExistingRoute];
}

- (void)stopSimulation
{
    _isSimulationActive = NO;
    // Keep _previousLocation so that the bearing calculation for non-driving
    // modes (walk/cycle) can immediately produce a correct heading on resume,
    // rather than waiting for two location updates before the arrow aligns.
    //
    // ONLY stop the location simulator — keep guidance active so the Navigator
    // remembers which waypoints have been visited.  Without the simulator
    // feeding positions the navigator will not fire didArriveAtWaypoint,
    // so there is no risk of spurious arrivals during the OTP pause.
    // Turning guidanceActive off was causing the navigator to lose its
    // waypoint-visited state, which led to skipped OTP stops on resume.
    [_mapView.locationSimulator stopSimulation];
}

- (void)addMarker:(NSString *)markerId
         latitude:(double)latitude
        longitude:(double)longitude
            title:(NSString *)title
          snippet:(NSString *)snippet
{
    GMSMarker *marker = [[GMSMarker alloc] init];
    marker.position = CLLocationCoordinate2DMake(latitude, longitude);
    marker.title = title;
    marker.snippet = snippet;
    marker.map = _mapView;
}

- (void)removeMarker:(NSString *)markerId
{
    // TODO: Track markers by ID for removal
}

- (void)clearMap
{
    [_mapView clear];
}

#pragma mark - Phase 2A: getCurrentRoute

- (void)getCurrentRoute
{
    NSArray<GMSRouteLeg *> *legs = _mapView.navigator.routeLegs;
    if (!legs || legs.count == 0) return;

    NSMutableArray *allCoords = [NSMutableArray array];
    for (GMSRouteLeg *leg in legs) {
        GMSPath *path = leg.path;
        for (NSUInteger i = 0; i < path.count; i++) {
            CLLocationCoordinate2D coord = [path coordinateAtIndex:i];
            [allCoords addObject:@{
                @"latitude": @(coord.latitude),
                @"longitude": @(coord.longitude)
            }];
        }
    }
    if (allCoords.count == 0) return;

    NSString *encoded = [self encodePolylineFromCoords:allCoords];
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:allCoords options:0 error:nil];
    NSString *coordsJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];

    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnRoutePolyline event;
        event.encodedPolyline = std::string([encoded UTF8String]);
        event.coordinatesJson = std::string([coordsJson UTF8String]);
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onRoutePolyline(event);
    }
}

- (NSString *)encodePolylineFromCoords:(NSArray<NSDictionary *> *)coords
{
    NSMutableString *encoded = [NSMutableString string];
    int prevLat = 0;
    int prevLng = 0;
    for (NSDictionary *coord in coords) {
        int lat = (int)round([coord[@"latitude"] doubleValue] * 1e5);
        int lng = (int)round([coord[@"longitude"] doubleValue] * 1e5);
        [encoded appendString:[self encodePolylineValue:lat - prevLat]];
        [encoded appendString:[self encodePolylineValue:lng - prevLng]];
        prevLat = lat;
        prevLng = lng;
    }
    return encoded;
}

- (NSString *)encodePolylineValue:(int)value
{
    int v = value < 0 ? ~(value << 1) : (value << 1);
    NSMutableString *encoded = [NSMutableString string];
    while (v >= 0x20) {
        [encoded appendFormat:@"%c", (char)((0x20 | (v & 0x1f)) + 63)];
        v >>= 5;
    }
    [encoded appendFormat:@"%c", (char)(v + 63)];
    return encoded;
}

#pragma mark - Phase 2B: Per-waypoint ETA

- (void)emitWaypointETAs
{
    GMSNavigator *nav = _mapView.navigator;
    if (!nav) return;
    NSInteger remaining = (NSInteger)_storedWaypoints.count - _currentWaypointIndex;
    if (remaining <= 0) return;

    double timeToNext = nav.timeToNextDestination;
    double distToNext = nav.distanceToNextDestination;

    // Build leg distances
    NSMutableArray<NSNumber *> *legDistances = [NSMutableArray array];
    [legDistances addObject:@(distToNext)];
    for (NSInteger i = _currentWaypointIndex; i < (NSInteger)_storedWaypoints.count - 1; i++) {
        NSDictionary *a = _storedWaypoints[i];
        NSDictionary *b = _storedWaypoints[i + 1];
        double d = [self haversineFrom:[a[@"latitude"] doubleValue]
                               fromLon:[a[@"longitude"] doubleValue]
                                 toLat:[b[@"latitude"] doubleValue]
                                 toLon:[b[@"longitude"] doubleValue]];
        [legDistances addObject:@(d)];
    }

    double avgSpeed = (timeToNext > 0) ? distToNext / timeToNext : 10.0;

    double cumulativeTime = 0;
    double cumulativeDistance = 0;
    NSMutableArray *etas = [NSMutableArray array];
    for (NSUInteger i = 0; i < legDistances.count; i++) {
        cumulativeDistance += [legDistances[i] doubleValue];
        if (i == 0) {
            cumulativeTime = timeToNext;
        } else {
            cumulativeTime = timeToNext + (cumulativeDistance - distToNext) / avgSpeed;
        }
        NSInteger wpIdx = _currentWaypointIndex + (NSInteger)i;
        NSString *title = @"";
        if (wpIdx < (NSInteger)_storedWaypoints.count) {
            title = _storedWaypoints[wpIdx][@"title"] ?: @"";
        }
        [etas addObject:@{
            @"waypointIndex": @(wpIdx),
            @"remainingTimeSeconds": @(cumulativeTime),
            @"remainingDistanceMeters": @(cumulativeDistance),
            @"title": title
        }];
    }

    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:etas options:0 error:nil];
    NSString *etasJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];

    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnWaypointETAsUpdated event;
        event.waypointETAsJson = std::string([etasJson UTF8String]);
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onWaypointETAsUpdated(event);
    }
}

- (double)haversineFrom:(double)lat1 fromLon:(double)lon1 toLat:(double)lat2 toLon:(double)lon2
{
    double R = 6371000.0;
    double dLat = (lat2 - lat1) * M_PI / 180.0;
    double dLon = (lon2 - lon1) * M_PI / 180.0;
    double a = sin(dLat / 2) * sin(dLat / 2) +
               cos(lat1 * M_PI / 180.0) * cos(lat2 * M_PI / 180.0) *
               sin(dLon / 2) * sin(dLon / 2);
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
}

#pragma mark - Bearing Calculation

- (double)bearingFromLocation:(CLLocation *)from toLocation:(CLLocation *)to
{
    double lat1 = from.coordinate.latitude * M_PI / 180.0;
    double lon1 = from.coordinate.longitude * M_PI / 180.0;
    double lat2 = to.coordinate.latitude * M_PI / 180.0;
    double lon2 = to.coordinate.longitude * M_PI / 180.0;
    double dLon = lon2 - lon1;
    double y = sin(dLon) * cos(lat2);
    double x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
    double bearing = atan2(y, x) * 180.0 / M_PI;
    return fmod(bearing + 360.0, 360.0);
}

#pragma mark - Camera Perspective Helper

- (GMSNavigationCameraPerspective)gmsCameraPerspective
{
    // Use the followingPerspective prop for all travel modes.
    // Tilted (default) gives driving-like 3D camera that tracks the navigation arrow.
    switch (_followingPerspective) {
        case 0: return GMSNavigationCameraPerspectiveTilted;
        case 1: return GMSNavigationCameraPerspectiveTopDownNorthUp;
        case 2: return GMSNavigationCameraPerspectiveTopDownHeadingUp;
        default: return GMSNavigationCameraPerspectiveTilted;
    }
}

#pragma mark - GMSNavigatorListener

- (void)navigator:(GMSNavigator *)navigator didArriveAtWaypoint:(GMSNavigationWaypoint *)waypoint
{
    BOOL isFinal = (_currentWaypointIndex >= (NSInteger)_storedWaypoints.count - 1);

    if (_eventEmitter) {
        // Extract metadata from stored waypoint
        NSString *metadataJson = @"{}";
        if (_currentWaypointIndex < (NSInteger)_storedWaypoints.count) {
            NSDictionary *wpDict = _storedWaypoints[_currentWaypointIndex];
            NSDictionary *meta = wpDict[@"metadata"];
            if (meta && [meta isKindOfClass:[NSDictionary class]]) {
                NSData *jsonData = [NSJSONSerialization dataWithJSONObject:meta options:0 error:nil];
                if (jsonData) {
                    metadataJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
                }
            }
        }

        GoogleNavViewEventEmitter::OnArrival event;
        event.waypointIndex = (int)_currentWaypointIndex;
        event.isFinalDestination = isFinal;
        event.waypointLatitude = waypoint.coordinate.latitude;
        event.waypointLongitude = waypoint.coordinate.longitude;
        event.waypointTitle = std::string([waypoint.title UTF8String] ?: "");
        event.waypointMetadata = std::string([metadataJson UTF8String]);
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onArrival(event);
    }

    _currentWaypointIndex++;

    if (isFinal) {
        if (_eventEmitter) {
            GoogleNavViewEventEmitter::OnNavigationStateChanged stateEvent;
            stateEvent.state = "ARRIVED";
            std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onNavigationStateChanged(stateEvent);
        }
    } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        [_mapView.navigator continueToNextDestination];
#pragma clang diagnostic pop
        _mapView.navigator.guidanceActive = YES;
        // continueToNextDestination can switch the camera to overview;
        // restore following mode so the navigation arrow stays in view.
        _mapView.cameraMode = GMSNavigationCameraModeFollowing;
    }
}

- (void)navigatorDidChangeRoute:(GMSNavigator *)navigator
{
    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnRouteChanged event;
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onRouteChanged(event);
    }
}

- (void)navigator:(GMSNavigator *)navigator didUpdateRemainingTime:(NSTimeInterval)time
{
    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnRemainingTimeOrDistanceChanged event;
        event.remainingTimeSeconds = time;
        event.remainingDistanceMeters = navigator.distanceToNextDestination;
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onRemainingTimeOrDistanceChanged(event);
    }

    // Throttled per-waypoint ETA emission (every 10 seconds)
    NSTimeInterval now = [[NSDate date] timeIntervalSince1970];
    if (now - _lastETAEmitTime >= 10.0 && _storedWaypoints.count > 1) {
        _lastETAEmitTime = now;
        [self emitWaypointETAs];
    }
}

- (void)navigator:(GMSNavigator *)navigator didUpdateRemainingDistance:(CLLocationDistance)distance
{
    // Handled by time update above to avoid duplicate events
}

#pragma mark - Turn-by-Turn + Rerouting + Speeding

- (void)navigator:(GMSNavigator *)navigator didUpdateNavInfo:(GMSNavigationNavInfo *)navInfo
{
    if (!_eventEmitter) return;

    // Emit rerouting event
    if (navInfo.navState == GMSNavigationNavStateRerouting) {
        GoogleNavViewEventEmitter::OnRerouting event;
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onRerouting(event);
        return;
    }

    // Emit turn-by-turn when enroute
    if (navInfo.navState == GMSNavigationNavStateEnroute && navInfo.currentStep) {
        GMSNavigationStepInfo *step = navInfo.currentStep;
        GoogleNavViewEventEmitter::OnTurnByTurnUpdated event;
        event.distanceRemainingMeters = navInfo.distanceToCurrentStepMeters;
        event.timeRemainingSeconds = navInfo.timeToCurrentStepSeconds;
        event.fullRoadName = std::string([step.fullRoadName UTF8String] ?: "");
        event.maneuver = [self maneuverToString:step.maneuver];
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onTurnByTurnUpdated(event);
    }
}

- (void)navigator:(GMSNavigator *)navigator didUpdateSpeedingPercentage:(CGFloat)percentageAboveLimit
{
    if (!_eventEmitter) return;
    GoogleNavViewEventEmitter::OnSpeeding event;
    event.percentageAboveLimit = percentageAboveLimit;
    std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onSpeeding(event);
}

- (std::string)maneuverToString:(GMSNavigationManeuver)maneuver
{
    switch (maneuver) {
        case GMSNavigationManeuverDestination: return "DESTINATION";
        case GMSNavigationManeuverDestinationLeft: return "DESTINATION_LEFT";
        case GMSNavigationManeuverDestinationRight: return "DESTINATION_RIGHT";
        case GMSNavigationManeuverStraight: return "STRAIGHT";
        case GMSNavigationManeuverDepart: return "DEPART";
        case GMSNavigationManeuverTurnLeft: return "TURN_LEFT";
        case GMSNavigationManeuverTurnRight: return "TURN_RIGHT";
        case GMSNavigationManeuverTurnKeepLeft: return "TURN_KEEP_LEFT";
        case GMSNavigationManeuverTurnKeepRight: return "TURN_KEEP_RIGHT";
        case GMSNavigationManeuverTurnSlightLeft: return "TURN_SLIGHT_LEFT";
        case GMSNavigationManeuverTurnSlightRight: return "TURN_SLIGHT_RIGHT";
        case GMSNavigationManeuverTurnSharpLeft: return "TURN_SHARP_LEFT";
        case GMSNavigationManeuverTurnSharpRight: return "TURN_SHARP_RIGHT";
        case GMSNavigationManeuverTurnUTurnClockwise: return "U_TURN_RIGHT";
        case GMSNavigationManeuverTurnUTurnCounterClockwise: return "U_TURN_LEFT";
        case GMSNavigationManeuverMergeUnspecified: return "MERGE";
        case GMSNavigationManeuverMergeLeft: return "MERGE_LEFT";
        case GMSNavigationManeuverMergeRight: return "MERGE_RIGHT";
        case GMSNavigationManeuverForkLeft: return "FORK_LEFT";
        case GMSNavigationManeuverForkRight: return "FORK_RIGHT";
        case GMSNavigationManeuverOnRampUnspecified: return "ON_RAMP";
        case GMSNavigationManeuverOnRampLeft: return "ON_RAMP_LEFT";
        case GMSNavigationManeuverOnRampRight: return "ON_RAMP_RIGHT";
        case GMSNavigationManeuverOnRampKeepLeft: return "ON_RAMP_KEEP_LEFT";
        case GMSNavigationManeuverOnRampKeepRight: return "ON_RAMP_KEEP_RIGHT";
        case GMSNavigationManeuverOnRampSlightLeft: return "ON_RAMP_SLIGHT_LEFT";
        case GMSNavigationManeuverOnRampSlightRight: return "ON_RAMP_SLIGHT_RIGHT";
        case GMSNavigationManeuverOnRampSharpLeft: return "ON_RAMP_SHARP_LEFT";
        case GMSNavigationManeuverOnRampSharpRight: return "ON_RAMP_SHARP_RIGHT";
        case GMSNavigationManeuverOnRampUTurnClockwise: return "ON_RAMP_U_TURN_RIGHT";
        case GMSNavigationManeuverOnRampUTurnCounterClockwise: return "ON_RAMP_U_TURN_LEFT";
        case GMSNavigationManeuverOffRampUnspecified: return "OFF_RAMP";
        case GMSNavigationManeuverOffRampLeft: return "OFF_RAMP_LEFT";
        case GMSNavigationManeuverOffRampRight: return "OFF_RAMP_RIGHT";
        case GMSNavigationManeuverOffRampKeepLeft: return "OFF_RAMP_KEEP_LEFT";
        case GMSNavigationManeuverOffRampKeepRight: return "OFF_RAMP_KEEP_RIGHT";
        case GMSNavigationManeuverOffRampSlightLeft: return "OFF_RAMP_SLIGHT_LEFT";
        case GMSNavigationManeuverOffRampSlightRight: return "OFF_RAMP_SLIGHT_RIGHT";
        case GMSNavigationManeuverOffRampSharpLeft: return "OFF_RAMP_SHARP_LEFT";
        case GMSNavigationManeuverOffRampSharpRight: return "OFF_RAMP_SHARP_RIGHT";
        case GMSNavigationManeuverRoundaboutClockwise: return "ROUNDABOUT_RIGHT";
        case GMSNavigationManeuverRoundaboutCounterClockwise: return "ROUNDABOUT_LEFT";
        case GMSNavigationManeuverRoundaboutExitClockwise: return "ROUNDABOUT_EXIT_RIGHT";
        case GMSNavigationManeuverRoundaboutExitCounterClockwise: return "ROUNDABOUT_EXIT_LEFT";
        case GMSNavigationManeuverRoundaboutLeftClockwise: return "ROUNDABOUT_LEFT_CW";
        case GMSNavigationManeuverRoundaboutLeftCounterClockwise: return "ROUNDABOUT_LEFT_CCW";
        case GMSNavigationManeuverRoundaboutRightClockwise: return "ROUNDABOUT_RIGHT_CW";
        case GMSNavigationManeuverRoundaboutRightCounterClockwise: return "ROUNDABOUT_RIGHT_CCW";
        case GMSNavigationManeuverRoundaboutSlightLeftClockwise: return "ROUNDABOUT_SLIGHT_LEFT_CW";
        case GMSNavigationManeuverRoundaboutSlightLeftCounterClockwise: return "ROUNDABOUT_SLIGHT_LEFT_CCW";
        case GMSNavigationManeuverRoundaboutSlightRightClockwise: return "ROUNDABOUT_SLIGHT_RIGHT_CW";
        case GMSNavigationManeuverRoundaboutSlightRightCounterClockwise: return "ROUNDABOUT_SLIGHT_RIGHT_CCW";
        case GMSNavigationManeuverRoundaboutSharpLeftClockwise: return "ROUNDABOUT_SHARP_LEFT_CW";
        case GMSNavigationManeuverRoundaboutSharpLeftCounterClockwise: return "ROUNDABOUT_SHARP_LEFT_CCW";
        case GMSNavigationManeuverRoundaboutSharpRightClockwise: return "ROUNDABOUT_SHARP_RIGHT_CW";
        case GMSNavigationManeuverRoundaboutSharpRightCounterClockwise: return "ROUNDABOUT_SHARP_RIGHT_CCW";
        case GMSNavigationManeuverRoundaboutStraightClockwise: return "ROUNDABOUT_STRAIGHT_CW";
        case GMSNavigationManeuverRoundaboutStraightCounterClockwise: return "ROUNDABOUT_STRAIGHT_CCW";
        case GMSNavigationManeuverRoundaboutUTurnClockwise: return "ROUNDABOUT_U_TURN_CW";
        case GMSNavigationManeuverRoundaboutUTurnCounterClockwise: return "ROUNDABOUT_U_TURN_CCW";
        case GMSNavigationManeuverFerryBoat: return "FERRY_BOAT";
        case GMSNavigationManeuverFerryTrain: return "FERRY_TRAIN";
        case GMSNavigationManeuverNameChange: return "NAME_CHANGE";
        default: return "UNKNOWN";
    }
}

#pragma mark - GMSRoadSnappedLocationProviderListener

- (void)locationProvider:(GMSRoadSnappedLocationProvider *)locationProvider
       didUpdateLocation:(CLLocation *)location
{
    // For non-driving modes, manually calculate and apply bearing from consecutive locations
    // because the iOS SDK simulator doesn't provide proper course/heading for these modes.
    if (_isGuidanceActive && _currentTravelMode != 0 && _previousLocation) {
        double bearing = [self bearingFromLocation:_previousLocation toLocation:location];
        // Only apply if the vehicle actually moved (avoid jitter from stationary updates)
        double distance = [location distanceFromLocation:_previousLocation];
        if (distance > 1.0) {
            [_mapView animateToBearing:bearing];
            // animateToBearing disengages GMSNavigationCameraModeFollowing.
            // Re-assert it immediately so the navigation arrow stays in view.
            _mapView.cameraMode = GMSNavigationCameraModeFollowing;
        }
    }
    _previousLocation = location;

    // Throttle foreground location events to once every 30 seconds
    NSTimeInterval now = [[NSDate date] timeIntervalSince1970];
    if (now - _lastLocationEmitTime < 30.0) return;
    _lastLocationEmitTime = now;

    if (_eventEmitter) {
        GoogleNavViewEventEmitter::OnLocationChanged event;
        event.latitude = location.coordinate.latitude;
        event.longitude = location.coordinate.longitude;
        event.bearing = location.course;
        event.speed = location.speed;
        event.accuracy = location.horizontalAccuracy;
        std::dynamic_pointer_cast<const GoogleNavViewEventEmitter>(_eventEmitter)->onLocationChanged(event);
    }
}

#pragma mark - Lifecycle

- (void)prepareForRecycle
{
    [super prepareForRecycle];
    if (_mapView) {
        [_mapView.navigator clearDestinations];
        _mapView.navigator.guidanceActive = NO;
        [_mapView.navigator removeListener:self];
        [_mapView.roadSnappedLocationProvider removeListener:self];
        [_mapView clear];
        _mapView = nil;
    }
    _mapInitialized = NO;
}

@end

Class<RCTComponentViewProtocol> GoogleNavViewCls(void)
{
    return GoogleNavView.class;
}
