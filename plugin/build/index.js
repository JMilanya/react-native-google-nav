"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("expo/config-plugins");
const withAndroidGoogleNav_1 = require("./withAndroidGoogleNav");
const withIosGoogleNav_1 = require("./withIosGoogleNav");
const withGoogleNav = (config, props = {}) => {
    config = (0, withAndroidGoogleNav_1.withAndroidGoogleNav)(config, props);
    config = (0, withIosGoogleNav_1.withIosGoogleNav)(config, props);
    return config;
};
const pkg = require('react-native-google-nav/package.json');
exports.default = (0, config_plugins_1.createRunOncePlugin)(withGoogleNav, pkg.name, pkg.version);
//# sourceMappingURL=index.js.map