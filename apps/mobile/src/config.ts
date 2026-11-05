function required(name: string, value: string | undefined): string {
  if (value === undefined || value === '') {
    throw new Error(`${name} manquant : voir apps/mobile/.env.example`);
  }
  return value;
}

// Expo ne remplace que les accès littéraux à `process.env.EXPO_PUBLIC_*` au build.
export const config = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  powersyncUrl: required('EXPO_PUBLIC_POWERSYNC_URL', process.env.EXPO_PUBLIC_POWERSYNC_URL),
  /** Vide : aucune erreur n'est envoyée (développement sans compte Sentry). */
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'dev',
};
