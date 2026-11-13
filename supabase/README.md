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

## Déploiement par la CI (specs techniques 9.4)

Le flux `check` déploie après ses vérifications : la branche `main` sur l'environnement GitHub
`development`, un tag `v*` sur `production`. Dans chacun des deux environnements :

- Variables : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POWERSYNC_URL` (déjà là pour `keep-alive`),
  `SENTRY_DSN` (les valeurs publiques de `apps/mobile/.env` et `.env.production`),
  `CLOUDFLARE_ACCOUNT_ID`, et `POWERSYNC_INSTANCE_ID` : sans elle, les règles de synchro ne
  sont pas déployées.
- Secrets : `SUPABASE_DB_URL` (la chaîne « Session pooler » du projet, comme pour `backup`),
  `CLOUDFLARE_API_TOKEN` (modèle « Edit Cloudflare Workers »), `POWERSYNC_TOKEN` (jeton
  d'accès personnel PowerSync), `SENTRY_AUTH_TOKEN` (facultatif : sans lui, pas de source maps).

Mettre en production : `git tag v0.1.0 && git push origin v0.1.0`. Le flux n'applique que les
migrations et les règles de synchro ; `deploy.sh` reste à lancer à la main quand la
configuration Auth, les e-mails ou la fonction d'export changent.

## Sauvegarde et maintien en éveil (specs techniques 9.5)

Deux flux GitHub Actions planifiés, à supprimer au passage en Pro. Leurs réglages vivent dans
les environnements GitHub `development` et `production` (Settings > Environments).

- `keep-alive` (chaque jour, les deux environnements). Variables : `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `POWERSYNC_URL` (les valeurs publiques de `apps/mobile/.env` et
  `.env.production`). Secrets : `KEEPALIVE_EMAIL`, `KEEPALIVE_PASSWORD`, ceux d'un compte de
  veille créé dans chaque projet (Authentication > Users > Add user, e-mail confirmé d'office).
- `backup` (chaque dimanche, production seule). Secret `SUPABASE_DB_URL` : la chaîne de
  connexion « Session pooler » du projet (Connect > Session pooler, en IPv4), mot de passe de la
  base compris. Variables `R2_ACCOUNT_ID` et `R2_BUCKET`, secrets `R2_ACCESS_KEY_ID` et
  `R2_SECRET_ACCESS_KEY` : un jeton R2 limité à ce bucket, en lecture et écriture d'objets.

Restaurer une archive dans un projet neuf, après l'avoir décompressée :

```sh
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql --dbname "<chaîne de connexion du nouveau projet>"
```

Puis `supabase/deploy.sh <référence>` pour la configuration Auth et la fonction d'export, et le
déploiement des règles de synchro sur l'instance PowerSync branchée au nouveau projet.
