import {
  isAuthRetryableFetchError,
  type AuthError,
  type EmailOtpType,
} from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { emailRedirectUrl, oauthRedirectUrl, supabase } from './supabase';

export const PASSWORD_MIN_LENGTH = 8;

/** Échec rendu à l'écran, en français ; `null` quand l'action a réussi. */
export type AuthFailure = string | null;

export type Provider = 'google' | 'apple';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou mot de passe incorrect',
  user_already_exists: 'Un compte existe déjà avec cet e-mail.',
  email_exists: 'Un compte existe déjà avec cet e-mail.',
  email_address_invalid: "Cette adresse n'a pas l'air complète",
  weak_password: 'Celui-ci est trop courant, choisis-en un autre.',
  same_password: "C'est déjà ton mot de passe : choisis-en un autre.",
  over_email_send_rate_limit: 'Un e-mail vient de partir : attends une minute avant le suivant.',
  over_request_rate_limit: 'Trop de tentatives : réessaie dans quelques minutes.',
};

const OFFLINE = 'Pas de connexion : réessaie une fois en ligne.';
const UNKNOWN = "Ça n'a pas marché : réessaie.";

function failure(error: AuthError | null): AuthFailure {
  if (error === null) return null;
  if (isAuthRetryableFetchError(error)) return OFFLINE;
  return (error.code !== undefined && MESSAGES[error.code]) || UNKNOWN;
}

/** Vérification avant envoi : une adresse avec un @ et un point après (EF-5.10). */
export function emailFailure(email: string): AuthFailure {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? null
    : "Cette adresse n'a pas l'air complète";
}

export function passwordFailure(password: string): AuthFailure {
  return password.length < PASSWORD_MIN_LENGTH ? `${PASSWORD_MIN_LENGTH} caractères minimum` : null;
}

/** Apple n'est proposé que dans l'application native (EF-5.8). */
export const PROVIDERS: readonly Provider[] =
  Platform.OS === 'web' ? ['google'] : ['google', 'apple'];

/** `unconfirmed` : l'adresse attend encore son lien de confirmation (EF-5.8). */
export async function signIn(
  email: string,
  password: string,
): Promise<{ failure: AuthFailure; unconfirmed: boolean }> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error?.code === 'email_not_confirmed') return { failure: null, unconfirmed: true };
  return { failure: failure(error), unconfirmed: false };
}

/** Rend `confirm` quand Supabase attend la confirmation de l'adresse avant d'ouvrir la session. */
export async function signUp(
  email: string,
  password: string,
): Promise<{ failure: AuthFailure; confirm: boolean }> {
  const invalid = emailFailure(email) ?? passwordFailure(password);
  if (invalid !== null) return { failure: invalid, confirm: false };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: emailRedirectUrl() },
  });
  return { failure: failure(error), confirm: error === null && data.session === null };
}

export async function resendConfirmation(email: string): Promise<AuthFailure> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: emailRedirectUrl() },
  });
  return failure(error);
}

/**
 * Google ou Apple. Sur le web, la page part chez le fournisseur, qui y ramène avec la session ;
 * en natif, une session de navigateur rend le code, échangé ici.
 */
export async function signInWithProvider(provider: Provider): Promise<AuthFailure> {
  const redirectTo = oauthRedirectUrl();
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    return failure(error);
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error !== null) return failure(error);
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;
  const code = new URL(result.url).searchParams.get('code');
  if (code === null) return UNKNOWN;
  const exchange = await supabase.auth.exchangeCodeForSession(code);
  return failure(exchange.error);
}

/** Même réponse que l'adresse ait un compte ou non (EF-5.10). */
export async function sendPasswordReset(email: string): Promise<AuthFailure> {
  const invalid = emailFailure(email);
  if (invalid !== null) return invalid;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: emailRedirectUrl(),
  });
  return failure(error);
}

export async function setPassword(password: string): Promise<AuthFailure> {
  const invalid = passwordFailure(password);
  if (invalid !== null) return invalid;
  const { error } = await supabase.auth.updateUser({ password });
  return failure(error);
}

/**
 * Lien d'un e-mail du compte (specs techniques 5.2) : vérifie son `token_hash`. Faux quand le
 * lien a expiré ou a déjà servi.
 */
export async function verifyEmailLink(tokenHash: string, type: string): Promise<boolean> {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });
  return error === null;
}

/** Déconnecte cet appareil seulement ; la base locale est vidée par `AppDataProvider`. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}
