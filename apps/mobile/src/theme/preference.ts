import * as SecureStore from 'expo-secure-store';

/** Thème choisi dans les Réglages ; `system` suit l'appareil (ENF-9). */
export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'commedab.theme';

function parse(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** Natif : la préférence est gardée sur l'appareil, hors de toute session. */
export async function loadThemePreference(): Promise<ThemePreference> {
  return parse(await SecureStore.getItemAsync(KEY));
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await SecureStore.setItemAsync(KEY, preference);
}
