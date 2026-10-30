import { Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
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
  | 'sentence'
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

function pixels(value: string): number {
  return Number.parseFloat(value);
}

/** Tailles de `tokens.json`, en points. */
export const size = Object.fromEntries(
  Object.entries(tokens.size).map(([name, value]) => [name, pixels(value)]),
) as Record<keyof typeof tokens.size, number>;

/** Zone de tap portée à `control` (44) autour d'un contrôle de `control-sm` (36) : ENF-1. */
export const HIT_SLOP = (size.control - size['control-sm']) / 2;

const VARS = {
  light: vars(
    Object.fromEntries(Object.entries(tokens.colors.light).map(([k, v]) => [`--${k}`, v])),
  ),
  dark: vars(Object.fromEntries(Object.entries(tokens.colors.dark).map(([k, v]) => [`--${k}`, v]))),
};

interface Theme {
  scheme: Scheme;
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
    Object.fromEntries(tokens.fontNames.map((name) => [name, FONT_FILES[name] ?? 0])),
  );
  const theme = useMemo<Theme>(
    () => ({
      scheme,
      colors: tokens.colors[scheme],
      duration: Object.fromEntries(
        Object.entries(tokens.duration).map(([name, value]) => [name, reduced ? 0 : pixels(value)]),
      ) as Theme['duration'],
    }),
    [scheme, reduced],
  );

  return (
    <ThemeContext.Provider value={theme}>
      <View style={[{ flex: 1 }, VARS[scheme]]} className="bg-ground">
        {forced === undefined && <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />}
        {loaded || error !== null ? children : null}
      </View>
    </ThemeContext.Provider>
  );
}

export { tokens };
