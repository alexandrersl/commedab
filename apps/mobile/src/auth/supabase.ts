import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { config } from '../config';
import { sessionStorage } from './session-storage';

// PKCE : le retour de Google ou d'Apple ramène un code, échangé par `detectSessionInUrl` au
// chargement de la page sur le web, par `exchangeCodeForSession` en natif. Les liens des
// e-mails portent un `token_hash`, vérifié par la route `auth/confirm` (specs techniques 5.2).
export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: Platform.OS === 'web',
    persistSession: true,
    storage: sessionStorage,
    autoRefreshToken: true,
  },
});

/** Retour d'un fournisseur OAuth : la racine de l'app qui l'a demandé. */
export function oauthRedirectUrl(): string {
  return Linking.createURL('/');
}

/** Retour des liens des e-mails du compte : la route qui les vérifie. */
export function emailRedirectUrl(): string {
  return Linking.createURL('/auth/confirm');
}
