// Thème NativeWind dérivé de docs/design/tokens.json (specs techniques 11.1) : aucune valeur
// n'est écrite ici. Les échelles par défaut de Tailwind sont remplacées, pas étendues, pour
// qu'une classe hors jetons n'existe pas.
const plugin = require('tailwindcss/plugin');
const tokens = require('./src/theme/tokens.cjs');

const colors = Object.fromEntries(tokens.colorNames.map((name) => [name, `var(--${name})`]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  safelist: tokens.textStyles.map((style) => `type-${style.name}`),
  theme: {
    colors: { transparent: 'transparent', ...colors },
    spacing: { 0: '0px', ...tokens.spacing },
    borderRadius: { none: '0px', ...tokens.radius },
    borderWidth: { 0: '0px', ...tokens.border },
    fontSize: {},
    fontFamily: Object.fromEntries(tokens.fontNames.map((name) => [name, [name]])),
    transitionDuration: tokens.duration,
    extend: {
      height: tokens.size,
      minHeight: tokens.size,
      width: tokens.size,
      minWidth: tokens.size,
    },
  },
  plugins: [
    plugin(({ addComponents }) =>
      addComponents(
        Object.fromEntries(
          tokens.textStyles.map((style) => [
            `.type-${style.name}`,
            {
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              ...(style.letterSpacing === null ? {} : { letterSpacing: style.letterSpacing }),
            },
          ]),
        ),
      ),
    ),
  ],
};
