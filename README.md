# Commedab

**La liste de courses qui apprend tes habitudes.** Elle estime ce qu'il te
reste à partir de tes achats et propose ce qui va manquer. Pas d'inventaire,
pas de stock à saisir : tu valides tes courses, elle fait le reste.

> Comme d'hab — a grocery list that learns your habits and suggests what's
> about to run out, no inventory needed.

## Le problème

Les apps de liste de courses partent d'une liste vide à remplir de mémoire.
Les apps de gestion de stock exigent un inventaire initial et une mise à jour
permanente, que tout le monde abandonne au bout de deux semaines.

## L'approche

- **Le stock est estimé, jamais saisi.** Chaque liste validée enregistre des
  achats datés ; un rythme de consommation par produit, appris ou déclaré,
  donne le stock probable.
- **Une période de couverture.** « Pour combien de jours ? » : la liste est
  calculée pour un jour ou pour un mois.
- **Des recettes nettes du stock.** Ajouter une recette n'ajoute que ce qui
  manque.
- **Simple par défaut.** Utilisable comme une liste ordinaire ; les
  suggestions arrivent toutes seules au fil des courses.

## Stack

| Couche              | Choix                                                    |
| ------------------- | -------------------------------------------------------- |
| Application         | Expo (React Native, TypeScript), Expo Router, NativeWind |
| Données locales     | SQLite (op-sqlite sur mobile, wa-sqlite/OPFS sur web)    |
| Synchronisation     | PowerSync                                                |
| Backend             | Supabase (Postgres, Auth, RLS)                           |
| Moteur d'estimation | TypeScript pur, sans dépendance, testé par fixtures      |

Livraison en trois phases à partir du même code : PWA, puis iOS natif, puis
stores. Détails dans [`docs/specs-techniques.md`](docs/specs-techniques.md).

## Documentation

- [Spécifications fonctionnelles](docs/specs-fonctionnelles.md)
- [Spécifications techniques](docs/specs-techniques.md)
- [Étude de marché](docs/etude-de-marche.md)

## Démarrer

Prérequis : Node 22, pnpm 12.

```sh
pnpm install
cp .env.example .env     # puis renseigner les valeurs publiques
pnpm check               # formatage, typage, lint, tests — doit passer avant chaque commit
```

Lancer l'application en local (web) :

```sh
pnpm --filter @commedab/mobile web
```

## Structure

```
apps/mobile      application Expo : écrans, navigation, PWA
packages/core    moteur d'estimation, modèle, catalogue, recherche — TypeScript pur, zéro dépendance
packages/data    schéma PowerSync, dépôts par entité, connecteur Supabase
supabase/        migrations, RLS, fonctions, règles de synchronisation
docs/            spécifications
```

## Licence

[AGPL-3.0](LICENSE). Le nom et le logo ne sont pas couverts par la licence.
