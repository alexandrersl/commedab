# Supabase

- `migrations/` : schéma Postgres, contraintes, RLS, fonctions (specs techniques 3, 5.5, 5.6).
  Appliquées par le CLI (`supabase db push`), jamais à la main.
- `sync-rules/` : règles de synchronisation PowerSync (specs techniques 5.3),
  déployées dans la même étape que les migrations.

Pas d'instance locale : le développement utilise le projet cloud `commedab-dev`.
