#import "GoogleNavModule.h"
#import <GoogleMaps/GoogleMaps.h>
#import <GoogleNavigation/GoogleNavigation.h>
#import <CoreLocation/CoreLocation.h>

static NSString *const kBackgroundLocationEvent = @"onBackgroundLocationUpdate";

@interface GoogleNavModule () <CLLocationManagerDelegate>
@end

@implementation GoogleNavModule {
    CLLocationManager *_locationManager;
    BOOL _hasListeners;
    NSTimeInterval _lastEmitTime;
    NSTimeInterval _minEmitInterval; // seconds between events (derived from intervalMs)
}

RCT_EXPORT_MODULE()

#pragma mark - RCTEventEmitter

- (NSArray<NSString *> *)supportedEvents
{
    return @[kBackgroundLocationEvent];
}

- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving  { _hasListeners = NO; }

#pragma mark - Navigation SDK

- (void)initializeNavigation:(NSString *)apiKey
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
    NSLog(@"[GoogleNavModule] initializeNavigation called with key: %@...", [apiKey substringToIndex:MIN(8, apiKey.length)]);
    dispatch_async(dispatch_get_main_queue(), ^{
        [GMSServices provideAPIKey:apiKey];
        NSLog(@"[GoogleNavModule] API key provided successfully");
        resolve(@(YES));
    });
}

- (void)showTermsAndConditions:(NSString *)title
                   companyName:(NSString *)companyName
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject
{
    NSLog(@"[GoogleNavModule] showTermsAndConditions called: title=%@, company=%@", title, companyName);
    dispatch_async(dispatch_get_main_queue(), ^{
        NSLog(@"[GoogleNavModule] Terms already accepted: %d", [GMSNavigationServices areTermsAndConditionsAccepted]);
        GMSNavigationTermsAndConditionsOptions *options =
            [[GMSNavigationTermsAndConditionsOptions alloc] initWithCompanyName:companyName];
        options.title = title;
        [GMSNavigationServices showTermsAndConditionsDialogIfNeededWithOptions:options
                                                                        callback:^(BOOL accepted) {
            NSLog(@"[GoogleNavModule] Terms accepted: %d", accepted);
            resolve(@(accepted));
        }];
    });
}

- (void)areTermsAccepted:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@([GMSNavigationServices areTermsAndConditionsAccepted]));
    });
}

- (void)resetTermsAccepted
{
    dispatch_async(dispatch_get_main_queue(), ^{
        [GMSNavigationServices resetTermsAndConditionsAccepted];
    });
}

- (void)isGuidanceRunning:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
    resolve(@(NO));
}

- (void)getSDKVersion:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
    resolve([GMSServices SDKLongVersion]);
}

#pragma mark - Background Location

- (void)startBackgroundLocationUpdates:(double)intervalMs
                     notificationTitle:(NSString *)notificationTitle
                      notificationText:(NSString *)notificationText
                                resolve:(RCTPromiseResolveBlock)resolve
                                 reject:(RCTPromiseRejectBlock)reject
{
    // notificationTitle and notificationText are Android-only — iOS shows no persistent notification.
    _minEmitInterval = MAX(intervalMs / 1000.0, 1.0);
    _lastEmitTime = 0;

    dispatch_async(dispatch_get_main_queue(), ^{
        if (!self->_locationManager) {
            self->_locationManager = [[CLLocationManager alloc] init];
            self->_locationManager.delegate = self;
            self->_locationManager.desiredAccuracy = kCLLocationAccuracyBest;
            self->_locationManager.distanceFilter = kCLDistanceFilterNone;
        }
        self->_locationManager.allowsBackgroundLocationUpdates = YES;
        self->_locationManager.pausesLocationUpdatesAutomatically = NO;
        [self->_locationManager requestAlwaysAuthorization];
        [self->_locationManager startUpdatingLocation];
        resolve(@(YES));
    });
}

- (void)stopBackgroundLocationUpdates:(RCTPromiseResolveBlock)resolve
                                reject:(RCTPromiseRejectBlock)reject
{
    dispatch_async(dispatch_get_main_queue(), ^{
        [self->_locationManager stopUpdatingLocation];
        self->_locationManager.allowsBackgroundLocationUpdates = NO;
        resolve(@(YES));
    });
}

#pragma mark - CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager
     didUpdateLocations:(NSArray<CLLocation *> *)locations
{
    CLLocation *location = locations.lastObject;
    if (!location || !_hasListeners) return;

    // Throttle emissions to match the requested interval
    NSTimeInterval now = [[NSDate date] timeIntervalSince1970];
    if (_minEmitInterval > 0 && (now - _lastEmitTime) < _minEmitInterval) return;
    _lastEmitTime = now;

    [self sendEventWithName:kBackgroundLocationEvent body:@{
        @"latitude":  @(location.coordinate.latitude),
        @"longitude": @(location.coordinate.longitude),
        @"bearing":   @(location.course >= 0 ? location.course : 0),
        @"speed":     @(location.speed >= 0 ? location.speed : 0),
        @"accuracy":  @(location.horizontalAccuracy),
        @"timestamp": @((long long)(location.timestamp.timeIntervalSince1970 * 1000)),
    }];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
    NSLog(@"[GoogleNavModule] Background location error: %@", error.localizedDescription);
}

#pragma mark - TurboModule bridge

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeGoogleNavModuleSpecJSI>(params);
}

@end
