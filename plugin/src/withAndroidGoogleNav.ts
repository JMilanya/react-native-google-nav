import {
  type ConfigPlugin,
  withAndroidManifest,
  AndroidConfig,
} from 'expo/config-plugins';
import type { GoogleNavPluginProps } from './index';

export const withAndroidGoogleNav: ConfigPlugin<GoogleNavPluginProps> = (
  config,
  { androidApiKey }
) => {
  config = withAndroidManifest(config, (config) => {
    const mainApp =
      AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    // Add API key meta-data
    if (androidApiKey) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApp,
        'com.google.android.geo.API_KEY',
        androidApiKey
      );
    }

    // Add permissions
    const mainManifest = config.modResults.manifest;
    if (!mainManifest['uses-permission']) {
      mainManifest['uses-permission'] = [];
    }

    const addPermission = (name: string) => {
      const exists = mainManifest['uses-permission']!.some(
        (p: { $: { 'android:name': string } }) =>
          p.$['android:name'] === name
      );
      if (!exists) {
        mainManifest['uses-permission']!.push({
          $: { 'android:name': name },
        } as any);
      }
    };

    addPermission('android.permission.ACCESS_FINE_LOCATION');
    addPermission('android.permission.ACCESS_COARSE_LOCATION');
    addPermission('android.permission.FOREGROUND_SERVICE');

    return config;
  });

  return config;
};
