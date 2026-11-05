import * as Sentry from '@sentry/react-native';
import { config } from './config';

/**
 * Erreurs de l'app envoyées à Sentry (specs techniques 9.5), sans donnée personnelle : ni
 * adresse IP, ni e-mail, ni contenu des lignes. Aucun suivi de performance ni rejeu de session :
 * seules les erreurs partent.
 */
export function startMonitoring(): void {
  if (config.sentryDsn === '') return;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.appEnv,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

/**
 * Un incident sans exception à remonter : son message seul, sans donnée de l'utilisateur. Un
 * incident par message et par contexte dans Sentry, plutôt qu'un seul pour tous.
 */
export function reportIncident(message: string, context: Record<string, unknown> = {}): void {
  Sentry.captureMessage(message, {
    level: 'error',
    extra: context,
    fingerprint: [message, ...Object.values(context).map(String)],
  });
}

export function captureError(error: unknown): void {
  Sentry.captureException(error);
}

export const withMonitoring = Sentry.wrap;
