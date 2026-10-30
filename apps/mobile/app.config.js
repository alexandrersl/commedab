// Couleurs de l'icône Android et de l'écran de lancement, tirées de docs/design/tokens.json
// (specs techniques 11.1) ; le reste de la configuration est dans app.json.
const tokens = require('./src/theme/tokens.cjs');

module.exports = ({ config }) => ({
  ...config,
  backgroundColor: tokens.colors.light.ground,
  android: {
    ...config.android,
    adaptiveIcon: { ...config.android.adaptiveIcon, backgroundColor: tokens.colors.light.ground },
  },
});
