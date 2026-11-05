import type { ThemePreference } from './preference';

export type { ThemePreference } from './preference';

// Même clé que le script de public/index.html, qui pose `data-theme` avant le premier rendu.
const KEY = 'commedab.theme';

function parse(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** Le fond de la page (theme.css) suit `data-theme` quand le thème est forcé. */
function mark(preference: ThemePreference): void {
  if (preference === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = preference;
}

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    return parse(localStorage.getItem(KEY));
  } catch {
    return 'system';
  }
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  mark(preference);
  try {
    if (preference === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, preference);
  } catch {
    // Sans stockage, le choix vaut jusqu'à la fermeture de la page.
  }
}
