// « Exporter mes données » (EF-5.5, specs techniques 5.6) : lit sous RLS, avec le JWT de la
// session, les données du household et les envoie en JSON à l'adresse du compte, par Resend.
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';
import { createClient } from 'npm:@supabase/supabase-js@2';

const TABLES: readonly [table: string, key: string, order: string][] = [
  ['category', 'categories', 'position'],
  ['product', 'products', 'name_normalized'],
  ['stock_event', 'purchases', 'occurred_at'],
  ['recipe', 'recipes', 'name'],
  ['recipe_ingredient', 'recipe_ingredients', 'created_at'],
  ['list_line', 'list_lines', 'created_at'],
  ['list_recipe', 'list_recipes', 'created_at'],
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function env(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined || value === '') throw new Error(`${name} manquant`);
  return value;
}

function withoutHousehold(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(({ household_id: _, ...row }) => row);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return reply(405, { error: 'POST attendu' });

  const authorization = request.headers.get('Authorization');
  if (authorization === null) return reply(401, { error: 'Session attendue' });
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
  });
  const { data: user, error: userError } = await client.auth.getUser();
  if (userError !== null || user.user.email === undefined) {
    return reply(401, { error: 'Session invalide' });
  }

  const exported: Record<string, unknown> = { exported_at: new Date().toISOString() };
  for (const [table, key, order] of TABLES) {
    const { data, error } = await client.from(table).select('*').order(order);
    if (error !== null) return reply(500, { error: `Lecture de ${table} impossible` });
    exported[key] = withoutHousehold(data);
  }

  const day = new Date().toISOString().slice(0, 10);
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Commedab <${env('SMTP_SENDER_EMAIL')}>`,
      to: [user.user.email],
      subject: 'Tes données Commedab',
      text: "Voici tes données Commedab en pièce jointe : tes produits, tes achats, tes recettes, ta liste et l'ordre de tes rayons. Le fichier se lit sans l'application.",
      attachments: [
        {
          filename: `commedab-${day}.json`,
          content: encodeBase64(JSON.stringify(exported, null, 2)),
        },
      ],
    }),
  });
  if (!sent.ok) return reply(502, { error: 'Envoi de l’e-mail impossible' });
  return reply(202, { sent: true });
});
