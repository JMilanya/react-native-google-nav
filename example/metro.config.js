const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root so Metro picks up changes in the library source
config.watchFolders = [monorepoRoot];

// Resolve modules from both example/node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Resolve react-native-google-nav directly from source during development.
// Without this Metro uses the `main` field (lib/module/index.js — compiled output),
// so any edit to src/ is invisible until you run `bun run build`.
const librarySourceEntry = path.resolve(monorepoRoot, 'src/index.tsx');
const _resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-google-nav') {
    return { filePath: librarySourceEntry, type: 'sourceFile' };
  }
  // Fall back to default resolution for everything else
  return _resolveRequest
    ? _resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
