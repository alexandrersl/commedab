# Commedab — Spécifications techniques

## Objet et statut

Ce document fixe les choix techniques de l'application décrite dans les spécifications fonctionnelles v1 (MVP pour un utilisateur, stock estimé sans inventaire) et éclairée par l'étude de marché. Il est rédigé décision par décision, dans l'ordre où elles se contraignent ; chaque section porte un statut.

Contraintes de départ, indépendantes des choix :

- Projet personnel, développé seul, entièrement avec Claude et Claude Code : les technologies retenues doivent être mainstream et bien documentées, les compétences préalables de l'auteur n'entrent pas en ligne de compte.
- Test sur plusieurs semaines sur un iPhone, sans dépense tant que l'application n'est pas jugée satisfaisante.
- Un Mac peut être obtenu pour les builds iOS.
- Mode hors ligne en magasin obligatoire (ENF-2), réactivité en un geste (ENF-3).

| Section | Statut |
| --- | --- |
| 1. Cible et plan de livraison | Décidé |
| 2. Architecture des données | Décidé |
| 3. Modèle de données | Validé |
| 4. Moteur d'estimation | Décidé |
| 5. API et synchronisation | Décidé |
| 6. Frontend | Décidé |
| 7. Catalogue par défaut | Décidé |
| 8. Sécurité et données personnelles | Décidé |
| 9. Qualité, CI/CD, exploitation | Décidé |
| 10. Contraintes pour les évolutions | Validé |
| 11. Design system | Décidé |

## 1. Cible et plan de livraison

**Statut : décidé le 16/10/2026.**

### 1.1 Décision

L'application est développée avec **Expo (React Native)** en TypeScript, avec la cible web activée, et livrée en trois phases à partir du même code.

```
Phase A · PWA ──(usage quotidien satisfaisant ; 99 €/an, un Mac)──▶ Phase B · Natif iOS ──(app jugée satisfaisante ; revue Apple)──▶ Phase C · App Store
Expo web sur l'écran d'accueil        Build iOS du même code, TestFlight          Publication, puis Android,
usage quotidien, coût zéro            persistance native, widgets                 notifications ; web gardé en accès secondaire
```

La phase A sert à valider l'usage sans dépense ; la phase B n'est engagée que lorsque l'usage quotidien a confirmé les objectifs du MVP (2.4 FS) ; la phase C ouvre à d'autres utilisateurs.

### 1.2 Options écartées

| Option | Raison du rejet |
| --- | --- |
| PWA seule (framework web classique) | Plafonne sur iPhone : pas d'invite d'installation, cache hors ligne purgé après une semaine sans ouverture, ni widget ni montre, notifications sous conditions. Aurait imposé une réécriture pour le natif. |
| Natif pur (Swift, puis Kotlin) | Deux bases de code, et aucun chemin gratuit pour tester plusieurs semaines sur iPhone sans le programme développeur. |
| Flutter | Bon natif, mais cible web faible, et écosystème moins favorable au développement assisté. |
| Capacitor (web dans une coque native) | Expérience web en magasin ; n'apporte rien que la cible web d'Expo ne donne déjà. |

### 1.3 Pourquoi Expo

- Expo est devenu la voie standard de React Native ; l'écosystème est stable et mainstream, ce qui compte pour un projet développé avec un agent.
- Un seul code pour web, iOS et Android ; la cible web permet la phase A sans compte Apple ni Mac.
- Navigation native avec Expo Router dès la phase B. Les composants Expo UI (SwiftUI, Compose) sont natifs seulement : ils pourront enrichir la phase B, mais le MVP se construit sur les primitives React Native, communes aux trois cibles (6.1).
- Builds iOS possibles en local sur Mac ou dans le cloud (EAS) une fois le compte développeur ouvert.

### 1.4 Phase A : PWA

- Sortie web d'Expo déployée sur un hébergement statique, ajoutée à l'écran d'accueil de l'iPhone depuis Safari.
- Manifeste et service worker à configurer explicitement : Expo web ne les génère pas seul (point à traiter en section 6).
- Contraintes connues et acceptées : pas de widget, pas de notification, cache hors ligne purgé après sept jours sans ouverture (sans effet en usage quotidien), stockage local soumis aux limites du navigateur.
- Critère de sortie : objectifs des spécifications fonctionnelles (2.4) atteints à l'usage, sur plusieurs semaines de courses réelles, et satisfaction générale.

### 1.5 Phase B : natif iOS

- Ouverture du compte Apple Developer (99 €/an) ; obtention d'un Mac pour les builds locaux et Xcode, EAS en secours.
- Build iOS du même code, distribution par TestFlight.
- Le stockage local bascule sur SQLite natif via l'abstraction prévue en section 2 ; aucun écran n'est réécrit.

### 1.6 Phase C : store et au-delà

- Publication sur l'App Store, puis Google Play (25 $ une fois).
- Les évolutions hors MVP qui dépendent du natif (notifications, widgets, code-barres) ne commencent qu'ici.
- La version web reste maintenue comme accès secondaire (ordinateur, cuisine).

### 1.7 Conséquences pour les sections suivantes

- Le moteur d'estimation, le modèle et le catalogue vivent dans un paquet TypeScript pur, sans dépendance à Expo ni au navigateur, testable en ligne de commande (sections 3 et 4).
- Le stockage local est abstrait derrière une interface unique avec deux implémentations, web et natif (section 2).
- Toute dépendance tierce doit fonctionner sur les trois cibles ou être isolée derrière la même abstraction (section 6).

## 2. Architecture des données

**Statut : décidé le 19/10/2026.**

### 2.1 Décision

Le serveur est la source de vérité (serveur-first), mais l'application ne lui parle jamais directement : elle lit et écrit dans une base SQLite locale, réplique des données du compte, qu'un moteur de synchronisation tient à jour dans les deux sens. Un compte utilisateur existe dès le MVP.

```
App Expo  ◀──▶  SQLite local  ◀──▶  Moteur de synchro  ◀──▶  Supabase
écrans,         réplique du         PowerSync,               Postgres (référence),
moteur TS pur   household,          règles par household,    Auth, RLS par household,
web/iOS/Android écritures en file   pousse / tire / rejoue   fonctions serveur
────────────── tout est rattaché à un household, un par compte au MVP ──────────────
```

Ce modèle « réplique locale, autorité serveur » répond aux trois exigences à la fois : hors ligne en magasin (la lecture et l'écriture sont locales), réactivité en un geste (aucun aller-retour réseau), et structure long terme (le multi-appareil, et plus tard le partage d'une liste, sont le fonctionnement normal du moteur, pas une fonctionnalité à ajouter).

### 2.2 Composants retenus

| Composant | Choix | Rôle |
| --- | --- | --- |
| Base serveur | PostgreSQL via Supabase | Source de vérité, schéma relationnel, Row Level Security par household |
| Authentification | Supabase Auth | Compte par e-mail et mot de passe, Google, ou Apple en phase B (5.2) ; le household n'est pas dans le JWT, les règles de synchro le résolvent par `household_member` |
| Synchronisation | PowerSync | Réplique Postgres vers SQLite sur l'appareil, file d'écritures hors ligne rejouée à la reconnexion, règles de synchro limitant chaque appareil aux données de son household |
| Base locale | SQLite : pilote natif du SDK PowerSync React Native (op-sqlite) sur iOS et Android, wa-sqlite sur OPFS pour le web | Lecture et écriture de l'app, requêtes SQL, réactivité |
| Logique serveur | Fonctions Postgres et Supabase Edge Functions, uniquement si nécessaire | Validation d'écritures, tâches planifiées, futur import de commandes |

### 2.3 Options écartées

| Option | Raison du rejet |
| --- | --- |
| API REST classique avec cache hors ligne et file d'attente maison | C'est la voie la plus longue : il faut écrire et tester soi-même la file, la reprise, les conflits ; le partage temps réel devient un second chantier. Les moteurs de synchro ont rendu ce travail inutile. |
| Local-first sans serveur au MVP (export JSON) | Écarté par choix : structure long terme voulue dès le départ, et un changement de téléphone ne doit pas perdre l'historique qui fait la valeur de l'app. |
| Firebase Firestore | Hors ligne et temps réel inclus, mais modèle documentaire mal adapté à un journal d'achats requêté par produit et par date, et dépendance forte à Google. |
| ElectricSQL | Alternative sérieuse sur Postgres, mais son support React Native est plus récent et moins éprouvé que celui de PowerSync, qui a le SDK mobile le plus mature. |
| WatermelonDB avec synchro maison | Base locale réactive reconnue, mais la synchronisation reste à écrire, et sa compatibilité avec la nouvelle architecture React Native demande des correctifs communautaires. |
| Backend auto-hébergé dès le départ | Possible (Supabase et PowerSync sont open source et auto-hébergeables), mais ajoute de l'exploitation avant d'avoir un usage. Conservé comme voie de sortie. |

### 2.4 Pourquoi Supabase et PowerSync ensemble

- Postgres est le bon modèle pour un journal d'achats datés, des agrégats par produit et des règles d'intégrité (RG-6, RG-7).
- PowerSync est conçu pour Postgres et s'intègre à Supabase par un tutoriel officiel ; ses SDK couvrent React Native, Expo et le web, ce qui respecte la contrainte « un seul code » de la section 1.
- Les deux sont open source avec une offre gratuite suffisante pour un usage personnel, et auto-hébergeables si le projet le justifie.
- Les écritures du projet sont presque toutes additives (achats, lignes de liste) : les conflits sont rares et se règlent par dernière écriture gagnante (ENF-2), ce qui reste dans le modèle standard du moteur.

### 2.5 Compte et household

- Le **household** est l'ensemble des données d'un compte : au MVP, un compte a exactement un household, qui ne sert que de rattachement technique (RLS, synchro). Aucun écran ne le montre : pas de nom, pas de taille, pas de membres.
- Inscription par e-mail, Google ou Apple à la première ouverture, immédiatement suivie de la création automatique du household du compte. Une inscription par e-mail n'ouvre de session qu'après confirmation de l'adresse (5.2) : rien n'est écrit dans le household avant. Aucun écran d'initialisation (EF-5.3).
- Toute table métier porte une colonne `household_id`, jamais `user_id` : la politique RLS autorise un utilisateur sur les lignes du household dont il est membre. Le partage d'une liste (évolution 6 des spécifications fonctionnelles) se résumera à ajouter un membre au household, sans migration des données.
- Les règles de synchro PowerSync sélectionnent les lignes par `household_id` ; un appareil ne reçoit que son household.

### 2.6 Limites et points de vigilance

- Un projet Supabase gratuit se met en pause après une semaine sans activité et doit être relancé depuis le tableau de bord ; sans effet en usage quotidien, à surveiller en vacances. Le plan Pro (25 $/mois) supprime cette pause si besoin.
- PowerSync Cloud, plan Free (vérifié le 19/10/2026 sur powersync.com/pricing) : 2 Go synchronisés par mois, 500 Mo hébergés sur le service, 50 clients simultanés en pointe, 2 instances, 1 connexion à la base source par instance, support communautaire ; très au-dessus des besoins d'un compte. Même règle que Supabase : désactivation après une semaine d'inactivité, réactivation manuelle. Le plan Pro (à partir de 49 $/mois) supprime la désactivation. L'édition open source reste auto-hébergeable en secours.
- PowerSync impose son modèle : les tables synchronisées sont déclarées dans un schéma client et des règles de synchro ; le modèle de données (section 3) doit être conçu avec ces contraintes (clés UUID, colonnes simples, pas de jointures côté synchro).
- Sur le web, la base locale repose sur wa-sqlite et le stockage du navigateur. Vérifié dans la documentation du SDK web (19/10/2026) : Safari et Safari iOS sont pris en charge à condition d'utiliser le système de fichiers virtuel OPFSCoopSyncVFS, recommandé explicitement pour Safari/iOS ; l'implémentation IndexedDB y est instable, et l'erreur « Maximum call stack size exceeded » signalée sur Safari se corrige par ce même choix. Limites connues : OPFS ne fonctionne pas en navigation privée, et le multi-onglet repose sur des workers partagés désactivés sur iOS (sans effet pour une PWA plein écran). Le stockage OPFS étant une donnée de site, il est purgé par iOS après sept jours sans ouverture : le serveur étant la référence, l'appareil se resynchronise simplement. Décision : configurer OPFSCoopSyncVFS dès le squelette du projet et le tester sur un iPhone réel avant tout autre développement. Vérifié le 27/10/2026 sur l'iPhone cible, en PWA plein écran : la base est écrite, fermée et relue, et persiste après fermeture de l'app et redémarrage de l'iPhone (`docs/checklists/iphone-pwa.md`).

### 2.7 Conséquences pour les sections suivantes

- Section 3 : identifiants UUID générés côté client, horodatages UTC, colonne `household_id` partout, suppression logique sauf pour les achats.
- Section 4 : le moteur d'estimation s'exécute sur l'appareil, en lisant SQLite ; il n'a pas besoin du serveur.
- Section 5 : pas d'API REST à concevoir pour le MVP ; la section décrit les règles de synchro, les politiques RLS et les rares fonctions serveur.

### 2.8 Montée en charge

L'architecture est la même à 1 et à 100 000 comptes ; seuls les plans tarifaires changent.

- **Unité de scale = le household.** Chaque appareil ne synchronise que les lignes de son `household_id` ; la charge par client est constante quelle que soit la taille de la base. Le catalogue, seul contenu commun, est livré avec l'application et non synchronisé.
- **Volume par compte faible** : quelques achats et lignes par jour, de l'ordre de 1 à 3 Mo synchronisés par mois et par compte. Le plan Pro de PowerSync inclut 30 Go/mois et 1 000 clients simultanés, puis 1 $/Go et 30 $ par tranche de 1 000 clients ; 10 000 comptes actifs tiennent dans l'enveloppe de base.
- **Supabase** monte par paliers de calcul Postgres ; l'authentification couvre 50 000 utilisateurs actifs mensuels dès le plan gratuit.
- **Journal des achats** : il grossit sans borne. Le modèle prévoit une date sur chaque achat pour archiver ou agréger l'ancien. Au MVP, tout l'historique est synchronisé et pris en compte par le moteur ; une fenêtre glissante pourra être introduite par une colonne `period_key` quand le volume le justifiera (5.3).
- **Moteur sur l'appareil** : coût serveur nul par utilisateur. Des statistiques globales ou un apprentissage inter-comptes deviendraient une fonction serveur distincte.
- **Partage d'une liste** (hors MVP) : multipliera les clients simultanés par le nombre de membres, pas le volume de données.
- **Sortie du managé** : Postgres standard, Supabase et PowerSync open source et auto-hébergeables ; la migration vers un serveur propre ne touche pas l'application.

### 2.9 Réversibilité du choix PowerSync

PowerSync est une société jeune ; l'édition open source survivrait à sa disparition, mais sans évolutions. Le remplacement par un autre moteur (ElectricSQL, ou une synchronisation maison sur le même Postgres) est préparé par les règles suivantes :

| Ce qui dépend de PowerSync | Ce qui n'en dépend pas |
| --- | --- |
| Déclaration du schéma client (tables et colonnes synchronisées) | Schéma Postgres, politiques RLS, authentification |
| API d'accès local (`PowerSyncDatabase`, hooks de requête, `execute`) | Moteur d'estimation et modèle, en TypeScript pur |
| Connecteur d'envoi des écritures vers Supabase (`uploadData`) | Écrans et navigation |
| Règles de synchro (YAML côté service) | Catalogue |

Règles de conception :

1. Toute lecture et écriture passe par une **couche d'accès aux données** (dépôts par entité, interface TypeScript) ; les écrans et le moteur ne voient jamais l'API PowerSync.
2. Le SQL reste standard (pas de fonction propre au SDK) ; les tables locales ont le même schéma que Postgres.
3. Le connecteur d'envoi des écritures tient dans un seul module.
4. Les identifiants sont des UUID générés côté client et les écritures sont idempotentes : condition commune à tous les moteurs de synchro.

Coût estimé d'un remplacement dans ces conditions : réécriture de la couche d'accès aux données et du connecteur, soit une fraction de l'application, sans toucher au modèle, au moteur ni aux écrans.

## 3. Modèle de données

**Statut : validé le 19/10/2026, révisé le 30/10/2026.**

### 3.1 Vue d'ensemble

Le modèle est un **journal d'achats par produit** entouré de quelques tables de référence. Le stock n'est stocké nulle part : il est calculé à partir des achats et des ajouts manuels à la liste (5.2 des spécifications fonctionnelles). Le même schéma existe dans Postgres (référence) et dans SQLite local (réplique), à l'exception des données dérivées locales.

```
household ──▶ product ◀╌╌ catalog_entry (fichier, copié jamais lié)
   │            ▲  ▲
   ▼            │  └──── recipe_ingredient ──▶ recipe ◀── list_recipe (×N)
category ◀──────┤                                ▲
                ├── stock_event (achat, daté)    │
                │        ▲ achat à la coche      │ sous-titre
                └── list_line (packs, origine) ──┘
Chaque table porte household_id ; les flèches vont de l'enfant vers la référence.
```

### 3.2 Conventions

| Convention | Règle |
| --- | --- |
| Identifiants | UUID v7 (triables par date) générés côté client, colonne `id` sur toutes les tables ; l'achat créé à la coche a pour `id` l'UUID v5 de sa ligne (5.5) |
| Rattachement | Colonne `household_id` non nulle sur toute table métier, indexée ; clé des politiques RLS et des règles de synchro. Une clé étrangère vers une table métier porte sur `(household_id, id)` : une ligne ne référence que son propre household |
| Horodatage | `created_at`, `updated_at` en `timestamptz` UTC, posés par le client ; l'affichage convertit dans le fuseau de l'appareil |
| Suppression | Logique par `deleted_at` sur les lignes de liste, les recettes de la liste, les recettes et leurs ingrédients ; archivage par `archived_at` pour les produits, et `deleted_at` pour un produit jamais acheté ou archivé que l'utilisateur supprime (RG-7, EF-3.9) ; ses achats restent en base, sans plus être lus. Seuls les achats sont supprimés physiquement : décocher une ligne ou supprimer un achat de l'historique efface l'achat (EF-1.3, EF-3.4), dont la trace n'aurait aucun usage |
| Quantités | `numeric(10,3)` : en unités du produit pour les achats, les rythmes et les ingrédients, en packs pour les lignes de liste (RG-1) |
| Énumérations | Chaînes contraintes par `check`, pas de types `enum` Postgres (plus simples à faire évoluer et à répliquer) |
| Noms | Tables et colonnes en anglais, `snake_case` ; libellés utilisateur en français dans les données |

### 3.3 Tables

**household** — rattachement technique des données d'un compte (2.5).

| Colonne | Type | Note |
| --- | --- | --- |
| id | uuid |  |
| catalog\_contribution | boolean | « Aider à améliorer le catalogue » (EF-5.4, 7.3) ; vrai par défaut |
| created\_at, updated\_at | timestamptz |  |

**household\_member** — lien compte ↔ household. Une ligne par compte au MVP (index unique sur `user_id`) ; la table prépare le partage d'une liste (2.5).

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id | uuid |  |
| user\_id | uuid | référence `auth.users` |
| created\_at | timestamptz |  |

**category** — rayon, ordonné pour le parcours en magasin. L'utilisateur n'en change que l'ordre (EF-5.1).

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id | uuid |  |
| name | text |  |
| position | integer | ordre de parcours (EF-5.1) |
| key | text | clé du rayon (7.4), que référence `category_key` dans le catalogue ; unique par household |
| system\_key | text, nullable | `fresh`, `frozen` pour les rayons système (RG-9), sinon nul |

Le jeu par défaut (7.4) est créé avec le household (5.6).

**product** — le référentiel de l'utilisateur.

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id | uuid |  |
| name | text |  |
| name\_normalized | text | sans accents ni casse, pour la recherche (7.5) |
| category\_id | uuid, nullable | nul = « À classer », groupe affiché en tête de liste (EF-1.2, EF-2.8) |
| unit\_label | text | unité comptée (RG-1) : « pièce » par défaut, « bouteille », « kg »… |
| pack\_size | numeric | unités par pack, strictement positif, 1 par défaut (5.3 FS) |
| declared\_days\_per\_unit | numeric, nullable | rythme déclaré, en jours par unité (EF-3.3) : saisi en unités par jour, semaine ou mois, converti par `core` (4.3) ; seule cette forme est enregistrée, sans échelle pour être relue telle qu'écrite (5 par 7 jours n'a pas d'écriture décimale finie) |
| contents\_qty, contents\_unit | numeric, text, nullables | contenance d'une unité : 1 et `l`, 500 et `g` (EF-4.4) |
| catalog\_entry\_id, catalog\_version | text, smallint, nullables | origine catalogue (RG-8) |
| catalog\_qty, catalog\_per\_days | numeric, smallint, nullables | rythme indicatif pour une personne, copié du catalogue à la création et jamais resynchronisé (RG-8) |
| archived\_at | timestamptz, nullable | « Je n'en achète plus » (EF-3.5) |
| deleted\_at | timestamptz, nullable | Supprimé, avant tout achat ou une fois archivé (EF-3.9) |
| created\_at, updated\_at | timestamptz |  |

**stock\_event** — le journal des achats.

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id, product\_id | uuid |  |
| type | text | `purchased`, seul type du MVP |
| quantity | numeric | unités achetées : packs de la ligne × `pack_size` (5.3 FS) |
| occurred\_at | timestamptz | date métier, modifiable depuis l'historique (EF-3.4) ; distincte de `created_at` |
| list\_line\_id | uuid, nullable | ligne cochée d'origine (EF-1.3), qui porte l'origine recette pour RG-4 ; nul seulement pour un achat importé (section 10) |
| created\_at, updated\_at | timestamptz |  |

Index : `(household_id, product_id, occurred_at desc)`.

**list\_line** — une ligne de la liste, unique et permanente (EF-1.1) : il n'y a pas de table de listes. Les lignes ne sont jamais supprimées physiquement : cochées puis sorties de la liste, ou retirées, elles restent en base sans être affichées (4.7) ; une ligne d'ajout manuel reste l'ancre du stock de son produit (4.4).

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id, product\_id | uuid |  |
| quantity | numeric | en packs ; l'achat créé à la coche vaut `quantity × pack_size` unités (EF-1.3, EF-1.4) |
| origin | text | `suggestion` (EF-2.11), `manual` (EF-2.10), `recipe` (EF-4.5) |
| recipe\_id | uuid, nullable | recette affichée en sous-titre (EF-1.10) : la première qui a demandé la ligne |
| checked\_at | timestamptz, nullable | coché ; nul une fois décoché |
| deleted\_at | timestamptz, nullable | retiré (EF-1.5) |
| created\_at, updated\_at | timestamptz | `created_at` date l'ancre d'un ajout manuel (4.4) |

Un produit a au plus une ligne non cochée : ajouter un produit déjà présent incrémente sa ligne (EF-2.9).

**list\_recipe** — une recette ajoutée à la liste, affichée en pastille (EF-1.9).

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id, recipe\_id | uuid |  |
| times | smallint | nombre de fois où la recette est comptée, au moins 1 (EF-4.5) |
| deleted\_at | timestamptz, nullable | retirée de la liste (« − » à 1) |
| created\_at, updated\_at | timestamptz | `created_at` : date d'ajout, qui règle la disparition de la pastille (4.7) |

**recipe** et **recipe\_ingredient**

| Table | Colonnes |
| --- | --- |
| recipe | id, household\_id, name, notes (text, nullable), deleted\_at, created\_at, updated\_at |
| recipe\_ingredient | id, household\_id, recipe\_id, product\_id, quantity (numeric, nullable), unit (text, nullable : nul = unité du produit), deleted\_at, created\_at, updated\_at ; un produit au plus une fois par recette |

### 3.4 Catalogue par défaut (hors base)

Le catalogue n'est pas une table synchronisée : c'est un fichier JSON versionné livré avec l'application (section 7). Chaque entrée porte : `id` (slug stable), `name`, `aliases`, `category_key`, `unit_label`, `pack_size`, `contents_qty`, `contents_unit`, `rate_qty` et `rate_per_days` (rythme indicatif pour une personne). À la création d'un produit, les valeurs sont copiées dans `product` (`rate_qty` et `rate_per_days` dans `catalog_qty` et `catalog_per_days`) et l'origine conservée par `catalog_entry_id` et `catalog_version`.

### 3.5 Données dérivées, locales uniquement

Calculées sur l'appareil à partir des tables synchronisées, jamais envoyées au serveur, recalculables à tout moment :

| Vue ou cache | Contenu |
| --- | --- |
| product\_state | par produit : rythme retenu et sa source (`declared`, `learned`, `catalog`, `none`), stock estimé, ancre, date d'épuisement prévue, dernier achat ; éléments de la justification d'une suggestion (EF-2.5) |
| learned\_rate | par produit : rythme appris, nombre d'intervalles pris en compte (RG-3, RG-4, RG-5) |
| list\_view | sessions de courses, état de chaque ligne, pastilles des recettes et période de la liste (4.7) |

Au MVP, ces données sont calculées à la volée par le moteur (section 4) et mémorisées en mémoire ; une table SQLite locale non synchronisée ne sera introduite que si la mesure ENF-4 l'exige.

### 3.6 Sécurité et synchronisation

- **RLS** : une seule politique par table, `household_id in (select household_id from household_member where user_id = auth.uid())`, en lecture et en écriture ; la suppression n'est autorisée que sur `stock_event` (3.2, 5.5).
- **Règles de synchro** : un flux par household, contenant toutes les tables métier filtrées par `household_id`. Au MVP, tout l'historique est synchronisé ; une fenêtre glissante pourra être introduite plus tard, par une colonne `period_key`, quand le volume le justifiera (5.3).
- **Écritures** : toutes idempotentes (UUID client), rejouées par le moteur à la reconnexion ; conflit = dernière écriture gagnante par ligne (ENF-2).

### 3.7 Points tranchés le 19/10/2026

1. `occurred_at` est modifiable sur un achat ; l'apprentissage recalcule depuis le journal à chaque fois, aucun état intermédiaire à invalider.
2. La justification d'une suggestion (EF-2.5) est recalculée à l'affichage par le moteur, à partir de `product_state` ; aucune colonne en base. Une suggestion ajoutée devient une ligne, qui ne porte plus de justification.
3. Pas de fenêtre de synchro au MVP (décidé le 26/10/2026, remplace la fenêtre de 12 mois) : tout l'historique est synchronisé et le moteur le prend en compte en entier (5.7).

## 4. Moteur d'estimation

**Statut : décidé le 19/10/2026, révisé le 30/10/2026.**

### 4.1 Principes

- Module **TypeScript pur**, sans accès à la base ni au réseau : il reçoit des objets (produits, achats, lignes de la liste, recettes, dates) et rend des objets. Il tourne sur l'appareil, appelé par la couche d'accès aux données.
- **Déterministe** : la date courante et la date d'ouverture de l'application sont des paramètres, jamais lues par le moteur. Même entrée, même sortie, ce qui rend les tests exacts.
- **Dates locales** : le moteur reçoit les dates en heure locale de l'appareil, sans fuseau (`2026-10-26T18:30:00`) ; la couche `data` convertit les `timestamptz` (UTC) dans le fuseau de l'appareil avant l'appel. Une durée en jours est une différence de jours civils : un achat samedi soir et le suivant dimanche matin sont séparés d'un jour. Hors sessions de courses (4.7), l'heure ne sert qu'à ordonner deux dates du même jour. Le moteur ne manipule jamais de fuseau horaire. Les dates vont de l'an 0000 à l'an 9999 (format `AAAA-MM-JJ`) ; le calendrier est grégorien, 2100 n'est pas bissextile.
- **Sans état** : rien n'est mémorisé entre deux appels ; `product_state`, `learned_rate` et `list_view` (3.5) sont les sorties du moteur, recalculées à la demande.
- **Arithmétique simple** : pas de statistique au-delà d'une médiane, pas d'apprentissage automatique (risque « sur-ingénierie » des spécifications fonctionnelles).

### 4.2 Entrées et sorties

| Fonction | Entrées | Sortie |
| --- | --- | --- |
| `resolveRate` | produit (avec les valeurs catalogue copiées), achats du produit | rythme en unités par jour, source (`declared`, `learned`, `catalog`, `none`), nombre d'intervalles utilisés |
| `toDaysPerUnit` | quantité et période (`day`, `week`, `month`) saisies dans la feuille du rythme | rythme déclaré en jours par unité, à enregistrer (4.3) |
| `toPerPeriod` | rythme en unités par jour | quantité entière et période, pour l'afficher (« 5 / semaine ») et préremplir la feuille (4.3) |
| `observedIntervals` | achats d'un produit | intervalles entre achats (fiche produit, tests) |
| `estimateStock` | produit, achats et lignes de la liste du produit, rythme, date courante | stock estimé, date d'ancrage, date d'épuisement prévue, dernier achat |
| `productState` | produit, achats et lignes de la liste du produit, date courante | `ProductState` : rythme et stock estimé |
| `suggestForPeriod` | produits, leurs états, période en jours, vue de la liste (`listView`) | suggestions : produit, quantité en packs, éléments de justification |
| `missingIngredients` | recette, nombre de fois, produits, leurs états | ingrédients manquants : produit, quantité en packs (4.6) |
| `applyRecipe` | recette, nombre de fois avant et après, produits, leurs états, lignes non cochées de la liste | lignes créées, cumulées, réduites ou retirées (4.6) |
| `packUnits` | produit, nombre de packs | quantité de l'achat créé à la coche, en unités (5.3 FS) |
| `shoppingSessions` | dates des achats | sessions de courses : début, dernier achat, fermeture (4.7) |
| `listView` | lignes de la liste, recettes de la liste et leurs ingrédients, achats, date d'ouverture de l'application | sessions, état de chaque ligne, pastilles des recettes (4.7) |
| `resolvePeriod` | sessions de courses | période de la liste en jours, source (`learned`, `default`), nombre d'intervalles utilisés (4.7) |

Un type `ProductState` regroupe les sorties de `resolveRate` et d'`estimateStock` ; c'est lui que les écrans affichent (fiche produit, onglet Produits, justification EF-2.5, ingrédients d'une recette).

Chaque fonction vérifie ses entrées et lève une `InvalidInputError`, qui nomme le champ fautif, pour ce que `data` ne doit jamais transmettre : date qui n'est pas au format exact `AAAA-MM-JJTHH:MM:SS` ou qui n'existe pas (les dates sont comparées comme des textes, leur format doit être unique), quantité négative ou non finie, achat ou ligne d'un autre produit, taille de pack nulle, négative ou non finie, période qui n'est pas un entier d'au moins un jour, nombre de fois qui n'est pas un entier positif, produit présent deux fois dans une recette. Une valeur de rythme nulle ou négative n'est pas une erreur : elle vaut absence (4.3).

### 4.3 Rythme de consommation

Le rythme `r` s'exprime en unités par jour. Sources par priorité (5.1 FS) :

1. **Déclaré** : `r = 1 / declared_days_per_unit`. Une durée nulle ou négative vaut absence de rythme déclaré : on passe à la source suivante (T23).
2. **Appris** : voir ci-dessous ; retenu seulement si au moins 3 achats éligibles (RG-3).
3. **Catalogue** : `r = catalog_qty / catalog_per_days`, valeur pour une personne copiée sur le produit à sa création. Une valeur nulle ou négative est ignorée (T22) : elle ramènerait la borne du rythme appris à zéro. Une mise à jour du catalogue ne change rien (RG-8).
4. **Aucun** : produit sans rythme ; jamais suggéré.

**Saisie et affichage du rythme.** La fiche produit montre et fait saisir un rythme en unités par jour, par semaine ou par mois (EF-3.3), qui durent 1, 7 et 30 jours. `toDaysPerUnit` convertit la saisie, `N` unités par période de `P` jours, en `P / N` jours par unité : 5 par semaine donnent 1,4 jour par unité (T52). `N` est un nombre fini strictement positif ; une autre valeur est refusée par une `InvalidInputError`. Seule la durée par unité est enregistrée : la période saisie ne l'est pas. À l'inverse, `toPerPeriod` exprime un rythme `r`, déclaré, appris ou du catalogue, dans la période où `r × P`, arrondi à l'entier, s'écarte le moins de sa valeur exacte, en écart relatif ; à égalité, la plus courte l'emporte, et un arrondi nul écarte la période. Une saisie se réaffiche donc telle quelle, à une période équivalente près (14 par semaine se relisent 2 / jour). Un rythme inférieur à une unité tous les 60 jours s'affiche « 1 / mois », la plus petite valeur que la feuille permette de saisir (T52).

**Rythme appris.** Soient les achats éligibles du produit, triés par date : `P1 … Pn` avec leurs quantités `q1 … qn`. Un achat est éligible s'il ne provient pas d'une ligne d'origine recette (RG-4).

- Pour chaque achat `Pk` sauf le dernier, l'intervalle de consommation `dk` est le nombre de jours entre `Pk` et `Pk+1`. Le dernier achat n'a pas d'intervalle : sa consommation est en cours. L'achat suivant est une borne supérieure de l'épuisement, et la médiane absorbe les retards ponctuels.
- Taux observé sur l'intervalle : `rk = qk / dk`.
- Le rythme appris est la **médiane des cinq derniers `rk`** (ou de tous s'il y en a moins de cinq, minimum deux, soit trois achats). La médiane ignore un achat exceptionnel (promotion, réception) sans qu'il faille le détecter.
- Deux achats du même jour civil comptent comme un seul, quantités cumulées : un intervalle dure toujours au moins un jour (T26).
- Un ajout manuel à la liste n'entre pas dans le calcul (RG-5) : il recale le stock (4.4), pas le rythme. Un produit épuisé plus tôt que prévu se lit à l'achat suivant, qui clôt un intervalle plus court.

**Borne de sécurité.** Tant que moins de cinq intervalles sont disponibles, le rythme appris est borné entre 0,5 × et 2 × la valeur du catalogue (T17 ; sans valeur catalogue, pas de borne ; un rythme déclaré n'entre pas en jeu, puisqu'il passe avant le rythme appris). Au-delà de cinq intervalles, la médiane seule fait foi. Les valeurs du catalogue étant données pour une personne et l'application n'ayant qu'un utilisateur par compte, la borne ne bride pas un rythme appris réaliste.

### 4.4 Stock estimé

Le stock est reconstruit depuis l'**ancre** : la plus récente des lignes d'ajout manuel du produit (`origin = manual`) non retirées, datée de son `created_at`, de valeur 0 (EF-2.10). Sans une telle ligne, l'ancre est le premier achat connu, avec une valeur de 0 ; cet achat est compté dans la somme des achats.

```
stock(t) = max(0, Σ achats datés de l'ancre ou après − r × jours(ancre → t))
```

- `r` : rythme retenu (0 si aucun).
- Date d'épuisement prévue : `ancre + Σ achats / r` si `r > 0`, arrondie au jour supérieur : c'est le premier jour où le stock estimé est nul. Au-delà de l'an 9999, aucune date n'est rendue (T31).
- Un ajout manuel vaut 0 parce qu'on ajoute à la main ce qui manque ou va manquer ; le stock repart des achats qui le suivent (T43).
- Une ligne d'origine suggestion ou recette n'est pas une ancre : le moteur ou la recette a demandé le produit, l'utilisateur n'a rien signalé (T45). Une ligne retirée n'est pas une ancre, y compris par le « − » à 1 du stepper : l'estimation antérieure revient (T44).
- Un achat supprimé n'existe plus (3.2) ; `occurred_at` fait foi, pas `created_at`.

### 4.5 Quantité suggérée

Pour une période de `P` jours (4.7) à la date `t`, un produit est suggéré s'il n'est pas archivé, si `r > 0`, s'il n'a aucune ligne affichée sur la liste (4.7) et si `besoin = r × P − stock(t)` est positif. La quantité suggérée est `⌈besoin / pack_size⌉` packs (RG-2).

`P` est un nombre entier de jours, au moins 1 : une autre valeur est refusée par une erreur `InvalidInputError` (T25).

**Arrondi au pack.** La quantité suggérée, en unités, est au moins le besoin et le dépasse de moins d'un pack : un besoin de 0,8 unité donne 1 pack de 1, un besoin de 7 bouteilles vendues par 6 donne 2 packs (T29). Arrondir vers le bas ne proposerait rien, ou trop peu.

**Lignes de la liste.** Une ligne non cochée, ou cochée et encore affichée, bloque la suggestion de son produit. Une ligne retirée ou sortie de la liste ne bloque rien : un produit retiré peut être proposé aussitôt (T47).

**Justification** (EF-2.5) : le moteur en rend les éléments (stock estimé, date d'épuisement prévue, source du rythme, nombre d'intervalles) ; l'écran les met en mots sans les termes « rythme » ni « stock » (ENF-8). Exemple : « Il t'en reste environ 2, fini vers le 24 oct. · d'après tes 4 derniers achats ».

### 4.6 Recettes

**Quantité requise.** Pour une recette comptée `N` fois, un ingrédient de quantité `q` et d'unité `u` requiert, en unités du produit :

- `N × q` si `u` est nul ou égal à l'unité du produit (`unit_label`, comparés après normalisation) ;
- `N × q` converti par la mesure du produit si `u` et cette mesure sont deux masses (`g`, `kg`) ou deux volumes (`ml`, `cl`, `l`) ; la mesure est la contenance (`contents_qty`, `contents_unit`), ou à défaut l'unité du produit elle-même quand c'est une masse ou un volume. 200 g de lardons vendus en barquettes de 100 g requièrent 2 unités ; 300 g de farine achetée au kg, 0,3 unité (T49) ;
- `N` packs si aucune conversion n'est possible (T49).

**Manque.** Le manque est `requis − stock(t)` ; s'il est positif, l'ingrédient manque pour `⌈manque / pack_size⌉` packs. Un ingrédient sans quantité manque si `stock(t)` est nul, pour un pack quel que soit `N` (T48). `missingIngredients` rend les ingrédients manquants dans l'ordre de la recette : la phrase de la fiche (EF-4.3) et le compte « il te manque 2 » des cartes (EF-4.1) en découlent, avec le nombre de fois de la recette sur la liste, ou 1 si elle n'y est pas.

**Ajout à la liste.** `applyRecipe` fait passer une recette de `N` à `N'` fois : pour chaque ingrédient, l'écart `manque(N') − manque(N)`, les deux manques étant calculés au stock du moment, s'applique à la ligne non cochée du produit. Positif, il s'y ajoute, la ligne étant créée s'il n'y en a pas (origine recette, `recipe_id` de la recette) ; une ligne existante reçoit le `recipe_id` si elle n'en a pas (EF-4.5, T15). Négatif, il s'en retire, la ligne étant retirée si elle tombe à zéro. Ajouter une recette la fait passer de 0 à `N` (T14), le stepper de `N` à `N ± 1`, le « − » à 1 de 1 à 0 (T50). Les lignes cochées ne sont jamais modifiées : ce qui a été acheté est dans le stock, donc déjà déduit du manque.

### 4.7 Sessions de courses, état de la liste et période

**Sessions.** Les achats, tous produits confondus, recettes comprises, triés par date, forment des sessions : deux achats consécutifs espacés de moins de 3 h appartiennent à la même session (T34). Une session commence à son premier achat, se termine à son dernier et se ferme 3 h après le dernier. Chaque coche créant un achat daté de l'instant (EF-1.3), les sessions sont celles des coches ; un achat redaté depuis l'historique change de session. Les heures se lisent sur les dates locales (4.1) : un changement d'heure peut décaler une fermeture d'une heure, sans conséquence. `shoppingSessions` rend les sessions ; rien n'est stocké.

**Ouverture de l'application.** `listView` reçoit la date de l'ouverture en cours : démarrage de l'application ou dernier retour au premier plan, relevée par `mobile` et transmise par `data`.

**État des lignes.**

| État | Ligne | Affichée | Bloque la suggestion |
| --- | --- | --- | --- |
| `pending` | ni cochée, ni retirée : elle reste sur la liste d'une session à l'autre | oui | oui |
| `checked` | cochée, sa session n'étant pas fermée à l'ouverture de l'application | oui, barrée en fin de groupe | oui |
| `past` | cochée lors d'une session fermée avant l'ouverture de l'application, ou retirée | non | non |

La session d'une ligne cochée est celle qui contient son `checked_at` ; une coche qui n'appartient à aucune session (son achat a été redaté) compte comme fermée. Une ligne cochée quitte donc la liste à la première ouverture qui suit la fermeture de sa session (EF-1.8) : pas à la fermeture elle-même, pour ne pas changer la liste sous les yeux de l'utilisateur, ni à chaque ouverture, parce qu'iOS recharge une PWA restée en arrière-plan et viderait les lignes cochées en plein magasin (T35, T46). Chaque appareil a ses propres ouvertures : deux appareils du même compte peuvent garder des lignes cochées plus ou moins longtemps, sans effet sur les données.

**Pastilles des recettes.** Une recette de la liste (`list_recipe` non retirée, dont la recette n'est pas supprimée) est affichée tant qu'une de ses lignes l'est, ou tant qu'aucune session ne s'est fermée entre son ajout et l'ouverture de l'application (EF-1.9). Ses lignes sont les lignes affichées dont le produit est l'un de ses ingrédients ; la pastille compte les cochées sur le total, et elle est pleine quand le total est nul ou atteint (T51).

**Période de la liste.** `resolvePeriod` retient, dans l'ordre :

1. **Apprise** : les sessions sont ramenées au jour civil de leur début, deux sessions du même jour comptant pour une (T37). À partir de trois jours de courses, la période est la médiane des cinq derniers intervalles entre jours consécutifs (T41), arrondie au jour le plus proche (une demi-journée vers le haut), bornée entre 2 et 31 jours (T38, T39). La fenêtre de cinq intervalles est celle du rythme appris (4.3) : elle suit un changement d'habitude en quelques semaines.
2. **Par défaut** : 7 jours (T36).

Aucun écran ne montre ni ne règle la période (EF-2.4).

### 4.8 Jeu de tests de référence

Les tests sont écrits avant le moteur, sous forme de fixtures JSON (produits, achats, lignes, recettes, dates) avec le résultat attendu, et constituent la définition exécutable des formules ci-dessus. Les numéros des fixtures supprimées ne sont pas réattribués.

| Id | Scénario | Résultat attendu |
| --- | --- | --- |
| T01 | Rythme déclaré 1 yaourt/jour, pack de 12 acheté il y a 8 jours, liste de 7 jours | stock 4, besoin 3 → suggestion 1 pack |
| T02 | 2 achats seulement, pas de rythme déclaré, catalogue 1 bouteille pour 7 jours | source `catalog`, r = 1/7 |
| T03 | 3 achats de 1 L à J0, J7, J14 | r appris = 1/7 L/jour, source `learned`, 2 intervalles |
| T04 | 6 achats hebdomadaires dont un achat de 6 unités en promotion | la médiane ignore l'intervalle aberrant ; r = 1/7 |
| T10 | Achats provenant de lignes recette | exclus du calcul de r, comptés dans le stock |
| T11 | Produit archivé (« Je n'en achète plus ») | jamais suggéré |
| T13 | 15 jours sans ouverture de l'app | stock décroît normalement, suggestions au retour (évolution « pause » hors MVP) |
| T14 | Recette dont un ingrédient est en stock suffisant | seuls les manquants sont ajoutés, arrondis au pack |
| T15 | Recette dont des ingrédients manquants sont déjà sur la liste, dont un pour une autre recette | une seule ligne par produit, quantités cumulées |
| T17 | Rythme appris sur 2 intervalles, 4 × la valeur catalogue | borné à 2 × catalogue |
| T22 | Valeur catalogue 0 ou négative (4.3) | ignorée : rythme appris sans borne, ou aucun rythme |
| T23 | Rythme déclaré de 0 jour par unité, ou négatif (4.3) | ignoré : rythme catalogue ou appris |
| T25 | Liste de 0 jour (4.5) | `InvalidInputError` sur `periodDays` |
| T26 | Deux achats le même jour, puis deux achats hebdomadaires (4.3) | un seul achat de quantité cumulée : intervalles 7 et 7 |
| T29 | Besoin de 0,8 unité en pack de 1, besoin de 7 unités en pack de 6 (4.5) | 1 pack et 2 packs : l'arrondi dépasse le besoin de moins d'un pack |
| T30 | Achats en 1969-1970 et en février-mars 2100 (4.1) | intervalles de 7 jours, dates d'épuisement exactes |
| T31 | Épuisement prévu au-delà de l'an 9999 (4.4) | aucune date d'épuisement, sans erreur |
| T34 | Achats à 10:00, 10:20, 12:59, 16:00 et 19:00 (4.7) | trois sessions : moins de 3 h d'écart regroupe, 3 h tout juste sépare |
| T35 | Lignes non cochée, cochée dans une session ouverte, cochée lors d'une session fermée avant l'ouverture, retirée (4.7) | état de chaque ligne ; seules les lignes passées laissent suggérer leur produit |
| T36 | Deux jours de courses seulement (4.7) | période par défaut : 7 jours |
| T37 | Quatre sessions dont deux le même jour (4.7) | sessions du même jour comptées une fois ; médiane 5,5 arrondie à 6 jours |
| T38 | Sessions espacées de 40 et 45 jours (4.7) | période bornée à 31 jours |
| T39 | Sessions quatre jours de suite (4.7) | période bornée à 2 jours |
| T41 | Six intervalles entre sessions : 20, 20, 20, 7, 7, 7 jours (4.7) | médiane des cinq derniers : 7 jours, pas 13,5 |
| T43 | Achat, ajout manuel du produit, puis nouvel achat (4.4) | stock repart de 0 à l'ajout, seul le nouvel achat compte ; rythme inchangé |
| T44 | Ajout manuel retiré sans achat (4.4) | ancre ignorée : même stock que sans l'ajout |
| T45 | Lignes d'origine suggestion et recette (4.4) | aucune ancre |
| T46 | Coches à 10:00 et 10:30, application rouverte à 11:00, à 13:29 puis à 13:30 (4.7) | lignes affichées aux deux premières ouvertures, sorties à la troisième |
| T47 | Produit retiré de la liste, besoin positif (4.5) | suggéré aussitôt |
| T48 | Ingrédient sans quantité, stock estimé nul puis positif (4.6) | manque d'un pack, puis aucun |
| T49 | Ingrédients en grammes sur un produit à contenance, sur un produit au kilo, et dans une unité inconvertible (4.6) | conversion par la contenance, par l'unité, sinon un pack |
| T50 | Recette ajoutée une fois, comptée deux fois, puis retirée (4.6) | manque doublé, puis lignes ramenées à zéro et retirées |
| T51 | Recette avec deux lignes dont une cochée, recette à laquelle rien ne manquait, avant et après les courses suivantes (4.7) | 1 sur 2 ; pleine ; disparues à l'ouverture qui suit les courses |
| T52 | Rythmes saisis par jour, par semaine et par mois, et rythmes affichés (4.3) | 5 par semaine → 1,4 jour par unité, relu 5 / semaine ; rythme déclaré de 1,4 jour par unité : r = 5/7 ; 1 par 42 jours affiché 1 / mois |

Propriétés vérifiées en complément : le moteur est idempotent (deux appels identiques donnent le même résultat), le stock n'est jamais négatif, la quantité suggérée est nulle dès que le stock couvre la période, et une suggestion dépasse le besoin de moins d'un pack.

## 5. API et synchronisation

**Statut : décidé le 19/10/2026, révisé le 30/10/2026.**

### 5.1 Principe

Il n'y a **pas d'API applicative** au MVP. Trois couches remplacent ce qu'une API REST ferait d'ordinaire :

| Couche | Rôle | Où |
| --- | --- | --- |
| Schéma Postgres, contraintes et politiques RLS | Intégrité et autorisation | Supabase |
| Règles de synchronisation | Quelles lignes descendent vers quel appareil | PowerSync Service |
| Connecteur d'envoi | Comment les écritures locales remontent | Module unique dans l'app (2.9) |

L'app n'appelle Supabase directement que pour l'authentification, pour les écritures du connecteur et pour les deux opérations de compte (5.6) ; toutes ses lectures passent par SQLite.

### 5.2 Authentification

- **Fournisseurs** : Supabase Auth, sans lien magique. E-mail et mot de passe, Google (OAuth web, gratuit) et Apple, proposés dans cet ordre (EF-5.8). « Sign in with Apple » exige un identifiant de service créé dans le compte développeur Apple, et Apple l'impose dès qu'un autre fournisseur social est proposé dans une app du store : il est prévu dès maintenant (écran, configuration) et activé en phase B ; la PWA de phase A n'affiche que Google. D'autres fournisseurs viendront après le MVP.
- **Confirmation de l'adresse** : activée, comportement par défaut de Supabase. `signUp` ne rend pas de session tant que l'adresse n'est pas confirmée ; une connexion sur une adresse non confirmée (`email_not_confirmed`) mène à l'écran « Vérifie ta boîte mail ». Le renvoi (`resend`) est limité par Supabase à un e-mail par minute et par adresse : l'écran en tient le compte à rebours, de 60 s après chaque envoi (EF-5.9). Une adresse jamais confirmée garde un household vide, créé par le trigger d'inscription (5.6), sans effet sur le service.
- **Mot de passe** : 8 caractères minimum (8.3). La réinitialisation (`resetPasswordForEmail`) répond de la même façon que l'adresse ait un compte ou non (EF-5.10). Tous les liens envoyés par e-mail sont valables une heure : Supabase applique une même durée à tous (`otp_expiry` de l'e-mail, 3600 s), confirmation de l'adresse comprise.
- **Session** : persistante, sans « se souvenir de moi » ; le client Supabase garde la session sur l'appareil et la prolonge par le jeton de rafraîchissement (8.3). Un même adaptateur de stockage la range : le `localStorage` du navigateur sur la PWA, le trousseau de l'appareil (`expo-secure-store`, Keychain ou Keystore) en natif, découpée en morceaux puisque le trousseau limite la taille d'une valeur. Elle ne se ferme qu'à la déconnexion ou à la suppression du compte.
- **Liens profonds** : tout lien d'un e-mail du compte et tout retour OAuth reviennent dans l'application, sur la route qui le traite (confirmation, nouveau mot de passe), par l'URL de la PWA en phase A et par le schéma `commedab://` en natif (`scheme` d'`app.json`). L'application passe cette adresse de retour à chaque appel (`emailRedirectTo`, `redirectTo`) ; chacune est déclarée dans les URL de redirection autorisées du projet Supabase, pour chaque environnement (9.3). Le lien porte un `token_hash` et son type, que la route vérifie (`verifyOtp`) : un lien expiré ou déjà utilisé ouvre « Lien expiré » (EF-5.10). Certains clients de messagerie ne rendent pas cliquable un lien `commedab://` : les liens universels (une URL `https` du domaine de la PWA associée à l'application) sont une évolution de la phase B (section 10).
- **E-mails** : les modèles de Supabase sont remplacés par des modèles écrits dans la voix de l'application (`docs/design/design-system.md`, Voix ; EF-5.11) : confirmation de l'adresse, réinitialisation du mot de passe, changement d'adresse (écrit dès le MVP, servi par l'évolution 9 des spécifications fonctionnelles). Ils sont versionnés dans `supabase/templates/` avec la configuration de l'authentification (`supabase/config.toml` : fournisseurs, URL de redirection, durée des liens, SMTP) et appliqués au projet par le CLI (`supabase config push`), jamais retouchés dans le tableau de bord. L'envoi passe par **Resend** (palier gratuit) en SMTP, pour les e-mails du compte comme pour l'export (5.6), depuis `bonjour@commedab.app`, une adresse qui reçoit les réponses (Email Routing de Cloudflare) : celui de Supabase par défaut ne délivre qu'aux adresses de l'équipe du projet. Les secrets (clé Resend, identifiants Google et Apple) ne sont jamais dans le dépôt : `config.toml` les lit dans l'environnement par `env(…)`, et `supabase/.env.example` en donne la liste.
- Le JWT Supabase est accepté tel quel par PowerSync (vérification par la clé publique du projet) ; aucun service d'échange de jeton. Dans le Client Auth de l'instance : « Use Supabase Auth », et `authenticated` listé dans les audiences JWT, que la détection automatique n'ajoute pas toujours (sinon : 401 `PSYNC_S2105`, « Unexpected aud claim value »).
- L'identifiant du household n'est pas mis dans le JWT : les règles de synchro le résolvent par une **sous-requête** sur `household_member` (`with` du flux), ce qui restera valable quand une liste sera partagée entre plusieurs comptes.

### 5.3 Règles de synchronisation

Un seul flux (Sync Stream) par household, abonné d'office, décrit en YAML côté PowerSync :

```yaml
config:
  edition: 3

streams:
  household:
    auto_subscribe: true
    with:
      own_household: SELECT household_id FROM household_member WHERE user_id = auth.user_id()
    queries:
      - SELECT * FROM household WHERE id IN own_household
      - SELECT * FROM household_member WHERE household_id IN own_household
      - SELECT * FROM category WHERE household_id IN own_household
      - SELECT * FROM product WHERE household_id IN own_household
      - SELECT * FROM recipe WHERE household_id IN own_household
      - SELECT * FROM recipe_ingredient WHERE household_id IN own_household
      - SELECT * FROM list_line WHERE household_id IN own_household
      - SELECT * FROM list_recipe WHERE household_id IN own_household
      - SELECT * FROM stock_event WHERE household_id IN own_household
```

- Tout l'historique du compte est synchronisé au MVP : pas de fenêtre glissante. Le volume d'un compte (quelques Mo par an) ne la justifie pas avant plusieurs années ; elle sera introduite alors, par une colonne `period_key` (année-mois) filtrée dans ces règles, sans changement de modèle.
- `deleted_at` est synchronisé comme les autres colonnes : une suppression logique est une mise à jour ordinaire. La suppression d'un achat est un `DELETE`, répliqué comme tel sur les autres appareils.
- Le catalogue n'apparaît pas : il est dans le binaire de l'app.
- Les tables synchronisées sont publiées par la publication Postgres `powersync`, créée par la migration initiale ; les règles sont dans `supabase/sync-streams/sync-streams.yaml`. Le client n'a aucun abonnement à demander : `auto_subscribe` synchronise le flux dès la connexion.
- PowerSync lit la base avec un rôle qu'il crée lui-même (`powersync_…`), qui a la réplication et la lecture des tables publiées, sans aucune écriture. Une table qui entre dans la synchro doit être ajoutée par migration à la publication et accordée en lecture à ce rôle.

### 5.4 Connecteur d'envoi

Le SDK PowerSync met les écritures locales en file (`CrudTransaction`) et appelle le connecteur à la reconnexion. Le connecteur :

1. Rejoue chaque transaction dans l'ordre, par `upsert`, `update` ou `delete` sur la table Postgres correspondante via le client Supabase, sous RLS. Seul `stock_event` reçoit des `delete` (3.2) ; sur toute autre table, le serveur n'a pas de politique de suppression et refuse l'écriture.
2. Distingue les échecs : erreur réseau ou 5xx → la transaction reste en file et sera rejouée ; violation de contrainte ou refus RLS (4xx) → l'écriture refusée n'est jamais abandonnée : elle est mise de côté sur l'appareil, dans la table locale `held_write` (jamais synchronisée), et le refus est signalé (journal de l'appareil, Sentry, message éphémère d'EF-6.4). Seules la rejoignent, dans leur ordre et sans être envoyées, les écritures suivantes sur la **même entité** (même table, même identifiant : la même ligne de liste, le même produit, la même recette) et, quand l'écriture refusée crée l'entité, celles sur une entité qui la désigne par une colonne `*_id` (la ligne de liste d'un produit dont la création est refusée, qui serait refusée à son tour), avec ce qui les suit ; les autres partent normalement, pour qu'une ligne refusée ne fige jamais la liste en magasin. Les écritures mises de côté sont renvoyées dans leur ordre quand l'utilisateur touche « Réessayer » ou au retour du réseau après une coupure ; une écriture acceptée quitte la réserve, une écriture refusée de nouveau y reste avec celles qu'elle retient. L'envoi de la file et ce nouvel essai ne se croisent jamais.
3. Tient dans un module unique, sans logique métier.

Les identifiants étant générés côté client (UUID v7) et les écritures étant des `upsert` ou des `delete` par identifiant, rejouer deux fois la même transaction est sans effet.

### 5.5 Intégrité côté serveur

| Règle | Mise en œuvre |
| --- | --- |
| Achat à la coche idempotent (EF-1.3) | L'`id` de l'achat créé en cochant une ligne est l'UUID v5 de `list_line.id`, dans l'espace de noms fixe `23413ee3-7a41-418c-a1b0-0f22dda93851`. Cocher crée l'achat (`upsert`), avec `occurred_at` = `checked_at` et `quantity` = `packUnits` de la ligne ; décocher le supprime (`delete`) ; recocher le recrée sous le même `id` ; modifier la quantité d'une ligne cochée met à jour l'achat. Deux appareils qui cochent la même ligne produisent le même achat, conservé une seule fois ; la dernière écriture fixe l'état |
| Suppressions | Privilège `delete` accordé sur `stock_event` seulement (3.2), la politique RLS de chaque table couvrant lecture et écriture ; les autres tables n'ont que des suppressions logiques, et les produits l'archivage (`archived_at`) ou, jamais achetés ou archivés, la suppression logique (`deleted_at`, RG-7) |
| Rattachement au household | RLS : `household_id in (select household_id from household_member where user_id = auth.uid())`, lecture et écriture ; `household_member` lisible par son compte, écrit uniquement par le trigger d'inscription (5.6) ; `household` et `category` créés par ce même trigger, le client ne faisant que les mettre à jour (`catalog_contribution`, ordre des rayons) |
| Un compte, un household | Index unique sur `household_member.user_id` |

### 5.6 Logique serveur

Réduite au strict minimum :

- **Création du household** : trigger Postgres sur `auth.users` à l'inscription, qui crée `household` (`catalog_contribution` vrai), `household_member` et le jeu de rayons par défaut avec leurs `key` et `system_key` (7.4). Aucun écran d'initialisation (EF-5.3).
- **Export des données** (EF-5.5) : Edge Function `export-data`, appelée par l'app avec le JWT de la session. Elle lit sous RLS les données du household et envoie le JSON en pièce jointe d'un e-mail à l'adresse du compte, par l'API de Resend, le fournisseur du SMTP du projet (5.2) ; l'app affiche le message éphémère dès que la fonction a accepté la demande, sans attendre l'e-mail. Le fichier contient les produits, les achats, les recettes avec leurs ingrédients et leurs notes, la liste (`list_line` et `list_recipe`, lignes passées comprises) et les rayons dans leur ordre. Le serveur étant la référence, l'export est complet dès que la file d'écritures de l'appareil est vide ; il n'est proposé qu'en ligne (EF-6.3).
- **Suppression du compte** (EF-5.6) : fonction Postgres `delete_account()` appelée par l'app, qui supprime physiquement le household et toutes ses données, puis l'utilisateur ; l'app vide ensuite sa base locale. Les agrégats anonymes déjà constitués pour le catalogue (7.3) ne contiennent aucune donnée du compte et ne sont pas concernés.

Une seule Edge Function au MVP, l'export ; les suivantes n'arriveront qu'avec les notifications et l'import de commandes (section 10).

### 5.7 Points tranchés le 19/10/2026

1. Fenêtre glissante abandonnée au MVP : tout l'historique est synchronisé ; `period_key` sera ajouté quand le volume le justifiera.
2. Pas de lien magique : mot de passe et Google au MVP, Apple en phase B, d'autres fournisseurs ensuite.
3. Décidé le 30/10/2026 : confirmation de l'adresse e-mail à l'inscription, liens profonds pour tous les e-mails du compte, modèles d'e-mail versionnés (5.2) ; export envoyé par e-mail par une Edge Function (5.6).

## 6. Frontend

**Statut : décidé le 26/10/2026, révisé le 30/10/2026.**

### 6.1 Structure du projet

Un dépôt unique organisé en espaces de travail (pnpm), pour que le moteur et le modèle vivent hors de l'app (1.7, 2.9) :

```
repo/
  apps/
    mobile/            # application Expo : écrans, navigation, PWA
  packages/
    core/              # moteur d'estimation, types du modèle, catalogue : TypeScript pur, zéro dépendance
    data/              # schéma PowerSync, dépôts par entité, connecteur Supabase
  supabase/            # migrations SQL, politiques RLS, fonctions, règles de synchro
  CLAUDE.md            # conventions du projet pour Claude Code
```

| Choix | Décision | Raison |
| --- | --- | --- |
| Langage | TypeScript strict partout, `noUncheckedIndexedAccess` | Erreurs attrapées avant l'exécution ; indispensable quand le code est généré |
| Framework | Expo, SDK courant au démarrage, nouvelle architecture React Native | Section 1 |
| Navigation | Expo Router (fichiers = routes), onglets JavaScript (`expo-router/js-tabs`) ; écrans du compte protégés par `Stack.Protected` selon la session | Même navigation sur web et natif, liens profonds gratuits. Les onglets natifs n'ont sur le web qu'une barre de repli : à reconsidérer en phase B |
| Composants | Primitives React Native + composants maison, un par entrée de `docs/design/components.md` (11.3), pas de kit UI lourd | Expo UI (SwiftUI, Compose) est natif seulement : incompatible avec la phase A web. Un kit tiers ajouterait une dépendance pour cinq écrans |
| Styles | NativeWind (Tailwind pour React Native), thème dérivé de `docs/design/tokens.json` (11.1) | Même syntaxe sur les trois cibles, bien connue des modèles de génération de code |
| Listes | FlashList | Longues listes de produits sans saccade (ENF-3) |
| Icônes | Phosphor (`phosphor-react-native`), jeu fermé (11.2) | Celui du design system ; fonctionne sur web |
| État | Requêtes réactives de `data` (`watch`, 6.2), consommées par des hooks de `mobile` ; Zustand pour l'état d'interface seulement (filtre, onglet, brouillon de saisie) | Pas de store global des données : SQLite est la source, les écrans s'abonnent |
| Formulaires | Aucune bibliothèque : champs contrôlés, validation dans `core` | Un seul champ obligatoire par formulaire (ENF-8) ; une recette demande aussi un ingrédient (EF-4.2) |

### 6.2 Couche d'accès aux données

`packages/data` expose, par `createData`, des **dépôts par entité** (`list`, `products`, `purchases`, `recipes`, `categories`, `account`) avec deux faces :

- une **requête réactive** par dépôt (`watch`), qui rend les données dans le modèle de `core` à l'abonnement puis à chaque écriture locale ou synchronisation, et rend son désabonnement ; `mobile` en fait des hooks, sans dépendre de PowerSync ;
- des **commandes** qui écrivent dans SQLite dans une transaction et appliquent les règles de 3.3 et 5.5 :

| Dépôt | Commandes |
| --- | --- |
| `list` | `addProduct`, `acceptSuggestion`, `checkLine`, `uncheckLine`, `setLineQuantity`, `removeLine`, `setRecipeTimes` |
| `products` | `createProduct`, `updateProduct`, `stopBuying`, `resumeBuying` |
| `purchases` | `editPurchase`, `deletePurchase`, `restorePurchase` |
| `recipes` | `saveRecipe`, `deleteRecipe` |
| `categories` | `moveCategory` |
| `account` | `setCatalogContribution`, `requestExport`, `deleteAccount` |

Cocher, décocher, changer la quantité d'une ligne cochée ou la retirer crée, supprime ou met à jour son achat, pour la quantité rendue par `packUnits`. Ajouter un produit déjà présent incrémente sa ligne, et un produit archivé le réactive (EF-2.9, EF-2.10). Décocher une ligne dont le produit a été remis sur la liste entre-temps la fond dans la nouvelle ligne, pour qu'un produit n'ait jamais deux lignes non cochées. Les lignes d'une recette sont celles que rend `applyRecipe`. Supprimer un achat rend de quoi l'annuler (`restorePurchase`) le temps du message éphémère ; une recette n'est supprimée qu'après confirmation et ne se restaure pas (EF-4.6). `resumeBuying` efface `archived_at` sans toucher à la liste (EF-3.8). `deleteProduct` refuse un produit qui a un achat sans être archivé ; sinon il pose `deleted_at` sur le produit, ses lignes de liste et ses ingrédients, et rend leurs identifiants, que `restoreProduct` reçoit pour tout remettre le temps du message éphémère (EF-3.9) ; les dates ne servent pas à les retrouver, leur forme changeant au retour de la synchronisation. Un produit supprimé n'est plus lu ni accepté par aucune commande, et ses achats ne sont plus lus. Une commande refuse une modification d'un produit archivé autre que `resumeBuying` (EF-3.5). `requestExport` et `deleteAccount` appellent le serveur (5.6) et échouent hors ligne. Une commande ne contient aucune formule : tout calcul vient de `core`.

`openAppDatabase` ouvre la base de l'application, la connecte au compte de la session Supabase par le connecteur (5.4), la vide à la déconnexion et publie l'état de connexion et de synchro (6.5). La base n'est ouverte que pendant une session : l'app l'ouvre à la connexion, la vide puis la ferme à la déconnexion. À la connexion, une base dont les membres du foyer (`household_member`) n'incluent pas le compte connecté vient d'un autre compte, laissé par une session expirée sans déconnexion : elle est vidée avant la synchro. Une page sans session ne tient ainsi aucun verrou sur le fichier de la base ; sinon, Safari garde en mémoire la page quittée pour la connexion Google, figée avec son verrou, et la page de retour ne peut plus ouvrir la base.

La Liste passe à `listView` (4.7) les lignes, les recettes de la liste avec leurs ingrédients, les achats et la date d'ouverture de l'application, que `mobile` relève au démarrage et à chaque retour au premier plan ; seules les lignes affichées sont rendues, `resolvePeriod` donne la période et `suggestForPeriod` reçoit la vue entière.

Les écrans n'écrivent jamais de SQL et n'importent jamais PowerSync (2.9). Un hook `useProductStates()` combine le flux des produits, des achats et des lignes et appelle le moteur de `core` ; son résultat est mémorisé par produit et recalculé uniquement pour les produits dont les achats ou les lignes ont changé, ce qui tient ENF-4 (300 produits en moins d'une seconde) sans table dérivée.

### 6.3 Écrans du MVP

Quatre onglets, Liste · Produits · Recettes · Réglages, le panneau Ajouter, une fiche produit et une fiche recette. Les deux fiches s'ouvrent dans les onglets, la barre restant visible (Produits ou Recettes allumé), et « retour » suit l'historique ; les écrans de saisie (nouvelle recette, ordre des rayons) passent par-dessus. Il n'y a ni écran d'accueil distinct, ni mode magasin, ni écran de suggestions : la Liste, onglet par défaut, sert à préparer et à faire les courses (EF-1.1).

| Écran | Contenu | Gestes clés |
| --- | --- | --- |
| **Liste** | En-tête « Ma liste », compteur « N sur M », barre de progression, pastilles des recettes ajoutées (EF-1.9) ; lignes groupées par rayon, une carte par rayon, dans l'ordre configuré (« À classer » en tête, frais et surgelés en dernier), sous-titre de recette (EF-1.10), lignes cochées barrées en fin de groupe jusqu'à leur sortie (4.7) ; en bas, le champ « Ajouter un produit ou une recette » et son badge « N suggestions » (EF-1.11) | Tap sur une ligne : cocher, décocher. Appui long : surbrillance et mini-feuille (quantité −/+, « Voir la fiche », « Retirer de la liste »). Glissement vers la gauche : « Retirer », seul. Tap sur une pastille : fiche recette. Ni confirmation ni message éphémère |
| **Panneau Ajouter** (par-dessus la Liste) | Liste décalée vers le haut, ses premières lignes sous un voile (EF-2.1) ; champ collé au clavier et « Fermer » ; avant saisie, « Comme d'hab chef ? » et les suggestions avec leur justification (EF-2.2, EF-2.5), puis « Tous tes produits » ; à la frappe, le produit nommé exactement en tête et mis en évidence, puis recettes, produits, catalogue et « Créer « … » » (EF-2.7, 7.5) ; après Entrée, le produit ajouté en tête avec son stepper | « Ajouter N » sur une suggestion ; composant d'ajout sur chaque résultat (EF-2.9) ; Entrée : ajouter le produit nommé exactement et vider le champ (EF-2.7) ; « Créer » en un tap, rayon et unité proposés en dessous (EF-2.8) |
| **Produits** | Recherche instantanée, référentiel groupé par rayon, une carte par rayon comme sur la Liste, « il t'en reste environ 2 » et dernier achat en sous-titre ; en pied, la carte « Tu n'achètes plus » et son nombre, repliée : produits archivés au nom atténué, date du dernier achat, « Reprendre » (EF-3.1, EF-3.8) | Tap sur la carte « Tu n'achètes plus » : la déplier, la replier ; la recherche la déplie sur les archivés trouvés ; « Reprendre » : le produit retourne dans son rayon ; tap sur un produit : sa fiche ; glisser une ligne à gauche : « Je n'en achète plus » ou « Supprimer » selon le produit (EF-3.10) |
| **Fiche produit** | Nom, rayon, unité, estimation en langage courant, composant d'ajout (« Ajouter 1 pack (6) »), « Je n'en achète plus », ou « Supprimer » tant qu'il n'a aucun achat ou une fois archivé, avec confirmation s'il est dans des recettes (EF-3.9) ; section Réglages toujours visible : nom, rayon, rythme (« Tu en prends · appris · 5 / semaine »), unité, contenance et son unité, « Acheté par packs de » ; historique des achats (EF-3.2 à EF-3.4). Archivé : « Reprendre », réglages en lecture seule | Sélecteurs en feuille, feuille du rythme, saisie numérique enregistrée en quittant le champ, stepper ; jamais de bouton Valider (EF-3.3). Un achat de l'historique ouvre une feuille « Corriger l'achat » : date au jour près, jamais après aujourd'hui, et quantité, deux steppers de réglage enregistrés à la fermeture de la feuille, qu'un appui maintenu fait défiler (EF-3.4). Supprimer un achat s'annule par message éphémère |
| **Recettes** | Cartes : nom, « 5 ingrédients · il te manque 2 », composant d'ajout en haut à droite, pastilles d'ingrédients manquants puis possédés (barrés) ; « + Nouvelle » (EF-4.1) | Composant d'ajout : ajouter la recette, puis la compter N fois (EF-4.5) ; tap n'importe où ailleurs sur une carte : fiche recette ; glisser une carte à gauche : « Supprimer », puis la confirmation (EF-4.6) |
| **Fiche recette** | Ingrédients manquants d'abord, avec quantité, estimation et composant d'ajout ; « Ajouter à la liste » et la phrase de ce qui partira ; notes ; « Modifier », « Supprimer » (EF-4.3) | « Modifier » : écran d'édition ; « Supprimer » : feuille de confirmation (EF-4.6) |
| **Nouvelle recette, Modifier la recette** | « Annuler », « Enregistrer » (actif après une modification) ; nom, ingrédients avec quantité et unité en ligne, « Ajouter un ingrédient » en fin de liste, bouton texte « Ajouter une note » qui ouvre le champ (EF-4.2) | « Ajouter un ingrédient » : panneau de produits et de recherche par-dessus la recette ; Enregistrer sans nom ou sans ingrédient : erreur sous le champ ou sous le titre Ingrédients ; ouvert depuis le panneau Ajouter : nom repris, panneau des ingrédients ouvert, recette enregistrée comptée sur la liste |
| **Réglages** | Rayons (lien vers « Ordre des rayons ») ; Affichage (thème, ENF-9) ; Compte (e-mail, mot de passe, déconnexion) ; Mes données (« Aider à améliorer le catalogue », activé par défaut ; « Exporter mes données » ; « Supprimer mon compte ») ; pied de page « Commedab 0.1 · AGPL-3.0 » (EF-5.1 à EF-5.7). Hors ligne : Compte et Mes données désactivés (EF-6.3) | Chaque réglage s'applique dès qu'il change ; export par e-mail et message éphémère ; seule la suppression du compte demande confirmation |
| **Ordre des rayons** | Rayons à glisser-déposer, « À classer » fixé en tête, frais puis surgelés en dernier (EF-5.1, RG-9) | Glisser la poignée, ou la ligne après un appui maintenu : déplacer le rayon ; « Remettre l'ordre d'origine » : revenir à l'ordre de 7.4 ; « Enregistrer » : appliquer l'ordre affiché ; « Annuler » : quitter sans rien changer |
| **Compte** (hors onglets, sans session) | Connexion, inscription, « Vérifie ta boîte mail », mot de passe oublié, « C'est envoyé », nouveau mot de passe, lien expiré (EF-5.8 à EF-5.10) ; « Nouveau mot de passe » sert aussi depuis les Réglages | Routes protégées par la session (`Stack.Protected`) ; les liens des e-mails y mènent (5.2) |

Règle transversale (ENF-8) : la Liste, le panneau Ajouter et l'onglet Produits n'affichent jamais les mots « rythme » ni « stock » ; ils disent « il t'en reste environ 2 » et « proposé parce que tu en prends chaque semaine ».

### 6.4 PWA (phase A)

- Build web par `expo export --platform web`, sortie statique servie par un Worker Cloudflare sans code (fichiers statiques seuls, `apps/mobile/wrangler.jsonc`, plan gratuit) sur le domaine `commedab.app`, déployé par `pnpm deploy:web` ; HTTPS obligatoire pour le service worker et OPFS. Cloudflare Pages, d'abord retenu, est désormais redirigé vers Workers par Wrangler.
- Expo ne génère ni manifeste ni service worker : le manifeste est écrit à la main (`display: standalone`, icônes, couleur de thème), et le service worker est écrit après le build par `apps/mobile/scripts/service-worker.mjs`, avec la liste des fichiers du build, sans dépendance. Il met en cache tout le build à l'installation, sauf les source maps et les variantes de SQLite inutilisées ; un fichier du site absent du cache y entre à sa première lecture, et une navigation reçoit toujours la page de l'app en cache : l'app se lance sans réseau. Une nouvelle version s'installe à la navigation suivante, prend la main aussitôt, et la page se recharge une fois. Les données ne passent pas par ce cache : elles sont dans SQLite via OPFS (2.6), et Supabase et PowerSync, sur d'autres domaines, ne sont jamais interceptés.
- Base locale web configurée avec `OPFSCoopSyncVFS` (2.6). Première tâche du projet : un écran vide qui ouvre la base, l'écrit, se ferme et relit, testé sur l'iPhone cible en mode plein écran.
- Sur iOS, pas d'invite d'installation : l'app affiche une fois une aide « Partager → Sur l'écran d'accueil » si elle est ouverte dans Safari.

### 6.5 Hors ligne et synchronisation dans l'interface

- Aucune action n'attend le réseau ; toute écriture est locale puis synchronisée (2.1). Seules les opérations du compte (connexion, mot de passe, export, suppression) en ont besoin ; hors ligne, les sections Compte et Mes données des Réglages sont désactivées, l'interrupteur du catalogue compris, bien que son écriture soit locale (EF-6.3).
- `data` publie l'état de connexion du moteur de synchro ; hors ligne, les écrans affichent le bandeau d'EF-6.3 sous leur en-tête, jamais un écran bloquant.
- `data` publie aussi les identifiants des lignes dont une écriture attend l'envoi (file du connecteur, 5.4) : les écrans les rendent en attente (`pending`, 11.3), utilisables.
- Une commande qui échoue rend son erreur ; l'écran affiche le message éphémère « Pas enregistré — Réessayer », dont l'action relance la même commande (EF-6.4). Un refus du serveur (5.4) est journalisé sur l'appareil, affiche le même message, dont l'action relance l'envoi de la même écriture, et remonte dans Sentry, sans les données de la ligne (9.5) ; la ligne reste en attente tant qu'elle n'est pas acceptée. Le MVP n'a pas d'écran de diagnostic.

### 6.6 Conventions pour le développement assisté

Un `CLAUDE.md` à la racine fixe ce que Claude Code doit respecter : la frontière `core` / `data` / `mobile` (2.9), l'interdiction de SQL et de PowerSync dans les écrans, les tests de `core` à écrire avant toute formule (4.8), le vocabulaire utilisateur (ENF-8), et la commande de vérification à exécuter avant chaque commit (typage, lint, tests). Les décisions de ce document y sont référencées par numéro de section plutôt que recopiées.

### 6.7 Points tranchés le 19/10/2026

1. Décidé le 19/10/2026 : NativeWind.
2. À vérifier au premier prototype (pas une décision) : sur la PWA iOS en plein écran, la barre d'onglets dessinée par Expo Router sur le web doit rester visible au-dessus de la barre d'accueil de l'iPhone (zone de sécurité basse, `env(safe-area-inset-bottom)`).

## 7. Catalogue par défaut

**Statut : décidé le 26/10/2026, révisé le 29/10/2026.** Répond à la question laissée ouverte par les spécifications fonctionnelles (constitution du catalogue).

### 7.1 Nature

Le catalogue est un **fichier de données livré avec l'application**, dans `packages/core/catalog/`, et non une table : pas de synchro, pas de serveur, disponible hors ligne au premier lancement, versionné avec le code. Il sert à pré-remplir un produit (EF-3.7), à nourrir la recherche du panneau Ajouter (EF-2.7) et à fournir les rythmes indicatifs (5.1 FS). Il ne contient jamais de marques ni de codes-barres (3.1 FS).

### 7.2 Format

JSON, un fichier par rayon pour rester relisible (`packages/core/catalog/<category_key>.json`), assemblés par `core` au chargement ; les champs facultatifs sont absents plutôt que nuls. Schéma vérifié dans `core` par une fonction de validation écrite à la main (aucune dépendance, 6.1) ; une entrée :

```json
{
  "id": "lait-demi-ecreme",
  "name": "Lait demi-écrémé",
  "aliases": ["lait"],
  "category_key": "cremerie",
  "unit_label": "bouteille",
  "pack_size": 6,
  "contents_qty": 1,
  "contents_unit": "l",
  "rate_qty": 1,
  "rate_per_days": 7
}
```

| Champ | Règle |
| --- | --- |
| `id` | Slug stable, jamais renommé (sert de clé dans `product.catalog_entry_id`) |
| `name`, `aliases` | Français, sans marque ; les alias couvrent les façons courantes de taper (« PQ », « coca » → « soda au cola ») |
| `category_key` | Référence une catégorie du jeu par défaut (7.4) |
| `unit_label` | Unité comptée (RG-1) : « pièce », « bouteille », « kg »… |
| `pack_size` | Conditionnement le plus courant en magasin, en unités ; 1 par défaut |
| `contents_qty`, `contents_unit` | Facultatifs : contenance d'une unité, pour les recettes (4.6) |
| `rate_qty`, `rate_per_days` | Facultatifs, toujours ensemble : `rate_qty` unités par `rate_per_days` jours pour une personne (1 tube de dentifrice par 42 jours, 1 bouteille de lait par 7 jours) |

Un champ `catalog_version` (entier) est porté par le fichier assemblé et copié dans `product.catalog_version` à la création (RG-8).

### 7.3 Constitution

1. **Génération assistée** : Claude produit un premier jet de 250 à 300 entrées à partir de la liste des catégories, par lots de catégorie, avec consigne de rester générique et de donner des rythmes plausibles pour un adulte en France.
2. **Relecture manuelle** complète par l'auteur, qui corrige noms, alias et rythmes ; cette relecture est le vrai contrôle de qualité, l'étape 1 ne fait que gagner du temps.
3. **Tests automatiques** sur le fichier assemblé : identifiants uniques, `category_key` existant, `pack_size` strictement positif, champs de rythme présents ensemble ou absents ensemble, rythmes dans une plage plausible (0,003 à 5 unités/jour, soit d'une unité par an à cinq par jour), contenance en g, kg, ml, cl ou l, aucun nom ni alias normalisé porté par deux entrées (un mot tapé désigne au plus une entrée).
4. **Enrichissement par l'usage** : les produits créés par les utilisateurs sans correspondance catalogue (EF-2.8) sont agrégés côté serveur par une requête sur `product.name_normalized`, exécutée à la main par l'auteur, limitée aux comptes qui ne l'ont pas désactivée (`household.catalog_contribution`, EF-5.4, activée par défaut), ne retenant que les noms présents dans au moins 5 comptes distincts et sans aucun rattachement à un compte. Les plus fréquents sont ajoutés au catalogue, relus comme en 2. Cet usage agrégé est déclaré dans la politique de confidentialité (section 8).

Taille visée au MVP : 250 à 300 entrées, soit l'essentiel des courses courantes en France ; un catalogue trop grand nuit à la recherche plus qu'il n'aide.

### 7.4 Rayons par défaut

Créées pour chaque nouveau compte (5.6) dans l'ordre de parcours d'un hypermarché courant, réordonnables ensuite (EF-5.1) :

1. Hygiène et beauté — `hygiene-beaute`
2. Bébé et animaux — `bebe-animaux`
3. Entretien et maison — `entretien-maison`
4. Fruits et légumes — `fruits-legumes`
5. Boulangerie — `boulangerie`
6. Épicerie salée (pâtes, riz, conserves, sauces) — `epicerie-salee`
7. Épicerie sucrée (petit-déjeuner, biscuits, chocolat) — `epicerie-sucree`
8. Boissons — `boissons`
9. Crémerie (lait, yaourts, fromage, œufs) — `cremerie`, `system_key: fresh`
10. Viande, poisson, traiteur — `viande-poisson-traiteur`, `system_key: fresh`
11. Surgelés — `surgeles`, `system_key: frozen`

Le rayon est nommé sans sa parenthèse (« Épicerie salée »). La clé (`category.key`) rattache une entrée du catalogue au rayon du compte. Le jeu est défini par `DEFAULT_CATEGORIES` dans `core` ; le trigger d'inscription (5.6) en garde une copie identique.

Les deux clés système garantissent RG-9 : quel que soit l'ordre choisi par l'utilisateur, les rayons frais et surgelés restent en fin de parcours.

### 7.5 Recherche

La recherche du panneau Ajouter (EF-2.7), reprise pour les ingrédients d'une recette (EF-4.2), est implémentée dans `core`, sans dépendance :

- Normalisation commune (minuscules, sans accents, sans ponctuation) des requêtes, des noms de recettes et de produits, des noms et alias du catalogue ; `product.name_normalized` est calculé à l'écriture.
- En tête, seul, le résultat exact : le produit dont le nom normalisé est la requête, à défaut l'entrée du catalogue proposable dont le nom ou un alias l'est ; à défaut encore, la même comparaison au pluriel près (`s` ou `x` final retiré des mots de plus de trois lettres). `submitResult` donne ce que la touche Entrée ajoute : ce résultat exact, sinon rien ; un nom inconnu ne se crée jamais à la touche.
- Puis les résultats par groupes, dans cet ordre : recettes, produits de l'utilisateur (archivés compris), entrées du catalogue, puis « Créer « … » ». Dans chaque groupe, les noms dont un mot commence par la requête précèdent ceux qui la contiennent ; à égalité, les produits les plus achetés remontent (nombre d'achats).
- Une entrée du catalogue dont l'utilisateur a déjà tiré un produit (même `catalog_entry_id` ou même nom normalisé) n'est pas proposée une seconde fois.
- « Créer « … » » est toujours proposé en dernier, sauf si la requête normalisée est exactement le nom d'un produit de l'utilisateur ; si elle est exactement le nom ou un alias d'une entrée du catalogue, le produit est créé depuis cette entrée et prend son nom (EF-2.8), sauf si un produit en est déjà tiré : il est alors créé sans entrée.
- « Créer la recette « … » » suit, dans le panneau Ajouter seulement (recherche avec recettes), sauf si la requête normalisée est exactement le nom d'une recette.
- Avant toute saisie, « Tous tes produits » liste les produits non archivés du plus acheté au moins acheté (EF-2.2).
- Pas de recherche floue au MVP ; les alias couvrent les variantes courantes. Une tolérance aux fautes (distance de Levenshtein sur les mots courts) est prévue si l'usage montre des échecs de recherche fréquents.
- Volume : 300 entrées de catalogue et quelques centaines de produits, recherche en mémoire à chaque frappe sans index, sous la milliseconde.

### 7.6 Mise à jour

- Une nouvelle version du catalogue arrive avec une mise à jour de l'app ; elle n'écrit jamais dans `product` (RG-8).
- Les entrées ne sont jamais supprimées, seulement marquées `deprecated: true` pour rester résolubles par les produits existants.
- Une entrée corrigée (rythme plus juste) ne touche que les produits créés après ; l'utilisateur garde ce qu'il a réglé.

### 7.7 Points tranchés le 19/10/2026

1. Catalogue fourni dès le départ (250 à 300 entrées), puis enrichi par l'agrégation des produits créés par les utilisateurs (7.3, étape 4).
2. Ordre des rayons : non alimentaire en premier (hygiène, bébé et animaux, entretien), puis alimentaire, frais et surgelés en dernier.

## 8. Sécurité et données personnelles

**Statut : décidé le 26/10/2026, révisé le 29/10/2026.**

### 8.1 Données traitées

| Donnée | Finalité | Base |
| --- | --- | --- |
| E-mail, mot de passe haché (ou identifiant Google ou Apple) | Compte et connexion | Supabase Auth |
| Produits, achats, liste, recettes, ordre des rayons | Le service lui-même | Tables du household |
| Choix « Aider à améliorer le catalogue » | Agrégation anonyme des noms de produits (7.3) | `household.catalog_contribution` |
| Journal des échecs de synchronisation | Dépannage (6.5) | Appareil uniquement |

L'application ne collecte **aucune** donnée de localisation, aucun prix, aucun identifiant publicitaire, aucune analyse d'usage tierce (ENF-5). Le seul usage secondaire des données est l'agrégation anonyme des noms de produits pour le catalogue (7.3, étape 4), activée par défaut et désactivable dans les Réglages (EF-5.4), limitée aux noms présents dans au moins 5 comptes, et déclarée dans la politique de confidentialité.

### 8.2 Protection

- **En transit** : HTTPS imposé partout (Supabase, PowerSync, hébergement web) ; aucun point d'entrée en clair.
- **Au repos côté serveur** : chiffrement des volumes assuré par Supabase et PowerSync ; sauvegardes quotidiennes Supabase à partir du plan Pro, export JSON hebdomadaire par script sur le plan gratuit (section 9).
- **Au repos sur l'appareil** : base SQLite sous la protection du système (bac à sable iOS et Android, verrouillage de l'appareil) ; sur le web, OPFS est isolé par origine. Pas de chiffrement applicatif de la base au MVP : les données ne sont pas sensibles au sens du RGPD, et le chiffrement local compliquerait OPFS sur Safari. À reconsidérer si des données plus sensibles entraient dans le périmètre.
- **Autorisation** : exclusivement par RLS sur `household_id` (5.5) ; aucune clé de service n'est embarquée dans l'app. Les clés publiques (`anon key` Supabase, URL PowerSync) sont par nature exposées et ne donnent accès qu'à ce que RLS autorise.
- **Secrets** : clé de service Supabase, jetons PowerSync et identifiants de déploiement vivent dans les variables d'environnement du CI et du poste de l'auteur, jamais dans le dépôt (`.env` ignoré, `.env.example` commité).

### 8.3 Compte

- Mot de passe : 8 caractères minimum (EF-5.9), vérification contre les listes de mots de passe compromis (option Supabase Auth), pas de règles de composition.
- Adresse confirmée par un lien avant toute session ; réinitialisation par un lien valable une heure, sans révéler si l'adresse a un compte (5.2) ; sessions longues avec jeton de rafraîchissement (pas de reconnexion quotidienne).
- Suppression du compte depuis l'app (EF-5.6) par la fonction `delete_account()` (5.6) : le compte et toutes les données de son household, effective immédiatement, sans délai de rétention.
- Export en JSON (EF-5.5), envoyé à l'adresse du compte par la fonction `export-data` (contenu en 5.6) : seule cette adresse le reçoit.

### 8.4 Obligations

- Politique de confidentialité et mentions légales publiées sur le site de la PWA et liées depuis l'app ; obligatoires pour le store en phase C.
- Registre des traitements : un document court, tenu par l'auteur, qui liste les données de 8.1, les sous-traitants (Supabase, PowerSync, hébergeur web, Google et Apple pour la connexion, serveur SMTP des e-mails du compte et de l'export) et leurs régions d'hébergement. Les projets Supabase et PowerSync sont créés dans une région de l'Union européenne.
- Pas de cookies ni de traceurs sur la PWA : aucune bannière de consentement nécessaire.
- Agrégation des noms de produits activée par défaut (EF-5.4) : elle repose sur l'intérêt légitime d'améliorer le catalogue, et non sur un consentement. Un nom de produit peut révéler une donnée de santé (un médicament, un produit pour régime), catégorie particulière au sens de l'article 9 du RGPD ; l'absence de tout rattachement à un compte, le seuil de 5 comptes, l'interrupteur visible dans les Réglages et la déclaration dans la politique de confidentialité limitent ce risque sans le supprimer. Le choix est à réexaminer avant la phase C, qui ouvre l'app à d'autres utilisateurs.

### 8.5 Côté client

- Validation de toutes les entrées dans `core`, par des fonctions écrites à la main (aucune dépendance, 6.1), avant écriture ; les contraintes Postgres restent la garantie finale.
- Pas de rendu de HTML issu des données ; les noms de produits et de recettes sont affichés comme texte.
- Dépendances : audit automatique au CI (section 9) ; mises à jour mensuelles.

### 8.6 Point tranché

1. Décidé le 20/10/2026 : pas de chiffrement applicatif de la base locale au MVP.

## 9. Qualité, CI/CD et exploitation

**Statut : décidé le 26/10/2026.**

### 9.1 Tests

| Niveau | Périmètre | Outil | Règle |
| --- | --- | --- | --- |
| Unitaires | `core` : moteur (4.8), recherche (7.5), validation du catalogue (7.3) | Vitest | Écrits avant le code ; 100 % des formules couvertes par une fixture ; exécution en moins de 10 secondes |
| Intégration | `data` : dépôts et commandes contre une base SQLite en mémoire ; connecteur contre le projet Supabase de développement, schéma de test réinitialisé | Vitest, Docker | Vérifie les règles 3.3 (une ligne non cochée par produit, réactivation d'un produit archivé), 5.4 (idempotence, `delete` limité aux achats) et 5.5 (achat à la coche idempotent, un compte par household) |
| Bout en bout | Les parcours de 8 FS (première liste, courses, ajout manuel, suggestions, recette) | Maestro sur natif, Playwright sur web | Exécutés avant chaque livraison, pas à chaque commit |
| Manuel | Le parcours de phase A sur l'iPhone réel (OPFS, plein écran, hors ligne en magasin) | Liste de contrôle dans le dépôt | À chaque changement de la couche de stockage ou de synchro |

Le moteur est la seule partie où la couverture est exigée ; ailleurs, les tests suivent les bugs rencontrés.

### 9.1 bis Hébergement du code et licence

**Décidé le 20/10/2026.**

- **GitHub**, dépôt **public** dès le premier commit : le projet fait partie d'un portfolio, et GitHub est l'hébergeur que lisent les recruteurs et les outils (Actions, Pages, intégrations Expo, Supabase, Sentry, Claude Code).
- **Licence AGPL-3.0** : toute redistribution ou exploitation du code comme service doit republier ses modifications sous la même licence, ce qui exclut un clone commercial fermé tout en gardant le code ouvert. L'auteur unique conserve la possibilité d'une double licence commerciale ; tout contributeur externe signe un accord de contribution (CLA) pour la préserver.
- **Publiable dès le départ** : README qui présente le problème, une démonstration et les choix techniques ; `LICENSE` ; `SECURITY.md` pour les signalements de vulnérabilité ; `.env.example` ; aucun secret jamais commité, l'historique étant public (8.2).
- Le nom et le logo de l'application ne sont pas couverts par la licence et pourront être protégés séparément.
- **Nom de l'application : Commedab** (figé le 26/10/2026, « comme d'hab »). Domaine : `commedab.app` (principal, PWA), enregistré par l'auteur chez Cloudflare le 05/11/2026 ; `commedab.fr` (« COMDAB », Paris) et `commedab.com` (chez OVH) sont détenus par un tiers depuis avril 2025, sans conséquence pour une app vivant sur `.app`. L'orthographe « Commedhab » a été écartée : `commedhab.app` a été enregistré par un tiers le 23/10/2026. Reste à vérifier à l'INPI (classes 9 et 42) : « Commedab », « Comdab », « Comme d'hab ». Identifiants dérivés : dépôt GitHub `commedab`, identifiant de bundle `app.commedab`, nom affiché « Commedab », description du dépôt : « La liste de courses qui apprend tes habitudes : elle estime ce qu'il te reste et propose ce qui va manquer, sans inventaire. »

### 9.2 Outillage

- pnpm, TypeScript strict, ESLint (configuration Expo) et Prettier ; une commande `pnpm check` enchaîne typage, lint et tests unitaires, exigée avant tout commit et référencée dans `CLAUDE.md` (6.6).
- Conventional Commits pour que l'historique reste lisible et que les notes de version se génèrent.
- Migrations Supabase versionnées dans `supabase/migrations`, appliquées par le CLI ; jamais de modification manuelle du schéma en production.

### 9.3 Environnements

| Environnement | Rôle | Backend |
| --- | --- | --- |
| Local | Développement, tests d'intégration | Projet de développement cloud (ligne suivante) ; pas d'instance locale |
| Développement (cloud) | Tests sur appareil pendant le développement | Projet Supabase et instance PowerSync de développement (gratuits) |
| Production | Usage réel, dès la phase A | Projet Supabase et instance PowerSync de production (gratuits, puis Pro si la pause hebdomadaire devient gênante) |

Les deux projets gratuits sont dans la limite de Supabase (2 projets actifs) et de PowerSync (2 instances).

Projets Supabase : `commedab-dev` (`crflkgpbfapygnsgpvgm`) et `commedab-prod` (`stxqttrhkvvlgnywgevr`), tous deux en `eu-west-1`. `supabase/config.toml` décrit la production ; le développement n'en diffère que par ses adresses (`dev.commedab.app` et le serveur de développement Expo), dans `[remotes.development]`. `supabase/deploy.sh <référence>` applique au projet les migrations, la configuration Auth, la fonction d'export et ses secrets. Deux PWA, deux Workers Cloudflare : `commedab.app` sur la production (`.env.production`, `pnpm deploy:web`), et `dev.commedab.app`, version de test sur le projet de développement (`.env`, `pnpm deploy:web:dev`), où l'on essaie tout sans toucher aux données réelles ; le serveur de développement Expo utilise aussi le projet de développement.

### 9.4 Intégration et livraison continues

GitHub Actions, un seul flux :

1. Sur chaque poussée : `pnpm check`, audit des dépendances.
2. Sur la branche principale : application des migrations sur l'environnement de développement, build web, déploiement sur l'hébergeur statique de développement.
3. Sur un tag de version : migrations en production, build web en production (phase A) ; en phase B, build iOS par EAS ou en local sur le Mac, envoi sur TestFlight ; en phase C, soumission au store.

Les règles de synchro PowerSync sont déployées par le CLI PowerSync dans la même étape que les migrations, pour que schéma et règles avancent ensemble.

### 9.5 Exploitation

- **Erreurs** : Sentry (plan gratuit) sur l'app et le web, sans données personnelles dans les événements (noms de produits exclus des messages d'erreur, ni adresse IP ni e-mail : `sendDefaultPii` faux), erreurs seulement, sans suivi de performance ni rejeu de session. Le DSN est public (`EXPO_PUBLIC_SENTRY_DSN`) ; vide, rien n'est envoyé. Remontent les exceptions, les écritures refusées (5.4) et une base de l'appareil qui ne s'ouvre pas ou une synchro qui échoue. Le déploiement web envoie les source maps du build quand le jeton `SENTRY_AUTH_TOKEN` est présent (`apps/mobile/.env.sentry-build-plugin`, ignoré par git).
- **Sauvegardes** : plan gratuit Supabase sans sauvegarde automatique ; chaque dimanche, le flux GitHub Actions `backup` exporte la base de production par le CLI (`supabase db dump` : rôles, schéma, données, comptes compris) et dépose l'archive dans un bucket Cloudflare R2 privé, où une règle de cycle de vie efface les archives de plus de 90 jours. L'archive contient les adresses e-mail et les empreintes des mots de passe : le bucket n'a ni accès public ni lien de partage. Restauration décrite dans `supabase/README.md`. Supprimé si passage au plan Pro.
- **Surveillance** : tableau de bord PowerSync (usage, erreurs de synchro) et Supabase (requêtes lentes) ; aucune alerte au MVP au-delà des e-mails des deux services.
- **Pause hebdomadaire** des projets gratuits (2.6) : chaque jour, le flux GitHub Actions `keep-alive` ouvre sur chacun des deux environnements une session d'un compte de veille (un compte ordinaire, au household vide, qui ne sert qu'à cela), lit une ligne par l'API Supabase puis ouvre une connexion de client à PowerSync : Supabase compte les requêtes en base, PowerSync les connexions de clients, et une requête sans session ne compte pour aucun des deux. Un échec arrive par e-mail de GitHub. GitHub suspend les flux planifiés d'un dépôt resté 60 jours sans activité : à relancer après une longue absence. Supprimée au passage en Pro.

### 9.6 Points tranchés

1. Décidé le 20/10/2026 : pas de Supabase local ; le développement utilise directement le projet cloud de développement. Les tests d'intégration du connecteur (9.1) tournent contre ce même projet, sur un schéma dédié réinitialisé avant chaque exécution.
2. Décidé le 20/10/2026 : Sentry dès la phase A.

## 10. Contraintes pour les évolutions hors MVP

**Statut : validé le 20/10/2026, révisé le 29/10/2026.** Pour chaque évolution des spécifications fonctionnelles (section 11), ce que le MVP doit déjà respecter et ce qui restera à faire.

| Évolution | Déjà prévu dans le MVP | Reste à faire le moment venu |
| --- | --- | --- |
| 1. Planning des repas par créneau | Recettes en base, `list_recipe` et son nombre de fois, `list_line.origin = recipe` | Table `meal_slot` (household, date, moment, recette) ; la période de la liste dérivée du planning |
| 2. Catalogue de recettes et suggestions | Modèle de recette ; `missingIngredients` dans `core` | Source de recettes (import par URL en priorité), classement par ingrédients manquants |
| 3. Prix et budget | Rien de bloquant ; l'achat (`stock_event`) est l'endroit naturel d'un prix | Colonne `price` nullable sur l'achat, agrégats par session de courses |
| 4. Pause de consommation (absence) | Le moteur reçoit la date courante en paramètre (4.1) | Table `household_pause` (début, fin) ; le moteur soustrait les jours de pause du temps écoulé |
| 5. Durée de conservation, alerte de péremption | Dates d'achat ; le catalogue et `product` acceptent une colonne de plus | Colonne `shelf_life_days` sur `product` et dans le catalogue ; borne de la quantité suggérée, avec ses fixtures ; alerte en natif seulement (phase B) : Expo Notifications, calcul local quotidien par tâche en arrière-plan, aucune Edge Function |
| 6. Partage de la liste, répartition des courses | Données rattachées au household et non au compte, RLS et synchro par household (2.5) | Table d'invitation et fonctions serveur pour rejoindre et quitter un household, e-mail des membres ; puis colonne `assigned_to` nullable sur `list_line` (ou affectation par rayon), filtre « ma part » sur la Liste |
| 7. Saisie en langage naturel | Champ d'ajout unique, recherche dans `core` (7.5) | Fonction pure `parseAddInput("3kg de pomme de terre")` → `{ name: "Pomme de terre", qty: 3, unit: "kg" }` dans `core`, avec ses fixtures ; quantité convertie en packs comme un ingrédient (4.6) |
| 8. Autres fournisseurs d'identité | Supabase Auth (5.2) | Configuration du fournisseur, bouton de connexion |
| Liens universels (phase B) | Liens profonds par le schéma `commedab://` (5.2) | Domaine de la PWA associé à l'application (`associatedDomains`, fichier `apple-app-site-association`), liens des e-mails en `https` |
| 9. Changement d'adresse e-mail | Modèle d'e-mail écrit et versionné, liens profonds (5.2) | Écrans de saisie et de confirmation de la nouvelle adresse (`updateUser`), activation de la double confirmation de Supabase |
| Import de commandes drive | `stock_event.type`, `list_line_id` nullable | Edge Function d'import, correspondance produits drive → produits génériques, achats sans ligne de liste |
| Code-barres | Produit générique | Table `product_barcode` (code, produit) ; scan natif (phase B) ; variantes rattachées au produit générique |

### 10.1 Invariants à ne jamais casser

1. Toute donnée métier porte `household_id` ; jamais `user_id` hors `household_member`.
2. Le stock reste dérivé : aucune évolution n'introduit de colonne de stock persistée et synchronisée.
3. Le moteur reste pur et sans effet de bord ; une nouvelle règle est une nouvelle fonction avec ses fixtures.
4. Les écrans ne voient ni SQL ni PowerSync ; une évolution passe par un nouveau dépôt ou une nouvelle commande dans `data`.
5. Le catalogue n'écrit jamais dans `product`.
6. Aucune fonction serveur n'est nécessaire à l'usage quotidien ; elles n'existent que pour l'inscription, l'export, la suppression de compte et, plus tard, le partage et les imports.

## 11. Design system

**Statut : décidé le 30/10/2026.**

`docs/design/` décrit l'apparence de l'application : `design-system.md` (principes, couleur, typographie, formes, tailles, états, mouvement, retours, iconographie, voix), `components.md` (un guide par composant), `tokens.json` (les valeurs, en thème clair et sombre) et `maquettes/` (une planche par écran et par état). Les spécifications restent la source du comportement ; un désaccord entre une planche et les spécifications se règle dans les spécifications, et `docs/design/` suit.

### 11.1 Jetons

`docs/design/tokens.json` est la seule source des valeurs : aucune couleur, taille, rayon, opacité ni durée n'est écrite en dur ailleurs, et aucune valeur n'en est recopiée à la main. Seule exception : les couleurs du logo Google sur son bouton de connexion (11.2). `tailwind.config` de NativeWind lit ce fichier au chargement et en dérive son thème :

| Groupe de `tokens.json` | Dans NativeWind |
| --- | --- |
| `color` | Une classe par jeton (`bg-surface`, `text-ink-muted`, `border-line-strong`), dont la valeur est la variable CSS `--<jeton>` ; les variables sont valuées pour le thème clair et redéfinies pour le sombre, posées à la racine de l'application depuis le même fichier, et le thème suit le schéma de couleurs du système (`dark:`) |
| `type` | `fontFamily` : `display` = Fraunces (600, 500), `sans` = Manrope (500, 600, 700), chargées par `@expo-google-fonts/fraunces` et `@expo-google-fonts/manrope` ; une taille de texte par style (`title-screen`, `sentence`, `body`…), avec sa graisse et son espacement de lettres, sans hauteur de ligne |
| `spacing` | `spacing` : `1`, `2`, `3`, `4`, `6`, `8` |
| `radius` | `borderRadius` : `field`, `card`, `sheet`, `pill` |
| `size` | Hauteurs minimales des contrôles (`control-sm`, `control`, `control-lg`, `row`, `tab-bar`), hauteur de la barre de progression (`progress`), tailles de la case et des icônes (`icon`, `icon-sm`, `icon-xs`, `icon-lg`), de l'interrupteur et de son pouce (`toggle-w`, `toggle-h`, `toggle-thumb`) |
| `border`, `duration` | Épaisseurs de bordure ; durées des animations, ramenées à 0 quand le système réduit les animations |
| `opacity`, `scale` | Lus par `src/theme` (`opacity.disabled`, `opacity.pending`, `opacity.busy`, `opacity.pressed`, `opacity.pulse`, `scale.pressed`) pour les états des composants |

- **Thème sombre dès le MVP** : il suit le système (`userInterfaceStyle: automatic` dans `app.json`), ou le choix fait dans les Réglages (« Comme l'appareil », « Clair », « Sombre »), gardé sur l'appareil hors de toute session (`localStorage` sur le web, trousseau en natif). Sur le web, `public/theme.css`, écrit depuis `tokens.json`, peint le fond `ground` de la page avant l'app, et le thème de navigation d'Expo Router prend les couleurs des jetons : aucun écran ne passe par du blanc.
- **Dynamic Type** (iOS) respecté : les tailles de texte suivent le réglage de l'appareil, aucune hauteur de ligne n'est figée, les tailles de `size` sont des minimums et les contrôles grandissent avec leur texte. Tout contrôle de 36 px (`control-sm`) reçoit un `hitSlop` qui porte sa zone de tap à 44 px (ENF-1).

### 11.2 Icônes

Phosphor, par `phosphor-react-native` : graisse *regular* partout, *fill* pour l'onglet actif, *bold* pour la coche, couleur héritée du texte. Le jeu est fermé ; une icône s'y ajoute avec un rayon ou un geste, jamais en décoration, et jamais sur une ligne de produit, un titre ou une carte recette.

| Usage | Icônes |
| --- | --- |
| Onglets | `ListChecks`, `Basket`, `ChefHat`, `Sliders` |
| Utilitaires | `MagnifyingGlass`, `Check`, `CaretLeft`, `CaretRight`, `CaretDown`, `Plus`, `Minus` (stepper), `X`, `WifiSlash`, `DotsSixVertical` (poignée de l'ordre des rayons), `EnvelopeSimple` (e-mails du compte) |
| Recette | `ChefHat` |

Une icône par rayon du jeu par défaut (7.4), indexée par sa clé, plus « À classer » :

| Rayon | Icône |
| --- | --- |
| À classer (sans rayon) | `DotsThreeCircle` |
| `hygiene-beaute` | `HandSoap` |
| `bebe-animaux` | `Baby` |
| `entretien-maison` | `SprayBottle` |
| `fruits-legumes` | `Carrot` |
| `boulangerie` | `Bread` |
| `epicerie-salee` | `Grains` |
| `epicerie-sucree` | `Cookie` |
| `boissons` | `Wine` |
| `cremerie` | `Cheese` |
| `viande-poisson-traiteur` | `Cow` |
| `surgeles` | `Snowflake` |

Les noms des rayons sont ceux de 7.4, qui priment sur ceux des planches et de `components.md` (Icons). Les boutons « Continuer avec Google » et « Continuer avec Apple » portent le logo de chaque fournisseur, selon ses règles de marque, hors du jeu Phosphor.

### 11.3 Composants

- Un composant React Native par entrée de `components.md`, sous le même nom, dans `apps/mobile/src/components` : `AddControl`, `Button`, `ConfirmSheet`, `Estimate`, `LineSheet`, `ListRow`, `Pill`, `ProgressBar`, `RecipeCard`, `RecipeChip`, `ScreenHeader`, `SearchField`, `SettingField`, `States`, `SuggestionRow`, `TabBar`, `TextInput`, `Toast`, `Toggle` ; les icônes (`Icons`) sont un module de correspondance (11.2).
- Les états portent les noms des guides, en propriétés booléennes ou en variantes : `pressed`, `disabled`, `loading`, `pending`, `highlight`, `checked`, `complete`, `selected`, `field`. Les classes CSS des guides (`btn-primary`, `is-pending`…) sont des noms, pas du CSS à porter : les aperçus HTML sont une référence visuelle.
- Les composants ne contiennent aucun texte métier : l'écran fournit les libellés, pris dans les exemples de la Voix (`design-system.md`) ou écrits dans la même voix. Seuls les libellés fixés par `components.md` restent dans le composant (« Voir la fiche », « Retirer de la liste », « Annuler », « Fermer »).
- Une galerie interne, route `/gallery`, montre chaque composant dans ses états, en clair puis en sombre ; les Réglages y mènent en développement.

## Correspondance des identifiants

Les sections du moteur ont été renumérotées lors de l'alignement sur les maquettes basse fidélité, et des fixtures supprimées ; cette table relie les anciens identifiants, cités dans l'historique du dépôt, aux nouveaux. Les identifiants des spécifications fonctionnelles ont leur propre table, en fin de ce document-là. L'alignement sur les maquettes haute fidélité n'a renuméroté aucun identifiant ; il a ajouté la fixture T52 et la section 11.

| Ancien | Nouveau |
| --- | --- |
| 4.7 (écart avec RG-5) | supprimée |
| 4.9 | 4.7 |
| T05 à T09, T12, T16, T18 à T21, T24, T27, T28, T32, T33, T40, T42 | supprimées |
| T11 (produit ponctuel) | T11 (produit archivé) |
| T14, T15 (portions, ingrédients de base) | T14, T15 (ingrédients manquants) |
| T29 (conservation) | T29 (arrondi au pack) |
