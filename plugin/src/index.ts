import { type ConfigPlugin, createRunOncePlugin } from 'expo/config-plugins';
import { withAndroidGoogleNav } from './withAndroidGoogleNav';
import { withIosGoogleNav } from './withIosGoogleNav';

export type GoogleNavPluginProps = {
  androidApiKey?: string;
  iosApiKey?: string;
};

const withGoogleNav: ConfigPlugin<GoogleNavPluginProps> = (
  config,
  props = {}
) => {
  config = withAndroidGoogleNav(config, props);
  config = withIosGoogleNav(config, props);
  return config;
};

const pkg = require('react-native-google-nav/package.json');

export default createRunOncePlugin(withGoogleNav, pkg.name, pkg.version);
