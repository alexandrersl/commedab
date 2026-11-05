const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// La configuration d'Expo, plus les identifiants qui relient chaque bundle à sa source map
// envoyée à Sentry (specs techniques 9.5).
const config = getSentryExpoConfig(__dirname);

// Expo retire la condition d'export `react-native` sur le web ; le SDK web de PowerSync
// publie sa version compatible Metro sous `react-native-web`.
config.resolver.unstable_conditionsByPlatform.web.push('react-native-web');

module.exports = withNativeWind(config, { input: './global.css' });
