# Commedab

Liste de courses qui apprend les habitudes du foyer : estime le stock à partir
des achats, propose ce qui va manquer. Jamais d'inventaire.

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
- `apps/mobile` : écrans et navigation. N'importe jamais PowerSync, n'écrit
  jamais de SQL, n'appelle Supabase que pour l'authentification.
- `supabase/` : migrations, RLS, fonctions, règles de synchro.

Une dépendance ajoutée doit fonctionner sur web, iOS et Android, ou être isolée
dans `data` derrière une interface.

## Règles de données (specs techniques 3)

- Toute table métier porte `household_id` (jamais `user_id` hors
  `household_member`).
- UUID v7 générés côté client. Jamais de `DELETE` : `deleted_at`.
- Le stock n'est jamais stocké : il est calculé par `core` depuis `stock_event`.
- Le catalogue est un JSON dans `core`, copié dans `product` à la création,
  jamais resynchronisé.
- Un événement d'achat créé à la clôture a pour id un UUID v5 de `list_line.id`.

## Moteur (specs techniques 4)

- Les fixtures `packages/core/test/fixtures/T*.json` sont la définition des
  formules. Toute modification du moteur commence par une fixture.
- Médiane des 5 derniers intervalles ; 3 achats minimum ; bornes 0,5× à 2× de
  la référence sous 5 intervalles ; aucun ajustement explicite (RG-5).
- Pas de statistique au-delà d'une médiane, pas d'apprentissage automatique.

## Interface (ENF-8)

- Les écrans Liste et Accueil ne montrent jamais les mots « rythme »,
  « famille », « stock ». On dit « il t'en reste environ 2 », « proposé parce
  que tu en prends chaque semaine ».
- Un seul champ obligatoire par formulaire (le nom ; la catégorie pour un
  produit, différable).
- Un geste = une action, sans confirmation, avec annulation par message
  éphémère. « Fini » prend la date du jour ; la date n'est jamais demandée.
- Tout fonctionne hors ligne ; aucune action n'attend le réseau.

## Avant chaque commit

`pnpm check` (formatage, typage, lint, tests unitaires) doit passer.
Conventional Commits.
Aucun secret dans le dépôt : `.env` est ignoré, `.env.example` est commité.

## Vocabulaire du code

Anglais, `snake_case` en base, `camelCase` en TypeScript. Tables :
`household`, `household_member`, `category`, `product`, `stock_event`,
`shopping_list`, `list_line`, `recipe`, `recipe_ingredient`. Événements :
`purchased`, `opened_last`, `finished`, `counted`. Familles : `rhythm`,
`reserve`, `occasional`.
