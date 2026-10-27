const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo retire la condition d'export `react-native` sur le web ; le SDK web de PowerSync
// publie sa version compatible Metro sous `react-native-web`.
config.resolver.unstable_conditionsByPlatform.web.push('react-native-web');

module.exports = config;
