import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { config } from '../config';

// PKCE : les liens des e-mails et le retour de Google ramènent un code, échangé par
// `detectSessionInUrl` au chargement de la page.
export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

/** Adresse de retour des e-mails et de Google : la racine de l'app qui les a demandés. */
export function redirectUrl(): string {
  return Linking.createURL('/');
}
