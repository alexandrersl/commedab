// Fichiers de la PWA que Metro ne produit pas, écrits dans public/ avant le build web :
// - les workers du SDK web de PowerSync, que Metro ne sait pas empaqueter, dans
//   public/powersync (pas de « @ » dans le chemin : Cloudflare redirige /@… vers /%40…) ;
// - les icônes de la PWA, copiées d'assets/brand (voir son README) dans public/brand ;
// - le manifeste, dont les couleurs viennent de docs/design/tokens.json (specs techniques 11.1) ;
// - theme.css, le fond `ground` de la page selon le thème du système, ou celui choisi dans les
//   Réglages (`data-theme`, posé par index.html), avant que l'app ne se peigne : sans lui, la
//   page reste blanche le temps du chargement, même en sombre.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const requireFromData = createRequire(join(here, '../../../packages/data/package.json'));
const source = dirname(requireFromData.resolve('@powersync/web/bundled_worker'));
const target = join(here, '../public/powersync');

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`Workers PowerSync copiés dans ${target}`);

const brand = join(here, '../../../assets/brand');
const icons = join(here, '../public/brand');
rmSync(icons, { recursive: true, force: true });
for (const file of [
  'png/pwa-192.png',
  'png/pwa-512.png',
  'png/pwa-maskable-512.png',
  'png/apple-touch-icon-180.png',
  'svg/favicon.svg',
]) {
  cpSync(join(brand, file), join(icons, basename(file)));
}
console.log(`Icônes de la PWA copiées dans ${icons}`);

const tokens = createRequire(import.meta.url)('../src/theme/tokens.cjs');
const manifest = {
  name: 'Commedab',
  short_name: 'Commedab',
  lang: 'fr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: tokens.colors.light.ground,
  theme_color: tokens.colors.light.ground,
  icons: [
    { src: '/brand/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/brand/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    {
      src: '/brand/pwa-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
writeFileSync(
  join(here, '../public/manifest.webmanifest'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log('Manifeste écrit dans public/manifest.webmanifest');

const theme = `/* Généré par scripts/web-assets.mjs depuis docs/design/tokens.json. */
:root {
  color-scheme: light dark;
}
html,
body {
  background-color: ${tokens.colors.light.ground};
}
@media (prefers-color-scheme: dark) {
  html,
  body {
    background-color: ${tokens.colors.dark.ground};
  }
}
html[data-theme='light'],
html[data-theme='light'] body {
  color-scheme: light;
  background-color: ${tokens.colors.light.ground};
}
html[data-theme='dark'],
html[data-theme='dark'] body {
  color-scheme: dark;
  background-color: ${tokens.colors.dark.ground};
}
`;
writeFileSync(join(here, '../public/theme.css'), theme);
console.log('Fond de page écrit dans public/theme.css');
