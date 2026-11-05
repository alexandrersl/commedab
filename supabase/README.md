# Supabase

- `migrations/` : schéma Postgres, contraintes, RLS, fonctions (specs techniques 3, 5.5, 5.6).
  Appliquées par le CLI (`supabase db push`), jamais à la main.
- `sync-streams/` : règles de synchronisation PowerSync, en Sync Streams (specs techniques 5.3),
  déployées dans la même étape que les migrations.

Pas d'instance locale : le développement utilise le projet cloud `commedab-dev`.

- `config.toml` : configuration de l'authentification (fournisseurs, URL de redirection, liens
  d'une heure, SMTP Resend) et des fonctions, appliquée par `supabase config push` (5.2).
- `templates/` : e-mails du compte dans la voix de l'application (EF-5.11).
- `functions/export-data/` : export des données envoyé par e-mail (5.6), déployé par
  `supabase functions deploy export-data`.
- `.env.example` : secrets attendus ; copié en `supabase/.env`, jamais commité.
- `deploy.sh <référence>` : migrations, configuration Auth, fonction d'export et ses secrets,
  appliqués au projet `commedab-prod` (`stxqttrhkvvlgnywgevr`) ou `commedab-dev`
  (`crflkgpbfapygnsgpvgm`). `config.toml` décrit la production ; `[remotes.development]` ne
  change que les adresses du développement : `dev.commedab.app` et `localhost:8081`
  (specs techniques 9.3).
