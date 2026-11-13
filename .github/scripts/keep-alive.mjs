// Maintien en éveil d'un environnement gratuit (specs techniques 9.5) : une session du compte de
// veille, une lecture en base par l'API Supabase, puis une connexion de client à PowerSync.
// Supabase compte les requêtes en base, PowerSync les connexions de clients : une simple requête
// HTTP sans session ne suffit ni à l'un ni à l'autre.

const need = (name) => {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`Variable ${name} absente`);
  return value;
};

const supabaseUrl = need('SUPABASE_URL').replace(/\/$/, '');
const anonKey = need('SUPABASE_ANON_KEY');
const powersyncUrl = need('POWERSYNC_URL').replace(/\/$/, '');
const email = need('KEEPALIVE_EMAIL');
const password = need('KEEPALIVE_PASSWORD');

const TIMEOUT_MS = 30_000;

async function request(label, url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`${label} : HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  return response;
}

const session = await request('Session', `${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anonKey, 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { access_token: token } = await session.json();
if (typeof token !== 'string') throw new Error('Session : pas de jeton dans la réponse');
console.log('Supabase : session ouverte');

await request('Lecture', `${supabaseUrl}/rest/v1/category?select=id&limit=1`, {
  headers: { apikey: anonKey, authorization: `Bearer ${token}` },
});
console.log('Supabase : lecture en base faite');

// Le flux reste ouvert tant que le client écoute : la première ligne reçue prouve la connexion.
const stream = await request('Synchro', `${powersyncUrl}/sync/stream`, {
  method: 'POST',
  headers: {
    authorization: `Token ${token}`,
    'content-type': 'application/json',
    accept: 'application/x-ndjson',
  },
  body: JSON.stringify({
    buckets: [],
    include_checksum: true,
    raw_data: true,
    client_id: 'keep-alive',
  }),
});
const reader = stream.body.getReader();
const { done } = await reader.read();
await reader.cancel();
if (done) throw new Error('Synchro : flux fermé sans rien envoyer');
console.log('PowerSync : client connecté');
