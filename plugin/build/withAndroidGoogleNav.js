"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAndroidGoogleNav = void 0;
const config_plugins_1 = require("expo/config-plugins");
const withAndroidGoogleNav = (config, { androidApiKey }) => {
    config = (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const mainApp = config_plugins_1.AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
        // Add API key meta-data
        if (androidApiKey) {
            config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(mainApp, 'com.google.android.geo.API_KEY', androidApiKey);
        }
        // Add permissions
        const mainManifest = config.modResults.manifest;
        if (!mainManifest['uses-permission']) {
            mainManifest['uses-permission'] = [];
        }
        const addPermission = (name) => {
            const exists = mainManifest['uses-permission'].some((p) => p.$['android:name'] === name);
            if (!exists) {
                mainManifest['uses-permission'].push({
                    $: { 'android:name': name },
                });
            }
        };
        addPermission('android.permission.ACCESS_FINE_LOCATION');
        addPermission('android.permission.ACCESS_COARSE_LOCATION');
        addPermission('android.permission.FOREGROUND_SERVICE');
        return config;
    });
    return config;
};
exports.withAndroidGoogleNav = withAndroidGoogleNav;
//# sourceMappingURL=withAndroidGoogleNav.js.map