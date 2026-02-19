import {
  type ConfigPlugin,
  withInfoPlist,
  withPodfileProperties,
} from 'expo/config-plugins';
import type { GoogleNavPluginProps } from './index';

export const withIosGoogleNav: ConfigPlugin<GoogleNavPluginProps> = (
  config,
  { iosApiKey }
) => {
  // Set minimum iOS deployment target to 16.0 (required by Google Navigation SDK)
  config = withPodfileProperties(config, (config) => {
    const currentTarget = config.modResults['ios.deploymentTarget'];
    if (!currentTarget || parseFloat(currentTarget) < 16.0) {
      config.modResults['ios.deploymentTarget'] = '16.0';
    }
    return config;
  });

  config = withInfoPlist(config, (config) => {
    // Location permissions
    config.modResults.NSLocationWhenInUseUsageDescription =
      config.modResults.NSLocationWhenInUseUsageDescription ||
      'This app needs your location for turn-by-turn navigation.';

    config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
      config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription ||
      'This app needs background location access for navigation.';

    // Background modes
    const bgModes = (config.modResults.UIBackgroundModes as string[]) || [];
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
