// Lecture de docs/design/tokens.json, seule source des valeurs visuelles (specs techniques 11.1).
// Partagée par tailwind.config.js (Node) et par l'application (Metro).
const tokens = require('../../../../docs/design/tokens.json');

const WEIGHT_NAMES = { 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };

/** Nom de la police chargée par @expo-google-fonts : `Fraunces_600SemiBold`. */
function fontName(family, weight) {
  const css = tokens.type.families[family];
  const name = /"([^"]+)"/.exec(css)[1];
  return `${name.replace(/\s+/g, '')}_${weight}${WEIGHT_NAMES[weight]}`;
}

const named = (group, prefix) =>
  Object.fromEntries(tokens[group].tokens.map((t) => [t.name.replace(prefix, ''), t.value]));

const textStyles = tokens.type.groups.flatMap((group) =>
  group.styles.map((style) => ({
    name: style.name,
    fontFamily: fontName(group.family, style.fontWeight),
    fontSize: style.fontSize,
    letterSpacing: style.letterSpacing ?? null,
  })),
);

module.exports = {
  colorNames: tokens.color.tokens.map((t) => t.name),
  /** Valeur de chaque couleur, par thème : `colors.light.ground`. */
  colors: Object.fromEntries(
    tokens.color.themes.map(({ id }) => [
      id,
      Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value[id]])),
    ]),
  ),
  textStyles,
  fontNames: [...new Set(textStyles.map((s) => s.fontFamily))],
  spacing: named('spacing', 'space-'),
  radius: named('radius', 'radius-'),
  size: named('size', ''),
  border: named('border', 'border-'),
  opacity: named('opacity', 'opacity-'),
  scale: named('scale', 'scale-'),
  duration: named('duration', 'duration-'),
};
