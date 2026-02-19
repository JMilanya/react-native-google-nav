"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIosGoogleNav = void 0;
const config_plugins_1 = require("expo/config-plugins");
const withIosGoogleNav = (config, { iosApiKey }) => {
    // Set minimum iOS deployment target to 16.0 (required by Google Navigation SDK)
    config = (0, config_plugins_1.withPodfileProperties)(config, (config) => {
        const currentTarget = config.modResults['ios.deploymentTarget'];
        if (!currentTarget || parseFloat(currentTarget) < 16.0) {
            config.modResults['ios.deploymentTarget'] = '16.0';
        }
        return config;
    });
    config = (0, config_plugins_1.withInfoPlist)(config, (config) => {
        // Location permissions
        config.modResults.NSLocationWhenInUseUsageDescription =
            config.modResults.NSLocationWhenInUseUsageDescription ||
                'This app needs your location for turn-by-turn navigation.';
        config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
            config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription ||
                'This app needs background location access for navigation.';
        // Background modes
        const bgModes = config.modResults.UIBackgroundModes || [];
        if (!bgModes.includes('location')) {
            bgModes.push('location');
        }
        config.modResults.UIBackgroundModes = bgModes;
        // Store API key in Info.plist for the app to read
        if (iosApiKey) {
            config.modResults.GoogleNavAPIKey = iosApiKey;
        }
        return config;
    });
    return config;
};
exports.withIosGoogleNav = withIosGoogleNav;
//# sourceMappingURL=withIosGoogleNav.js.map