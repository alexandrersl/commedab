// Service worker de la PWA (specs techniques 6.4), écrit dans dist/ après `expo export` avec la
// liste des fichiers du build : l'app se lance sans réseau, en magasin. Les données n'y passent
// pas, elles sont dans SQLite (OPFS) ; Supabase et PowerSync, sur d'autres domaines, ne sont
// jamais interceptés.
//
// À l'installation, tout le build est mis en cache, sauf les source maps et les variantes de
// SQLite inutiles (chiffrement `mc-`, versions asynchrones pour IndexedDB : la base est en
// OPFSCoopSyncVFS). Un fichier du site absent du cache y entre à sa première lecture. Une
// navigation reçoit toujours la page de l'app en cache ; une nouvelle version s'installe à la
// navigation suivante, prend la main aussitôt et la page se recharge.
//
// Pendant un déploiement, le serveur peut rendre un instant le nouveau service worker avec la
// page d'accueil du build précédent, dont il ne sert plus les scripts : l'app resterait blanche
// jusqu'au déploiement suivant. L'installation relit donc chaque fichier sur le réseau
// (`cache: 'reload'`) et échoue si la page ne désigne pas les scripts de ce build ; elle
// reprendra à la navigation suivante, l'ancienne version servant d'ici là. Pour la même
// raison, la page que le serveur rend à la place d'un fichier absent n'entre jamais dans le
// cache.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const SKIP = [/\.map$/, /^metadata\.json$/, /(^|\/)mc-wa-sqlite/, /wa-sqlite-async/, /^sw\.js$/];

function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesIn(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const paths = filesIn(DIST)
  .map((file) => relative(DIST, file).split(sep).join('/'))
  .filter((path) => !SKIP.some((pattern) => pattern.test(path)))
  .sort();

const hash = createHash('sha256');
for (const path of paths) hash.update(path).update(readFileSync(join(DIST, path)));
const version = hash.digest('hex').slice(0, 12);

// La page est servie sous `/` : `/index.html` redirige, et une réponse redirigée ne sert pas
// une navigation.
const urls = paths.map((path) => (path === 'index.html' ? '/' : `/${path}`));

const worker = `// Généré par scripts/service-worker.mjs.
const CACHE = 'commedab-${version}';
const PRECACHE = ${JSON.stringify(urls)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
        const page = await cache.match('/');
        const scripts = (await page.text()).match(new RegExp('/_expo/static/[^"]+[.]js', 'g')) || [];
        if (!scripts.every((script) => PRECACHE.includes(script))) {
          await caches.delete(CACHE);
          throw new Error("Page d'accueil d'un autre build");
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('commedab-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('.map')) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('/').then((page) => page || fetch(request)));
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      const type = response.headers.get('Content-Type') || '';
      if (response.ok && !type.includes('text/html')) await cache.put(request, response.clone());
      return response;
    }),
  );
});
`;

writeFileSync(join(DIST, 'sw.js'), worker);
console.log(`Service worker écrit : ${urls.length} fichiers en cache (version ${version}).`);
