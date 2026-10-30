// Fichiers de la PWA que Metro ne produit pas, écrits dans public/ avant le build web :
// - les workers du SDK web de PowerSync, que Metro ne sait pas empaqueter, dans
//   public/powersync (pas de « @ » dans le chemin : Cloudflare redirige /@… vers /%40…) ;
// - le manifeste, dont les couleurs viennent de docs/design/tokens.json (specs techniques 11.1).
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const requireFromData = createRequire(join(here, '../../../packages/data/package.json'));
const source = dirname(requireFromData.resolve('@powersync/web/bundled_worker'));
const target = join(here, '../public/powersync');

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`Workers PowerSync copiés dans ${target}`);

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
  icons: [{ src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
};
writeFileSync(
  join(here, '../public/manifest.webmanifest'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log('Manifeste écrit dans public/manifest.webmanifest');
