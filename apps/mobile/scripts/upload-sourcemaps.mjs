// Envoie à Sentry les source maps des bundles web de l'app (dist/_expo), pour que ses erreurs
// pointent vers le code source (specs techniques 9.5). Sans jeton (SENTRY_AUTH_TOKEN, dans
// l'environnement ou dans .env.sentry-build-plugin, ignoré par git), l'envoi est sauté : le
// déploiement continue.
//
// sentry-cli reçoit le dossier, pas la liste des fichiers : `sentry-expo-upload-sourcemaps`
// passe chaque nom en motif, ce qui perd les routes en `[id]`, et parcourt tout dist/, dont
// les workers de PowerSync, dont les source maps sans identifiant de débogage font échouer
// l'envoi.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const TOKEN_FILE = '.env.sentry-build-plugin';
const BUNDLES = 'dist/_expo/static/js/web';

const fromFile = existsSync(TOKEN_FILE)
  ? /^SENTRY_AUTH_TOKEN=(.+)$/m.exec(readFileSync(TOKEN_FILE, 'utf8'))?.[1]?.trim()
  : undefined;
const token = process.env.SENTRY_AUTH_TOKEN || fromFile;
if (!token) {
  console.warn(
    `Source maps non envoyées à Sentry : pas de SENTRY_AUTH_TOKEN (voir ${TOKEN_FILE}).`,
  );
  process.exit(0);
}

const plugin = JSON.parse(readFileSync('app.json', 'utf8')).expo.plugins.find(
  (entry) => Array.isArray(entry) && entry[0] === '@sentry/react-native/expo',
)[1];
const require = createRequire(import.meta.url);
const cli = require.resolve('@sentry/cli/bin/sentry-cli', {
  paths: [require.resolve('@sentry/react-native/package.json')],
});

const result = spawnSync(
  process.execPath,
  [cli, 'sourcemaps', 'upload', '--org', plugin.organization, '--project', plugin.project, BUNDLES],
  { stdio: 'inherit', env: { ...process.env, SENTRY_AUTH_TOKEN: token } },
);
process.exit(result.status ?? 1);
