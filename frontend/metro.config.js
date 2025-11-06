/* eslint-disable @typescript-eslint/no-var-requires */
const { getDefaultConfig } = require('expo/metro-config');

// Get the default configuration from Expo
const defaultConfig = getDefaultConfig(__dirname);

// Destructure for easier access
const { transformer, resolver } = defaultConfig;
const { assetExts, sourceExts } = resolver;

// 1. Configure SVG transformer
defaultConfig.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
defaultConfig.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
// SVG is now a source asset, so we add it to sourceExts
sourceExts.push('svg');

// 2. Add Detox mock extensions if running tests
if (process.env.DETOX_TESTS === 'true') {
  sourceExts.unshift('mock.ts', 'mock.tsx');
}

// 3. Add any other custom extensions
// The original file added wasm. The .expo extensions are already
// included in the default config, so we don't need to add them again.
sourceExts.push('wasm');

// 4. Re-assign the modified sourceExts array back to the config
defaultConfig.resolver.sourceExts = sourceExts;

// Export the final, merged configuration
module.exports = defaultConfig;