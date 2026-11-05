// Une graisse par import : l'index de chaque paquet embarquerait toutes les autres dans le build.
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import tokens from './tokens.cjs';

export type ColorName = (typeof tokens.colorNames)[number];
export type Scheme = 'light' | 'dark';
export type TextStyleName =
  | 'title-screen'
  | 'title-hero'
  | 'title-section'
  | 'title-card'
  | 'sentence'
  | 'sentence-lg'
  | 'body'
  | 'body-strong'
  | 'body-sm'
  | 'label'
  | 'caption'
  | 'tab'
  | 'button'
  | 'button-sm';

const FONT_FILES: Record<string, number> = {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
};

function fontFile(name: string): number {
  const file = FONT_FILES[name];
  if (file === undefined) throw new Error(`Police ${name} de tokens.json non importée`);
  return file;
}

function pixels(value: string): number {
  return Number.parseFloat(value);
}

/** Tailles de `tokens.json`, en points. */
export const size = Object.fromEntries(
  Object.entries(tokens.size).map(([name, value]) => [name, pixels(value)]),
) as Record<keyof typeof tokens.size, number>;

/** Espacements de `tokens.json`, en points : `space[4]` vaut 16. */
export const space = Object.fromEntries(
  Object.entries(tokens.spacing).map(([name, value]) => [name, pixels(value)]),
) as Record<'1' | '2' | '3' | '4' | '6' | '8', number>;

/** Zone de tap portée à `control` (44) autour d'un contrôle de `control-sm` (36) : ENF-1. */
export const HIT_SLOP = (size.control - size['control-sm']) / 2;

/** Opacités d'état de `tokens.json` (`docs/design/design-system.md`, États). */
export const opacity = Object.fromEntries(
  Object.entries(tokens.opacity).map(([name, value]) => [name, Number(value)]),
) as Record<keyof typeof tokens.opacity, number>;

/** La courbe unique des animations (`tokens.json`, `easing`), en CSS. */
export const EASE_OUT = tokens.easing['ease-out'];

/** Échelles de `tokens.json` : `scale.pressed` sous le doigt. */
export const scale = Object.fromEntries(
  Object.entries(tokens.scale).map(([name, value]) => [name, Number(value)]),
) as Record<keyof typeof tokens.scale, number>;

const VARS = {
  light: vars(
    Object.fromEntries(Object.entries(tokens.colors.light).map(([k, v]) => [`--${k}`, v])),
  ),
  dark: vars(Object.fromEntries(Object.entries(tokens.colors.dark).map(([k, v]) => [`--${k}`, v]))),
};

interface Theme {
  scheme: Scheme;
  /** Variables de couleur du thème, à reposer sur ce qui s'affiche hors de l'arbre (feuilles). */
  vars: (typeof VARS)[Scheme];
  /** Valeurs des couleurs pour ce qui ne prend pas de classe (icônes, curseurs, indicateurs). */
  colors: Record<ColorName, string>;
  /** Durées en ms, nulles quand le système réduit les animations. */
  duration: Record<keyof typeof tokens.duration, number>;
}

const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (theme === null) throw new Error('useTheme hors de ThemeRoot');
  return theme;
}

/**
 * Thème clair ou sombre selon le système (ENF-9) : variables de couleur posées à la racine,
 * polices chargées avant le premier rendu.
 */
export function ThemeRoot({ children, scheme: forced }: { children: ReactNode; scheme?: Scheme }) {
  const system = useColorScheme();
  const scheme: Scheme = forced ?? (system === 'dark' ? 'dark' : 'light');
  const reduced = useReducedMotion();
  const [loaded, error] = useFonts(
    Object.fromEntries(tokens.fontNames.map((name) => [name, fontFile(name)])),
  );
  const theme = useMemo<Theme>(
    () => ({
      scheme,
      vars: VARS[scheme],
      colors: tokens.colors[scheme],
      duration: Object.fromEntries(
        Object.entries(tokens.duration).map(([name, value]) => [name, reduced ? 0 : pixels(value)]),
      ) as Theme['duration'],
    }),
    [scheme, reduced],
  );

  // Les écrans de la navigation se posent sur `ground` : sans ce thème, la pile et les onglets
  // peignent leur blanc par défaut à chaque transition, même en sombre.
  const navigation = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const colors = tokens.colors[scheme];
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.action,
        background: colors.ground,
        card: colors.surface,
        text: colors.ink,
        border: colors.line,
        notification: colors.alert,
      },
    };
  }, [scheme]);

  return (
    <ThemeContext.Provider value={theme}>
      <ThemeProvider value={navigation}>
        <View style={[{ flex: 1 }, VARS[scheme]]} className="bg-ground">
          {forced === undefined && <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />}
          {loaded || error !== null ? children : null}
        </View>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export { tokens };
