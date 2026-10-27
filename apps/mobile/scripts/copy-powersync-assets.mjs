// Copie les workers du SDK web de PowerSync, que Metro ne sait pas empaqueter, dans
// public/powersync. Pas de « @ » dans le chemin : Cloudflare redirige /@… vers /%40….
import { cpSync, rmSync } from 'node:fs';
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
