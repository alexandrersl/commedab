# Commedab

Liste de courses qui apprend les habitudes de son utilisateur : estime le stock
à partir des achats, propose ce qui va manquer. Jamais d'inventaire.

Les spécifications font foi. Avant toute décision non couverte ici, les lire :

- `docs/specs-fonctionnelles.md` (exigences EF-x.y, règles RG-x, ENF-x)
- `docs/specs-techniques.md` (sections 1 à 10)

Une règle de ce fichier qui contredit les specs est un bug de ce fichier.

## Stack

Expo (React Native, TypeScript strict, Expo Router, NativeWind), PowerSync,
Supabase (Postgres, Auth, RLS). Monorepo pnpm. Web = PWA en phase A ; iOS en
phase B. Pas de Supabase local : projet cloud `commedab-dev`.

## Structure et frontières (specs techniques 2.9, 6.1)

- `packages/core` : moteur d'estimation, types du modèle, catalogue, recherche.
  TypeScript pur. **Aucune dépendance** (ni Expo, ni React, ni PowerSync, ni
  navigateur). Toute fonction reçoit la date courante en paramètre, en heure
  locale sans fuseau ; les durées sont des jours civils (specs techniques 4.1).
- `packages/data` : schéma PowerSync, dépôts par entité, commandes,
  connecteur Supabase. Seul endroit où PowerSync et le SQL existent.
- `apps/mobile` : écrans et navigation (Expo Router, routes dans `src/app`).
  N'importe jamais PowerSync, n'écrit jamais de SQL, n'appelle Supabase que
  pour l'authentification (`src/auth`). Lire `apps/mobile/AGENTS.md` avant
  de toucher une API Expo. Une dépendance s'y ajoute par
  `pnpm exec expo install`, qui choisit la version compatible avec le SDK.
- `supabase/` : migrations, RLS, fonctions, règles de synchro.

Une dépendance ajoutée doit fonctionner sur web, iOS et Android, ou être isolée
dans `data` derrière une interface.

## Règles de données (specs techniques 3)

- Toute table métier porte `household_id` (jamais `user_id` hors
  `household_member`).
- UUID v7 générés côté client. Jamais de `DELETE` (`deleted_at`, ou
  `archived_at` pour un produit), sauf pour un achat (`stock_event`), supprimé
  pour de bon (specs techniques 3.2).
- Le stock n'est jamais stocké : il est calculé par `core` depuis `stock_event`.
- Le catalogue est un JSON dans `core`, copié dans `product` à la création,
  jamais resynchronisé.
- Un household par compte, support technique de l'auth et des RLS ; aucun
  écran ne le montre.
- Un achat créé en cochant une ligne a pour id un UUID v5 de `list_line.id` ;
  décocher le supprime. Sessions de courses, état de la liste et période sont
  calculés par `core`, jamais stockés (specs techniques 4.7).

## Moteur (specs techniques 4)

- Les fixtures `packages/core/test/fixtures/T*.json` sont la définition des
  formules. Toute modification du moteur commence par une fixture.
- Médiane des 5 derniers intervalles ; 3 achats minimum ; bornes 0,5× à 2× du
  catalogue sous 5 intervalles ; aucun ajustement explicite (RG-5).
- Seul événement : l'achat. Un ajout manuel à la liste est une ancre de stock
  à 0 (specs techniques 4.4). Rythme et stock en unités, liste en packs.
- Pas de statistique au-delà d'une médiane, pas d'apprentissage automatique.

## Interface (ENF-8)

- La Liste, le panneau Ajouter et l'onglet Produits ne montrent jamais les
  mots « rythme » ni « stock ». On dit « il t'en reste environ 2 », « proposé
  parce que tu en prends chaque semaine ».
- Un seul champ obligatoire par formulaire : le nom. Un produit sans rayon va
  dans « À classer ».
- Un geste = une action, sans confirmation (sauf la suppression du compte).
  Sur la Liste, on annule par le geste inverse (décocher), sans message
  éphémère ; ailleurs, une suppression s'annule par message éphémère.
- Une suggestion ne se refuse pas ; ignorée, elle revient.
- Tout fonctionne hors ligne ; aucune action n'attend le réseau.

## Avant chaque commit

`pnpm check` (formatage, typage, lint, tests unitaires) doit passer.
Conventional Commits.
Aucun secret dans le dépôt : `.env` est ignoré, `.env.example` est commité.

## Vocabulaire du code

Anglais, `snake_case` en base, `camelCase` en TypeScript. Tables :
`household`, `household_member`, `category`, `product`, `stock_event`,
`list_line`, `list_recipe`, `recipe`, `recipe_ingredient`. Événement :
`purchased`. Origines de ligne : `suggestion`, `manual`, `recipe`.
