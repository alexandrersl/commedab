import { isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js';
import { redirectUrl, supabase } from './supabase';

export const PASSWORD_MIN_LENGTH = 10;

/** Échec rendu à l'écran, en français ; `null` quand l'action a réussi. */
export type AuthFailure = string | null;

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  user_already_exists: 'Un compte existe déjà avec cet e-mail.',
  email_exists: 'Un compte existe déjà avec cet e-mail.',
  email_address_invalid: 'Cette adresse e-mail n’est pas valide.',
  email_not_confirmed: 'Ouvre d’abord le lien de confirmation reçu par e-mail.',
  weak_password: `Mot de passe trop faible : ${PASSWORD_MIN_LENGTH} caractères minimum, et pas un mot de passe courant.`,
  same_password: 'Choisis un mot de passe différent de l’actuel.',
  over_email_send_rate_limit: 'Trop d’e-mails envoyés : réessaie dans quelques minutes.',
  over_request_rate_limit: 'Trop de tentatives : réessaie dans quelques minutes.',
};

function failure(error: AuthError | null): AuthFailure {
  if (error === null) return null;
  if (isAuthRetryableFetchError(error)) return 'Pas de connexion : réessaie une fois en ligne.';
  return (error.code !== undefined && MESSAGES[error.code]) || 'Ça n’a pas marché : réessaie.';
}

function passwordFailure(password: string): AuthFailure {
  return password.length < PASSWORD_MIN_LENGTH
    ? `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`
    : null;
}

export async function signIn(email: string, password: string): Promise<AuthFailure> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return failure(error);
}

/** Rend `confirm` quand Supabase attend la confirmation de l'adresse avant d'ouvrir la session. */
export async function signUp(
  email: string,
  password: string,
): Promise<{ failure: AuthFailure; confirm: boolean }> {
  const invalid = passwordFailure(password);
  if (invalid !== null) return { failure: invalid, confirm: false };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: redirectUrl() },
  });
  return { failure: failure(error), confirm: error === null && data.session === null };
}

/** Quitte la page pour Google, qui y ramène avec la session (web). */
export async function signInWithGoogle(): Promise<AuthFailure> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  });
  return failure(error);
}

export async function sendPasswordReset(email: string): Promise<AuthFailure> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectUrl(),
  });
  return failure(error);
}

export async function setPassword(password: string): Promise<AuthFailure> {
  const invalid = passwordFailure(password);
  if (invalid !== null) return invalid;
  const { error } = await supabase.auth.updateUser({ password });
  return failure(error);
}

/** Déconnecte cet appareil seulement ; la base locale est vidée par `AppDataProvider`. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}
