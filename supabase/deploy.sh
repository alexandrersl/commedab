#!/usr/bin/env bash
# Déploie un projet Supabase depuis le dépôt (specs techniques 9.2, 9.4) : migrations,
# configuration Auth (config.toml, avec [remotes.*] pour le développement), fonction d'export
# et ses secrets. Usage : supabase/deploy.sh <référence du projet>
#
# Les secrets viennent de supabase/.env (voir .env.example), jamais du dépôt. Les commandes
# écrivent sur le projet distant ; --yes répond aux confirmations de la CLI.
set -euo pipefail

ref="${1:?Usage : supabase/deploy.sh <référence du projet>}"
cd "$(dirname "$0")/.."

set -a
# shellcheck source=/dev/null
. supabase/.env
set +a

npx supabase db push --remote="$ref" --yes
npx supabase config push --remote="$ref" --yes
npx supabase functions deploy export-data --remote="$ref" --use-api --yes

# La fonction d'export n'a besoin que de la clé Resend et de l'adresse d'envoi.
secrets="$(mktemp)"
trap 'rm -f "$secrets"' EXIT
chmod 600 "$secrets"
grep -E '^(RESEND_API_KEY|SMTP_SENDER_EMAIL)=' supabase/.env > "$secrets"
npx supabase secrets set --env-file "$secrets" --remote="$ref" --yes
