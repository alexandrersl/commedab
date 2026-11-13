import * as Sentry from '@sentry/react-native';
import { config } from './config';

/**
 * Erreurs de l'app envoyées à Sentry (specs techniques 9.5), sans donnée personnelle : ni
 * adresse IP, ni e-mail, ni contenu des lignes. Aucun suivi de performance, de session ni rejeu :
 * seules les erreurs partent. Les adresses de page perdent leurs paramètres, qui portent
 * l'e-mail (« Vérifie ta boîte mail ») ou un jeton (lien de confirmation).
 */
export function startMonitoring(): void {
  if (config.sentryDsn === '') return;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.appEnv,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableAutoSessionTracking: false,
    beforeSend(event) {
      if (event.request?.url !== undefined) event.request.url = barePath(event.request.url);
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      for (const key of ['url', 'from', 'to']) {
        const value: unknown = breadcrumb.data?.[key];
        if (breadcrumb.data !== undefined && typeof value === 'string') {
          breadcrumb.data[key] = barePath(value);
        }
      }
      return breadcrumb;
    },
  });
}

function barePath(url: string): string {
  return url.split(/[?#]/)[0] ?? url;
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
