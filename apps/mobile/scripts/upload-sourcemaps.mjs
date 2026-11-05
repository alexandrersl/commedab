// Envoie à Sentry les source maps du build web (dist/), pour que ses erreurs pointent vers le
// code source (specs techniques 9.5). Sans jeton (SENTRY_AUTH_TOKEN, dans l'environnement ou
// dans .env.sentry-build-plugin, ignoré par git), l'envoi est sauté : le déploiement continue.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const TOKEN_FILE = '.env.sentry-build-plugin';
const hasToken =
  Boolean(process.env.SENTRY_AUTH_TOKEN) ||
  (existsSync(TOKEN_FILE) && /^SENTRY_AUTH_TOKEN=.+/m.test(readFileSync(TOKEN_FILE, 'utf8')));

if (!hasToken) {
  console.warn(
    `Source maps non envoyées à Sentry : pas de SENTRY_AUTH_TOKEN (voir ${TOKEN_FILE}).`,
  );
  process.exit(0);
}
const result = spawnSync('sentry-expo-upload-sourcemaps', ['dist'], {
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 1);
