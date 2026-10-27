# Commedab — Spécifications techniques

## Objet et statut

Ce document fixe les choix techniques de l'application décrite dans les spécifications fonctionnelles v2 (MVP d'un foyer partagé entre ses membres, stock estimé sans inventaire) et éclairée par l'étude de marché. Il est rédigé décision par décision, dans l'ordre où elles se contraignent ; chaque section porte un statut.

| Version | Date | Changements |
| --- | --- | --- |
| 1.0 | 26/10/2026 | Toutes les sections décidées |
| 1.1 | 27/10/2026 | Revue du moteur : cas limites, gardes d'entrée, quantité habituelle hors recette (T22 à T33) |
| 2.0 | 27/10/2026 | Spécifications fonctionnelles v2, résumées ci-dessous |

Changements de la v2 :

- Plus de table `shopping_list` : `list_line` appartient au foyer, la liste est permanente. Cocher crée l'achat (UUID v5 de la ligne), décocher pose son `deleted_at` ; plus de clôture, de `reopenList` ni d'index de liste active (3.3, 5.5).
- Sessions de courses, état des lignes et période de la liste calculés par `core` (`listView`, `resolvePeriod`, 4.9), jamais stockés. `household.default_period_days` devient `period_days`, nul en réglage automatique.
- La suggestion due au seul marqueur « à racheter » vaut jusqu'à la fin de la première session de courses commencée après le marqueur ; les lignes retirées, refusées ou reportées bloquent la suggestion jusqu'à la fin de la session suivante (4.5, 4.9).
- Écrans : quatre onglets Liste, Produits, Recettes, Compte ; plus d'Accueil ni de mode magasin (6.3).
- Foyer partagé dès le MVP : invitation par lien, `household_invitation` hors synchro, fonctions `create_invitation`, `accept_invitation`, `leave_household`, `remove_member` (5.6).
- Agrégation anonyme des noms de produits soumise à l'accord du foyer, `household.catalog_contribution` (7.3, 8.1).

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

## 1. Cible et plan de livraison

**Statut : décidé le 16/10/2026.**

### 1.1 Décision

L'application est développée avec **Expo (React Native)** en TypeScript, avec la cible web activée, et livrée en trois phases à partir du même code.

```
Phase A · PWA ──(80 % de suggestions acceptées ; 99 €/an, un Mac)──▶ Phase B · Natif iOS ──(app jugée satisfaisante ; revue Apple)──▶ Phase C · App Store
Expo web sur l'écran d'accueil        Build iOS du même code, TestFlight          Publication, puis Android,
usage quotidien, coût zéro            persistance native, widgets                 notifications ; web gardé en accès secondaire
```

La phase A sert à valider l'usage sans dépense ; la phase B n'est engagée que lorsque l'estimation a atteint son objectif de qualité ; la phase C ouvre à d'autres utilisateurs.

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
- Critère de sortie : objectif de qualité des spécifications fonctionnelles (80 % de suggestions acceptées sur trois listes consécutives), et satisfaction générale.

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

Le serveur est la source de vérité (serveur-first), mais l'application ne lui parle jamais directement : elle lit et écrit dans une base SQLite locale, réplique des données du foyer, qu'un moteur de synchronisation tient à jour dans les deux sens. Un compte utilisateur existe dès le MVP.

```
App Expo  ◀──▶  SQLite local  ◀──▶  Moteur de synchro  ◀──▶  Supabase
écrans,         réplique du         PowerSync,               Postgres (référence),
moteur TS pur   foyer, écritures    règles par foyer,        Auth, RLS par foyer,
web/iOS/Android en file, hors ligne pousse / tire / rejoue   fonctions serveur
─────────────────── tout est rattaché à un foyer, partagé dès le MVP ───────────────────
```

Ce modèle « réplique locale, autorité serveur » répond aux trois exigences à la fois : hors ligne en magasin (la lecture et l'écriture sont locales), réactivité en un geste (aucun aller-retour réseau), et structure long terme (le partage du foyer en temps réel et le multi-appareil sont le fonctionnement normal du moteur, pas une fonctionnalité à ajouter).

### 2.2 Composants retenus

| Composant | Choix | Rôle |
| --- | --- | --- |
| Base serveur | PostgreSQL via Supabase | Source de vérité, schéma relationnel, Row Level Security par foyer |
| Authentification | Supabase Auth | Compte par e-mail et mot de passe ou Google, Apple en phase B (5.2) ; le foyer n'est pas dans le JWT, les règles de synchro le résolvent par `household_member` |
| Synchronisation | PowerSync | Réplique Postgres vers SQLite sur l'appareil, file d'écritures hors ligne rejouée à la reconnexion, règles de synchro limitant chaque appareil aux données de son foyer |
| Base locale | SQLite : pilote natif du SDK PowerSync React Native (op-sqlite) sur iOS et Android, wa-sqlite sur OPFS pour le web | Lecture et écriture de l'app, requêtes SQL, réactivité |
| Logique serveur | Fonctions Postgres et Supabase Edge Functions, uniquement si nécessaire | Validation d'écritures, tâches planifiées, futur import de commandes |

### 2.3 Options écartées

| Option | Raison du rejet |
| --- | --- |
| API REST classique avec cache hors ligne et file d'attente maison | C'est la voie la plus longue : il faut écrire et tester soi-même la file, la reprise, les conflits ; le partage temps réel devient un second chantier. Les moteurs de synchro ont rendu ce travail inutile. |
| Local-first sans serveur au MVP (export JSON) | Écarté par choix : structure long terme voulue dès le départ, et un changement de téléphone ne doit pas perdre l'historique qui fait la valeur de l'app. |
| Firebase Firestore | Hors ligne et temps réel inclus, mais modèle documentaire mal adapté à un journal d'événements requêté par produit et par date, et dépendance forte à Google. |
| ElectricSQL | Alternative sérieuse sur Postgres, mais son support React Native est plus récent et moins éprouvé que celui de PowerSync, qui a le SDK mobile le plus mature. |
| WatermelonDB avec synchro maison | Base locale réactive reconnue, mais la synchronisation reste à écrire, et sa compatibilité avec la nouvelle architecture React Native demande des correctifs communautaires. |
| Backend auto-hébergé dès le départ | Possible (Supabase et PowerSync sont open source et auto-hébergeables), mais ajoute de l'exploitation avant d'avoir un usage. Conservé comme voie de sortie. |

### 2.4 Pourquoi Supabase et PowerSync ensemble

- Postgres est le bon modèle pour un journal d'événements datés, des agrégats par produit et des règles d'intégrité (RG-6, RG-7).
- PowerSync est conçu pour Postgres et s'intègre à Supabase par un tutoriel officiel ; ses SDK couvrent React Native, Expo et le web, ce qui respecte la contrainte « un seul code » de la section 1.
- Les deux sont open source avec une offre gratuite suffisante pour un usage personnel, et auto-hébergeables si le projet le justifie.
- Les écritures du projet sont presque toutes additives (achats, événements) : les conflits sont rares et se règlent par dernière écriture gagnante (ENF-2), ce qui reste dans le modèle standard du moteur.

### 2.5 Compte et foyer

- Inscription par e-mail à la première ouverture, immédiatement suivie de la création automatique d'un foyer dont l'utilisateur est membre. Aucun autre écran d'initialisation que la taille du foyer (EF-7.1).
- Toute table métier porte une colonne `household_id`, jamais `user_id` : la politique RLS autorise un utilisateur sur les lignes des foyers dont il est membre. Le partage se résume alors à ajouter un membre, par une invitation (EF-7.4, 5.6).
- Les règles de synchro PowerSync sélectionnent les lignes par `household_id` ; un appareil ne reçoit que son foyer.

### 2.6 Limites et points de vigilance

- Un projet Supabase gratuit se met en pause après une semaine sans activité et doit être relancé depuis le tableau de bord ; sans effet en usage quotidien, à surveiller en vacances. Le plan Pro (25 $/mois) supprime cette pause si besoin.
- PowerSync Cloud, plan Free (vérifié le 19/10/2026 sur powersync.com/pricing) : 2 Go synchronisés par mois, 500 Mo hébergés sur le service, 50 clients simultanés en pointe, 2 instances, 1 connexion à la base source par instance, support communautaire ; très au-dessus des besoins d'un foyer. Même règle que Supabase : désactivation après une semaine d'inactivité, réactivation manuelle. Le plan Pro (à partir de 49 $/mois) supprime la désactivation. L'édition open source reste auto-hébergeable en secours.
- PowerSync impose son modèle : les tables synchronisées sont déclarées dans un schéma client et des règles de synchro ; le modèle de données (section 3) doit être conçu avec ces contraintes (clés UUID, colonnes simples, pas de jointures côté synchro).
- Sur le web, la base locale repose sur wa-sqlite et le stockage du navigateur. Vérifié dans la documentation du SDK web (19/10/2026) : Safari et Safari iOS sont pris en charge à condition d'utiliser le système de fichiers virtuel OPFSCoopSyncVFS, recommandé explicitement pour Safari/iOS ; l'implémentation IndexedDB y est instable, et l'erreur « Maximum call stack size exceeded » signalée sur Safari se corrige par ce même choix. Limites connues : OPFS ne fonctionne pas en navigation privée, et le multi-onglet repose sur des workers partagés désactivés sur iOS (sans effet pour une PWA plein écran). Le stockage OPFS étant une donnée de site, il est purgé par iOS après sept jours sans ouverture : le serveur étant la référence, l'appareil se resynchronise simplement. Décision : configurer OPFSCoopSyncVFS dès le squelette du projet et le tester sur un iPhone réel avant tout autre développement. Vérifié le 27/10/2026 sur l'iPhone cible, en PWA plein écran : la base est écrite, fermée et relue, et persiste après fermeture de l'app et redémarrage de l'iPhone (`docs/checklists/iphone-pwa.md`).

### 2.7 Conséquences pour les sections suivantes

- Section 3 : identifiants UUID générés côté client, horodatages UTC, colonne `household_id` partout, suppression logique.
- Section 4 : le moteur d'estimation s'exécute sur l'appareil, en lisant SQLite ; il n'a pas besoin du serveur.
- Section 5 : pas d'API REST à concevoir pour le MVP ; la section décrit les règles de synchro, les politiques RLS et les rares fonctions serveur.

### 2.8 Montée en charge

L'architecture est la même à 1 et à 100 000 foyers ; seuls les plans tarifaires changent.

- **Unité de scale = le foyer.** Chaque appareil ne synchronise que les lignes de son `household_id` ; la charge par client est constante quelle que soit la taille de la base. Le catalogue, seul contenu commun, est livré avec l'application et non synchronisé.
- **Volume par foyer faible** : quelques achats et événements par jour, de l'ordre de 1 à 3 Mo synchronisés par mois et par foyer. Le plan Pro de PowerSync inclut 30 Go/mois et 1 000 clients simultanés, puis 1 $/Go et 30 $ par tranche de 1 000 clients ; 10 000 foyers actifs tiennent dans l'enveloppe de base.
- **Supabase** monte par paliers de calcul Postgres ; l'authentification couvre 50 000 utilisateurs actifs mensuels dès le plan gratuit.
- **Journal d'événements** : il grossit sans borne. Le modèle prévoit une date sur chaque événement pour archiver ou agréger l'ancien. Au MVP, tout l'historique est synchronisé et pris en compte par le moteur ; une fenêtre glissante pourra être introduite par une colonne `period_key` quand le volume le justifiera (5.3).
- **Moteur sur l'appareil** : coût serveur nul par utilisateur. Des statistiques globales ou un apprentissage inter-foyers deviendraient une fonction serveur distincte.
- **Partage de foyer** : multiplie les clients simultanés par le nombre de membres, pas le volume de données.
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

**Statut : validé le 19/10/2026, révisé le 27/10/2026 (v2).**

### 3.1 Vue d'ensemble

Le modèle est un **journal d'événements par produit** entouré de quelques tables de référence. Le stock n'est stocké nulle part : il est calculé à partir des événements (5.3 des spécifications fonctionnelles). Le même schéma existe dans Postgres (référence) et dans SQLite local (réplique), à l'exception des tables dérivées locales.

```
household ──▶ product ◀╌╌ catalog_entry (fichier, copié jamais lié)
   │            ▲  ▲
   ▼            │  └── recipe_ingredient ──▶ recipe
category ◀──────┤
                ├── stock_event (acheté, entamé, fini, relevé ; daté)
                │        ▲ achat à la coche
                └── list_line (quantité, origine, décision, cochée, reportée)
Chaque table porte household_id ; les flèches vont de l'enfant vers la référence.
```

### 3.2 Conventions

| Convention | Règle |
| --- | --- |
| Identifiants | UUID v7 (triables par date) générés côté client, colonne `id` sur toutes les tables |
| Rattachement | Colonne `household_id` non nulle sur toute table métier, indexée ; clé des politiques RLS et des règles de synchro |
| Horodatage | `created_at`, `updated_at` en `timestamptz` UTC, posés par le client ; l'affichage convertit dans le fuseau de l'appareil |
| Suppression | Logique par `deleted_at` sur les tables modifiables (produit, recette, événement, ligne) ; jamais de `DELETE` synchronisé (RG-7, EF-2.4, EF-3.4) |
| Quantités | `numeric(10,3)` dans l'unité d'achat du produit (RG-1) |
| Énumérations | Chaînes contraintes par `check`, pas de types `enum` Postgres (plus simples à faire évoluer et à répliquer) |
| Noms | Tables et colonnes en anglais, `snake_case` ; libellés utilisateur en français dans les données |

### 3.3 Tables

**household** — le foyer, unité de rattachement et de synchronisation.

| Colonne | Type | Note |
| --- | --- | --- |
| id | uuid |  |
| name | text | optionnel |
| size | smallint | taille du foyer (5.4 FS), défaut 1 |
| period\_days | smallint, nullable | période de la liste fixée dans l'onglet Compte, de 1 à 31 (EF-4.1) ; nul = automatique, apprise des sessions de courses (4.9) |
| catalog\_contribution | boolean | accord du foyer pour l'agrégation anonyme de ses noms de produits (EF-7.6, 7.3) ; faux par défaut |
| created\_at, updated\_at | timestamptz |  |

**household\_member** — lien utilisateur ↔ foyer. Un compte appartient à un seul foyer au MVP (index unique sur `user_id`) ; un foyer a un ou plusieurs membres (EF-7.4).

| Colonne | Type | Note |
| --- | --- | --- |
| household\_id | uuid |  |
| user\_id | uuid | référence `auth.users` |
| role | text | `owner` (créateur du foyer, peut retirer un membre), `member` |
| email | text | copie de l'e-mail du compte, affichée aux autres membres ; tenue à jour par un trigger sur `auth.users` |
| created\_at | timestamptz |  |

**household\_invitation** — invitation à rejoindre un foyer (EF-7.4). Table serveur seulement : ni synchronisée, ni accessible au client autrement que par les fonctions de 5.6.

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id | uuid |  |
| token\_hash | text | SHA-256 du jeton du lien ; le jeton lui-même n'est jamais stocké |
| created\_by | uuid | membre qui invite |
| expires\_at | timestamptz | création + 7 jours |
| accepted\_by, accepted\_at | uuid, timestamptz, nullables | usage unique |
| created\_at | timestamptz |  |

**category** — rayon, ordonné pour le parcours en magasin.

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id | uuid |  |
| name | text |  |
| position | integer | ordre de parcours (EF-1.5) |
| system\_key | text, nullable | `fresh`, `frozen` pour les catégories système (RG-9), sinon nul |
| deleted\_at | timestamptz |  |

Un jeu par défaut est créé à la création du foyer (EF-1.7).

**product** — le référentiel de l'utilisateur.

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id | uuid |  |
| name | text |  |
| name\_normalized | text | sans accents ni casse, pour la recherche (EF-4.9) |
| category\_id | uuid, nullable | nul = « À classer », groupe affiché en tête de liste (EF-1.3) |
| unit\_kind | text | `piece`, `weight`, `volume` : détermine le pas d'arrondi (RG-2) ; `piece` par défaut |
| unit\_label | text | « paquet », « bouteille », « kg »… |
| family | text | `rhythm`, `reserve`, `occasional` (5.1 et 5.5 FS) ; `rhythm` par défaut pour un produit créé à la volée, `occasional` uniquement sur choix de l'utilisateur |
| declared\_qty, declared\_per\_days | numeric, smallint, nullables | rythme déclaré : `declared_qty` unités par `declared_per_days` jours ; pour une réserve, 1 unité par N jours |
| safety\_stock | smallint | unités d'avance, défaut 1, famille réserve |
| contents\_qty, contents\_unit | numeric, text, nullables | contenance : 1000 et `g`, 6 et `piece` |
| shelf\_life\_days | smallint, nullable | durée de conservation (RG-10) |
| catalog\_entry\_id, catalog\_version | text, smallint, nullables | origine catalogue (RG-8) |
| catalog\_rate\_qty, catalog\_lifetime\_days, catalog\_scaling | numeric, smallint, text, nullables | rythme indicatif copié du catalogue à la création, pour une personne (`per_person`) ou pour le foyer (`per_household`) ; multiplié par la taille du foyer à l'exécution (4.3), nul valant `per_person`, jamais resynchronisé avec le catalogue (RG-8) |
| archived\_at, deleted\_at | timestamptz | archivage EF-1.4 |
| created\_at, updated\_at | timestamptz |  |

**stock\_event** — le journal. Table en ajout seul ; une erreur se corrige par `deleted_at`.

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id, product\_id | uuid |  |
| type | text | `purchased`, `opened_last`, `finished`, `counted` |
| quantity | numeric, nullable | obligatoire pour `purchased` et `counted` |
| occurred\_at | timestamptz | date métier, modifiable ; distincte de `created_at` |
| source | text | `list`, `manual` |
| list\_line\_id | uuid, nullable | ligne cochée d'origine d'un achat (EF-2.1) ; porte l'origine recette pour RG-4 |
| deleted\_at, created\_at | timestamptz |  |

Index : `(household_id, product_id, occurred_at desc)`.

**list\_line** — une ligne de la liste du foyer, unique et permanente (EF-4.7) : il n'y a pas de table de listes. Les lignes ne sont jamais supprimées : cochées lors d'une session de courses terminée, retirées ou refusées, elles restent en base sans être affichées (4.9), et alimentent l'indicateur d'acceptation (2.4 FS) sans table supplémentaire.

| Colonne | Type | Note |
| --- | --- | --- |
| id, household\_id, product\_id | uuid |  |
| quantity | numeric | quantité de l'achat créé à la coche (EF-4.5) |
| suggested\_qty | numeric, nullable | quantité proposée à l'origine, pour mesurer les modifications |
| origin | text | `suggestion`, `manual`, `recipe` |
| recipe\_id | uuid, nullable |  |
| decision | text, nullable | `accepted`, `modified`, `refused_have`, `refused_stop`, `postponed` ; nul pour une ligne manuelle. Une suggestion refusée est enregistrée comme une ligne de décision de refus, jamais affichée |
| checked\_at | timestamptz, nullable | coché ; nul une fois décoché |
| postponed\_at | timestamptz, nullable | reporté (`decision = postponed`, EF-4.5) |
| deleted\_at | timestamptz, nullable | retiré (EF-4.5) |
| created\_at, updated\_at | timestamptz |  |

**recipe** et **recipe\_ingredient**

| Table | Colonnes |
| --- | --- |
| recipe | id, household\_id, name, servings (smallint), deleted\_at, created\_at, updated\_at |
| recipe\_ingredient | id, household\_id, recipe\_id, product\_id, quantity (numeric, en unité d'achat ou fraction), kind (`base`, `specific`), deleted\_at |

### 3.4 Catalogue par défaut (hors base)

Le catalogue n'est pas une table synchronisée : c'est un fichier JSON versionné livré avec l'application (section 7). Chaque entrée porte : `id` (slug stable), `name`, `aliases`, `category_key`, `unit_kind`, `unit_label`, `family`, `contents_qty`, `contents_unit`, `shelf_life_days`, `rate_qty_per_person_per_day` ou `lifetime_days`, `household_scaling` (`per_person`, `per_household`), `base_ingredient` (booléen, pour les recettes). À la création d'un produit, les valeurs sont copiées dans `product` et l'origine conservée par `catalog_entry_id` et `catalog_version`.

### 3.5 Données dérivées, locales uniquement

Calculées sur l'appareil à partir des tables synchronisées, jamais envoyées au serveur, recalculables à tout moment :

| Vue ou cache | Contenu |
| --- | --- |
| product\_state | par produit : dernier événement, stock estimé, rythme retenu et sa source (`declared`, `learned`, `catalog`), date d'épuisement prévue, marqueur « à racheter », justification textuelle de la suggestion (EF-4.8) |
| learned\_rate | par produit : rythme appris, nombre d'achats pris en compte, date de calcul (RG-3, RG-4, RG-5) |
| list\_view | sessions de courses, session en cours, état de chaque ligne et période de la liste retenue (4.9) |

Au MVP, ces données sont calculées à la volée par le moteur (section 4) et mémorisées en mémoire ; une table SQLite locale non synchronisée ne sera introduite que si la mesure ENF-4 l'exige.

### 3.6 Sécurité et synchronisation

- **RLS** : une seule politique par table, `household_id in (select household_id from household_member where user_id = auth.uid())`, en lecture et en écriture.
- **Règles de synchro** : un bucket par foyer, contenant toutes les tables métier filtrées par `household_id`. Au MVP, tout l'historique du foyer est synchronisé ; une fenêtre glissante pourra être introduite plus tard, par une colonne `period_key`, quand le volume le justifiera (5.3).
- **Écritures** : toutes idempotentes (UUID client), rejouées par le moteur à la reconnexion ; conflit = dernière écriture gagnante par ligne (ENF-2).

### 3.7 Points tranchés le 19/10/2026

1. `occurred_at` est modifiable sur un événement ; l'apprentissage recalcule depuis le journal à chaque fois, aucun état intermédiaire à invalider.
2. La justification d'une suggestion (EF-4.8) est recalculée à l'affichage par le moteur, à partir de `product_state` ; aucune colonne en base. Une suggestion acceptée devient une ligne, qui ne porte plus de justification.
3. Pas de fenêtre de synchro au MVP (décidé le 26/10/2026, remplace la fenêtre de 12 mois) : tout l'historique est synchronisé et le moteur le prend en compte en entier (5.7).

## 4. Moteur d'estimation

**Statut : décidé le 19/10/2026, révisé le 27/10/2026 (v2)** (rythme appris par médiane des cinq derniers intervalles ; une simplification de RG-5 signalée en 4.7 ; sessions de courses et période de la liste en 4.9).

### 4.1 Principes

- Module **TypeScript pur**, sans accès à la base ni au réseau : il reçoit des objets (produit, événements, foyer, date courante) et rend des objets. Il tourne sur l'appareil, appelé par la couche d'accès aux données.
- **Déterministe** : la date courante est un paramètre, jamais lue par le moteur. Même entrée, même sortie, ce qui rend les tests exacts.
- **Dates locales** : le moteur reçoit les dates en heure locale de l'appareil, sans fuseau (`2026-10-26T18:30:00`) ; la couche `data` convertit `occurred_at` (UTC) dans le fuseau de l'appareil avant l'appel. Une durée en jours est une différence de jours civils : un achat samedi soir et un « fini » dimanche matin sont séparés d'un jour. Hors sessions de courses (4.9), l'heure ne sert qu'à ordonner deux événements du même jour. Le moteur ne manipule jamais de fuseau horaire. Les dates vont de l'an 0000 à l'an 9999 (format `AAAA-MM-JJ`) ; le calendrier est grégorien, 2100 n'est pas bissextile.
- **Sans état** : rien n'est mémorisé entre deux appels ; `product_state` et `learned_rate` (3.5) sont les sorties du moteur, recalculées à la demande.
- **Arithmétique simple** : pas de statistique au-delà d'une médiane, pas d'apprentissage automatique (risque « sur-ingénierie » des spécifications fonctionnelles).

### 4.2 Entrées et sorties

| Fonction | Entrées | Sortie |
| --- | --- | --- |
| `resolveRate` | produit (avec les valeurs catalogue copiées), achats et événements « fini » du produit, taille du foyer | rythme en unités par jour, source (`declared`, `learned`, `catalog`, `none`), nombre d'intervalles utilisés |
| `estimateStock` | produit, événements du produit, rythme, date courante | stock estimé, date d'ancrage, date d'épuisement prévue, marqueur « à racheter » |
| `observedIntervals` | événements du produit | intervalles de consommation observés (fiche produit, tests) |
| `productState` | produit, événements du produit, foyer, date courante | `ProductState` : rythme et stock estimé |
| `suggestForPeriod` | produits, leurs états, période en jours, vue de la liste (`listView`) | lignes suggérées : produit, quantité, éléments de justification |
| `applyRecipes` | recettes choisies avec portions, états des produits, lignes non cochées de la liste (états `pending` et `returned`, 4.9) | lignes ajoutées ou cumulées |
| `shoppingSessions` | dates des coches du foyer | sessions de courses : début, dernière coche, fermeture (4.9) |
| `listView` | lignes de la liste, date courante | sessions, session en cours, état de chaque ligne (4.9) |
| `resolvePeriod` | foyer, sessions de courses | période de la liste en jours, source (`declared`, `learned`, `default`), nombre d'intervalles utilisés (4.9) |
| `resolveFinishedAt` | produit, événements du produit, rythme, date du signalement | date à enregistrer pour le « fini », et si elle a été avancée (4.4) |

Un type `ProductState` regroupe les sorties des deux premières fonctions ; c'est lui que les écrans affichent (fiche produit, onglet Produits, justification EF-4.8).

Chaque fonction vérifie ses entrées et lève une `InvalidInputError`, qui nomme le champ fautif, pour ce que `data` ne doit jamais transmettre : date qui n'est pas au format exact `AAAA-MM-JJTHH:MM:SS` ou qui n'existe pas (les dates sont comparées comme des textes, leur format doit être unique), quantité négative ou non finie, achat ou relevé sans quantité, événement d'un autre produit, foyer de moins d'une personne ou de période fixée hors de 1 à 31 jours, période qui n'est pas un entier d'au moins un jour, ligne reportée sans date de report, recette sans portion. Une valeur de rythme, de durée de vie ou de conservation nulle ou négative n'est pas une erreur : elle vaut absence (4.3, 4.5).

### 4.3 Rythme de consommation

Le rythme `r` s'exprime en unités d'achat par jour. Sources par priorité (5.2 FS) :

1. **Déclaré** : `r = declared_qty / declared_per_days`. Pour la famille réserve, l'utilisateur saisit une durée de vie `L` par unité : `r = 1 / L`. Une quantité ou une durée nulle ou négative vaut absence de rythme déclaré : on passe à la source suivante (T23).
2. **Appris** : voir ci-dessous ; retenu seulement si au moins 3 achats éligibles (RG-3).
3. **Catalogue** : depuis les valeurs copiées sur le produit à sa création : `r = catalog_rate_qty` si `catalog_scaling = per_household`, sinon `r = catalog_rate_qty × size` ; un `catalog_scaling` nul vaut `per_person`, comme une entrée du catalogue sans `household_scaling` (7.2, T32) ; réserve : `r = 1 / catalog_lifetime_days`. Une valeur nulle ou négative est ignorée (T22) : elle ramènerait la borne du rythme appris à zéro. La taille du foyer est lue à l'exécution, donc une modification s'applique immédiatement aux produits sur rythme catalogue (5.4 FS) ; une mise à jour du catalogue ne change rien (RG-8).
4. **Aucun** : produit sans rythme (ponctuel ou inconnu) ; jamais suggéré.

**Rythme appris.** Soient les achats éligibles du produit, triés par date : `P1 … Pn` avec leurs quantités `q1 … qn`. Un achat est éligible s'il ne provient pas d'une ligne d'origine recette (RG-4).

- Pour chaque achat `Pk`, l'intervalle de consommation `dk` est le nombre de jours entre `Pk` et le premier des deux événements suivants : l'achat `Pk+1`, ou un « fini » postérieur à `Pk`. Le dernier achat n'a donc d'intervalle que si un « fini » le suit (T19) ; un intervalle de zéro jour (« fini » le jour même de l'achat) est ignoré. Les deux sont des bornes supérieures : l'utilisateur peut signaler « fini » quelques jours après l'épuisement réel, mais ce signal reste plus proche de la vérité que l'achat suivant, et la médiane absorbe les retards ponctuels. Un « fini » se signale en un seul geste et prend la date du jour ; la date reste corrigeable depuis la fiche produit mais n'est jamais demandée (ENF-8).
- Taux observé sur l'intervalle : `rk = qk / dk`.
- Le rythme appris est la **médiane des cinq derniers `rk`** (ou de tous s'il y en a moins de cinq, minimum deux, soit trois achats). La médiane ignore un achat exceptionnel (promotion, réception) sans qu'il faille le détecter.
- Deux achats du même jour civil comptent comme un seul, quantités cumulées : un intervalle dure toujours au moins un jour (T26).

**Borne de sécurité.** Tant que moins de cinq intervalles sont disponibles, le rythme appris est borné entre 0,5 × et 2 × la valeur du catalogue (sans valeur catalogue, pas de borne ; un rythme déclaré n'entre pas en jeu, puisqu'il passe avant le rythme appris). Au-delà de cinq intervalles, la médiane seule fait foi.

### 4.4 Stock estimé

Le stock est reconstruit depuis le dernier **événement d'ancrage** : le plus récent parmi `counted` (valeur = quantité relevée), `finished` (valeur = 0) et `opened_last` (valeur = 1 unité d'achat). Sans ancrage, l'ancre est le premier achat connu, avec une valeur de 0 ; cet achat est compté dans la somme des achats.

```
stock(t) = max(0, A + Σ achats après l'ancre − r × jours(ancre → t))
```

- `A` : valeur de l'ancre, `r` : rythme retenu (0 si aucun).
- Date d'épuisement prévue : `ancre + (A + Σ achats) / r` si `r > 0`, arrondie au jour supérieur : c'est le premier jour où le stock estimé est nul. Au-delà de l'an 9999, aucune date n'est rendue (T31).
- Un « fini » sans achat antérieur est une ancre de valeur 0 comme une autre : stock 0, « à racheter » vrai (T27).
- Marqueur « à racheter » (toute famille sauf ponctuel, EF-3.2) : vrai si le dernier événement non-achat est `opened_last` ou `finished` et qu'aucun achat ne lui est postérieur.
- Un événement avec `deleted_at` est ignoré (EF-2.4, EF-3.4) ; `occurred_at` fait foi, pas `created_at`.

Un « il m'en reste » (EF-3.3, EF-4.4) est enregistré comme un `counted` d'une unité d'achat à la date du jour : il recale l'estimation sans règle spéciale.

**« Fini » signalé peu après un achat.** Un « fini » daté d'aujourd'hui alors que le produit vient d'être racheté désigne presque toujours l'ancienne unité, pas la nouvelle. Règle silencieuse, sans question : si le dernier achat date de moins de `L / 2` jours (`L` = durée de vie attendue d'une unité, soit `1 / r`) et qu'il restait du stock avant lui (ancre de valeur positive, ou achat antérieur depuis l'ancre), l'événement est daté de la veille de cet achat, à 23:59:59. Sans stock antérieur, c'est bien l'achat récent qui est fini, et le « fini » s'applique tel quel. L'app affiche un message annulable (« marqué fini avant tes courses du 12 ») ; l'utilisateur peut corriger la date depuis la fiche. Au-delà de `L / 2`, le « fini » s'applique tel quel. Test T18 : achat à J0, « fini » à J1 avec `L` = 14 → événement daté J−1, l'achat de J0 reste en stock, intervalle précédent clos à J−1. Test T19 : achat à J0, « fini » à J10 avec `L` = 14 → stock 0, intervalle de 10 jours. Cette règle est la fonction `resolveFinishedAt` du moteur : la commande `markFinished` de `data` l'appelle, enregistre l'événement à la date rendue et affiche le message si la date a été avancée.

### 4.5 Quantité suggérée

Pour une période de `P` jours (4.9) à la date `t` :

| Famille | Condition de suggestion | Quantité |
| --- | --- | --- |
| À rythme | `besoin = r × min(P, shelf_life_days ou P) − stock(t)` positif | `besoin` arrondi au pas supérieur de l'unité : 1 pour `piece`, 0,1 pour `weight` (kg), 0,5 pour `volume` (L) (RG-2, RG-10) |
| À réserve | marqueur « à racheter » (même sans rythme), ou épuisement prévu avant `t + P`, soit `stock(t) < r × P` | `safety_stock` unités |
| À rythme, sans rythme connu | marqueur « à racheter », une seule fois (voir ci-dessous) | quantité du dernier achat hors recette (1 unité sans achat), arrondie au pas de l'unité |
| Ponctuel, archivé | jamais |  |

`P` est un nombre entier de jours, au moins 1 : une autre valeur est refusée par une erreur `InvalidInputError` (T25). Une durée de conservation nulle ou négative est ignorée (T24).

**Quantité habituelle.** Un achat issu d'une ligne recette est exclu de la quantité du dernier achat, comme de l'apprentissage (RG-4) : trois briques de lait de coco achetées pour un curry ne font pas de trois la quantité habituelle. Sans achat hors recette, la suggestion est d'une unité (T33).

**Arrondi et conservation.** L'arrondi au pas supérieur (RG-2) prime sur la borne de conservation (RG-10) : la quantité suggérée est au moins le besoin et le dépasse de moins d'un pas. Un pain de mie consommé à raison de 0,4 par jour et conservé 2 jours donne un besoin de 0,8 et une suggestion de 1 (T29). Arrondir vers le bas ne proposerait rien.

Un produit dont une ligne bloque la suggestion n'est pas suggéré : ligne non cochée, cochée pendant la session en cours, reportée, ou retirée ou refusée depuis la fin de la dernière session (4.9, T12, T35).

Une suggestion due au seul marqueur « à racheter » (produit sans rythme connu, ou réserve dont l'épuisement n'est pas prévu dans la période) ne vaut que jusqu'aux courses suivantes : dès qu'une session de courses commencée après le marqueur, ou à la même seconde (T28), s'est terminée sans que le produit soit acheté, elle n'est plus proposée. Une session déjà commencée au moment du marqueur ne compte pas : le produit marqué « fini » en magasin est encore proposé aux courses d'après (T42). Un nouvel événement (« fini », « entamé ») la rend de nouveau possible ; un achat lève le marqueur. Tests T20, T21, T28, T42.

**Justification** (EF-4.8) : le moteur en rend les éléments (stock estimé, date d'épuisement prévue, source du rythme, nombre d'intervalles) ; l'écran les met en mots sans les termes « rythme », « famille » ni « stock » (ENF-8). Exemple : « Il t'en reste environ 2, épuisé vers le 24 oct. · d'après tes 4 derniers achats ».

### 4.6 Recettes

Pour une recette de `S` portions de référence, demandée pour `S'` portions : chaque ingrédient de quantité `qi` donne `qi × S' / S`. Les quantités d'ingrédients sont enregistrées en unités d'achat (3.3) : la conversion depuis des grammes ou des millilitres, par la contenance, se fait à la saisie et non dans le moteur. Un ingrédient `specific` est ajouté intégralement ; un ingrédient `base` n'est ajouté qu'à hauteur de `max(0, quantité requise − stock(t))`, la quantité requise étant le total des recettes ajoutées ensemble. Les quantités sont cumulées sur la ligne non cochée du même produit, s'il en existe une (EF-5.5), et arrondies au pas de l'unité après cumul.

### 4.7 Écart assumé avec les spécifications fonctionnelles

RG-5 prévoyait qu'un refus « il m'en reste » allonge l'estimation de durée de vie et qu'un « fini » la réduise, avec un ajustement borné. Le moteur n'applique **aucun ajustement explicite** : le « fini » entre dans la médiane comme fin d'intervalle, et le « il m'en reste » recale le stock par un `counted`. L'effet recherché est obtenu par les données elles-mêmes, sans paramètre de correction à régler ni dérive possible. RG-5 et EF-3.3 ont été reformulés en ce sens dans les spécifications fonctionnelles le 20/10/2026.

### 4.8 Jeu de tests de référence

Les tests sont écrits avant le moteur, sous forme de fixtures JSON (produit, foyer, événements datés, date courante, période) avec le résultat attendu, et constituent la définition exécutable des formules ci-dessus.

| Id | Scénario | Résultat attendu |
| --- | --- | --- |
| T01 | Rythme déclaré 1 yaourt/jour, pack de 12 acheté il y a 8 jours, liste de 7 jours | stock 4, besoin 3 → suggestion 1 pack (arrondi pièce) |
| T02 | 2 achats seulement, pas de rythme déclaré, catalogue 0,5/pers/jour, foyer de 2 | source `catalog`, r = 1 |
| T03 | 3 achats de 1 L à J0, J7, J14 | r appris = 1/7 L/jour, source `learned`, 2 intervalles |
| T04 | 6 achats hebdomadaires dont un achat de 6 unités en promotion | la médiane ignore l'intervalle aberrant ; r = 1/7 |
| T05 | Achat puis « fini » à J5 puis achat à J9 | intervalle = 5 jours, pas 9 |
| T06 | « fini » hier, pas d'achat depuis | stock 0, suggestion = r × P |
| T07 | `counted` 3 à J0, r = 1/jour, t = J2 | stock 1 |
| T08 | Réserve : dentifrice, `opened_last` à J0 | « à racheter » vrai, suggestion = safety\_stock |
| T09 | Pain, r = 1/jour, conservation 2 jours, liste de 31 jours | suggestion 2, pas 31 |
| T10 | Achats provenant de lignes recette | exclus du calcul de r |
| T11 | Produit ponctuel | jamais suggéré |
| T12 | Suggestion refusée « il m'en reste », avec le `counted` 1 qui en résulte | non re-suggéré avant la fin des courses suivantes ; stock recalé à 1 (la création du `counted` par la commande est vérifiée en intégration, 9.1) |
| T13 | 15 jours sans ouverture de l'app | stock décroît normalement, suggestions au retour (évolution « pause » hors MVP) |
| T14 | Recette 4 portions demandée pour 2, ingrédient de base en stock suffisant | ingrédient de base non ajouté, spécifiques divisés par 2 |
| T15 | Deux recettes partageant un ingrédient | une seule ligne, quantités cumulées |
| T16 | Événement avec `deleted_at` | ignoré ; même résultat que s'il n'avait jamais existé |
| T17 | Rythme appris sur 2 intervalles, 4 × la valeur catalogue | borné à 2 × catalogue |
| T18 | Achat à J0, « fini » signalé à J1, `L` = 14 (4.4) | « fini » daté J−1 à 23:59:59, l'achat de J0 reste en stock, intervalle précédent clos à J−1 |
| T19 | Achat à J0, « fini » signalé à J10, `L` = 14 (4.4) | « fini » daté J10, stock 0, intervalle de 10 jours |
| T20 | Produit créé à la volée, sans rythme, acheté une fois (2 unités) puis « fini » | « à racheter » vrai, suggestion 2 |
| T21 | Même produit, après une session de courses commencée depuis le « fini », sans achat | non suggéré ; un produit marqué « fini » après cette session l'est |
| T22 | Valeur catalogue 0 ou négative (4.3) | ignorée : rythme appris sans borne, ou aucun rythme |
| T23 | Rythme déclaré de 0 unité (4.3) | ignoré : rythme catalogue ou appris |
| T24 | Durée de conservation 0 ou négative (4.5) | ignorée : la période seule s'applique |
| T25 | Liste de 0 jour (4.5) | `InvalidInputError` sur `periodDays` |
| T26 | Deux achats le même jour, puis deux achats hebdomadaires (4.3) | un seul achat de quantité cumulée : intervalles 7 et 7 |
| T27 | « Fini » avant tout achat (4.4) | stock 0, « à racheter » vrai, suggestion sans quantité négative |
| T28 | Session de courses commencée à la seconde même du « fini », terminée (4.5) | compte comme commencée après le marqueur : non suggéré |
| T29 | Besoin de 0,8 pièce borné par la conservation (4.5) | suggestion 1 : l'arrondi dépasse le besoin de moins d'un pas |
| T30 | Achats en 1969-1970 et en février-mars 2100 (4.1) | intervalles de 7 jours, dates d'épuisement exactes |
| T31 | Épuisement prévu au-delà de l'an 9999 (4.4) | aucune date d'épuisement, sans erreur |
| T32 | Rythme catalogue sans `catalog_scaling`, foyer de 3 (4.3) | traité comme `per_person` : × 3 ; `per_household` inchangé |
| T33 | Produit sans rythme, « fini » après un achat recette (4.5) | suggestion de la quantité du dernier achat hors recette, 1 sans achat hors recette |
| T34 | Coches à 10:00, 10:20, 12:59, 16:00 et 19:00 (4.9) | trois sessions : moins de 3 h d'écart regroupe, 3 h tout juste sépare ; la dernière est en cours |
| T35 | Lignes non cochée, cochée, retirée, refusée, reportée, avant et après la fin de la dernière session (4.9) | état de chaque ligne ; seules les lignes passées laissent suggérer leur produit |
| T36 | Deux sessions seulement (4.9) | période par défaut : 7 jours |
| T37 | Quatre sessions dont deux le même jour (4.9) | sessions du même jour comptées une fois ; médiane 5,5 arrondie à 6 jours |
| T38 | Sessions espacées de 40 et 45 jours (4.9) | période bornée à 31 jours |
| T39 | Sessions quatre jours de suite (4.9) | période bornée à 2 jours |
| T40 | Période fixée à 10 jours, sessions hebdomadaires (4.9) | période déclarée : 10 jours |
| T41 | Six intervalles entre sessions : 20, 20, 20, 7, 7, 7 jours (4.9) | médiane des cinq derniers : 7 jours, pas 13,5 |
| T42 | Produit marqué « fini » pendant une session de courses, qui se termine (4.5) | encore suggéré : la session avait commencé avant le marqueur |

Propriétés vérifiées en complément : le moteur est idempotent (deux appels identiques donnent le même résultat), le stock n'est jamais négatif, la quantité suggérée est nulle dès que le stock couvre la période, et une suggestion « à rythme » dépasse le besoin de moins d'un pas.

### 4.9 Sessions de courses et période de la liste

**Sessions.** Une coche est le `checked_at` d'une ligne cochée et non retirée. Les coches du foyer, tous membres confondus, triées par date, forment des sessions : deux coches consécutives espacées de moins de 3 h appartiennent à la même session (T34). Une session commence à sa première coche, se termine à sa dernière, et se ferme 3 h après la dernière ; elle est en cours tant que sa fermeture n'est pas atteinte. Les heures se lisent sur les dates locales (4.1) : un changement d'heure peut décaler une fermeture d'une heure, sans conséquence. `shoppingSessions` rend les sessions ; `listView` y ajoute la session en cours et l'état de chaque ligne. Rien n'est stocké.

**État des lignes.** Une ligne retirée l'est à son `deleted_at`, une ligne refusée à sa création, une ligne reportée à son `postponed_at` ; « la dernière fermeture » est celle de la dernière session fermée à la date courante.

| État | Ligne | Affichée | Bloque la suggestion |
| --- | --- | --- | --- |
| `pending` | ni cochée, ni retirée, ni refusée, ni reportée | oui | oui |
| `checked` | cochée pendant la session en cours | oui, barrée en fin de groupe | oui |
| `postponed` | reportée, aucune session fermée depuis le report | non | oui |
| `returned` | reportée, une session s'est fermée depuis le report | oui, signalée comme reportée | oui |
| `withdrawn` | retirée ou refusée après la dernière fermeture | non | oui |
| `past` | cochée lors d'une session fermée, ou retirée ou refusée avant la dernière fermeture | non | non |

Une ligne cochée quitte donc la liste à la fermeture de sa session (EF-4.12). Les maquettes la retiraient aussi à l'ouverture suivante de l'app ; la règle est ramenée à la seule fermeture, parce que l'ouverture est propre à chaque appareil (deux membres verraient deux listes) et qu'iOS recharge une PWA restée en arrière-plan, ce qui viderait les lignes cochées en plein magasin. Une ligne reportée revient à la fermeture de la première session postérieure au report : reportée en magasin, après ces courses ; reportée à la maison, après les suivantes (EF-4.5).

**Période de la liste.** `resolvePeriod` retient, dans l'ordre :

1. **Déclarée** : `household.period_days`, de 1 à 31 jours, si l'utilisateur l'a fixée dans l'onglet Compte (T40).
2. **Apprise** : les sessions sont ramenées au jour civil de leur début, deux sessions du même jour comptant pour une (T37). À partir de trois jours de courses, la période est la médiane des cinq derniers intervalles entre jours consécutifs (T41), arrondie au jour le plus proche (une demi-journée vers le haut), bornée entre 2 et 31 jours (T38, T39). La fenêtre de cinq intervalles est celle du rythme appris (4.3) : elle suit un changement d'habitude en quelques semaines.
3. **Par défaut** : 7 jours (T36).

## 5. API et synchronisation

**Statut : décidé le 19/10/2026, révisé le 27/10/2026 (v2).**

### 5.1 Principe

Il n'y a **pas d'API applicative** au MVP. Trois couches remplacent ce qu'une API REST ferait d'ordinaire :

| Couche | Rôle | Où |
| --- | --- | --- |
| Schéma Postgres, contraintes et politiques RLS | Intégrité et autorisation | Supabase |
| Règles de synchronisation | Quelles lignes descendent vers quel appareil | PowerSync Service |
| Connecteur d'envoi | Comment les écritures locales remontent | Module unique dans l'app (2.9) |

L'app n'appelle Supabase directement que pour l'authentification et pour les écritures du connecteur ; toutes ses lectures passent par SQLite.

### 5.2 Authentification

- Supabase Auth, sans lien magique. Au MVP : e-mail et mot de passe, et connexion Google (OAuth web, gratuit). Connexion Apple ajoutée en phase B : « Sign in with Apple » exige un identifiant de service créé dans le compte développeur Apple, et Apple l'impose dès qu'un autre fournisseur social est proposé dans une app du store ; sur la PWA de phase A, Google seul est toléré.
- Le JWT Supabase est accepté tel quel par PowerSync (vérification par la clé publique du projet) ; aucun service d'échange de jeton.
- L'identifiant du foyer n'est pas mis dans le JWT : les règles de synchro le résolvent par une **requête de paramètres** sur `household_member`, ce qui reste valable quand un utilisateur appartiendra à plusieurs foyers.

### 5.3 Règles de synchronisation

Un seul bucket par foyer, décrit en YAML côté PowerSync :

```yaml
bucket_definitions:
  household:
    parameters: >
      select household_id from household_member
      where user_id = request.user_id()
    data:
      - select * from household where id = bucket.household_id
      - select * from household_member where household_id = bucket.household_id
      - select * from category where household_id = bucket.household_id
      - select * from product where household_id = bucket.household_id
      - select * from recipe where household_id = bucket.household_id
      - select * from recipe_ingredient where household_id = bucket.household_id
      - select * from list_line where household_id = bucket.household_id
      - select * from stock_event where household_id = bucket.household_id
```

- Tout l'historique du foyer est synchronisé au MVP : pas de fenêtre glissante. Le volume d'un foyer (quelques Mo par an) ne la justifie pas avant plusieurs années ; elle sera introduite alors, par une colonne `period_key` (année-mois) filtrée dans ces règles, sans changement de modèle.
- `deleted_at` est synchronisé comme les autres colonnes : une suppression logique est une mise à jour ordinaire.
- Le catalogue n'apparaît pas : il est dans le binaire de l'app. `household_invitation` non plus : elle reste sur le serveur (3.3).

### 5.4 Connecteur d'envoi

Le SDK PowerSync met les écritures locales en file (`CrudTransaction`) et appelle le connecteur à la reconnexion. Le connecteur :

1. Rejoue chaque transaction dans l'ordre, par `upsert` ou `update` sur la table Postgres correspondante via le client Supabase, sous RLS ; les `DELETE` physiques sont interdits (3.2), un `delete` local est traduit en `update deleted_at`.
2. Distingue les échecs : erreur réseau ou 5xx → la transaction reste en file et sera rejouée ; violation de contrainte ou refus RLS (4xx) → la transaction est abandonnée, journalisée localement, et la ligne locale sera écrasée par l'état serveur à la synchro suivante.
3. Tient dans un module unique, sans logique métier.

Les identifiants étant générés côté client (UUID v7) et les écritures étant des `upsert`, rejouer deux fois la même transaction est sans effet.

### 5.5 Intégrité côté serveur

| Règle | Mise en œuvre |
| --- | --- |
| Achat à la coche idempotent (EF-2.1) | L'`id` de l'achat créé en cochant une ligne est l'UUID v5 de `list_line.id`. Cocher crée l'événement ; décocher pose son `deleted_at` ; recocher le remet à nul et met à jour `occurred_at` et `quantity`, comme une modification de quantité sur une ligne cochée. Deux membres qui cochent la même ligne produisent le même événement, conservé une seule fois par l'`upsert` ; la dernière écriture fixe l'état |
| Pas de suppression physique (RG-7) | Politiques RLS sans `delete` ; archivage par `archived_at` |
| Membre d'un foyer | RLS : `household_id in (select household_id from household_member where user_id = auth.uid())`, lecture et écriture ; `household_member` lisible par ses membres, écrit uniquement par les fonctions de 5.6 |
| Un compte, un foyer (EF-7.4) | Index unique sur `household_member.user_id` |
| Invitations | `household_invitation` sans politique RLS d'accès client : seules `create_invitation` et `accept_invitation` (`security definer`) la lisent et l'écrivent |

### 5.6 Logique serveur

Réduite au strict minimum :

- **Création du foyer** : trigger Postgres sur `auth.users` à l'inscription, qui crée `household` (taille 1, `period_days` nul, `catalog_contribution` faux), `household_member` (`owner`) et le jeu de catégories par défaut avec leurs `system_key`. Aucun écran d'initialisation hors la taille du foyer (EF-7.1), que l'app met à jour ensuite.
- **Invitation** (EF-7.4) : `create_invitation()`, appelée par un membre, tire un jeton aléatoire de 128 bits, en enregistre l'empreinte SHA-256 avec une expiration à 7 jours et rend le jeton ; l'app en fait le lien `https://commedab.app/invitation/<jeton>` et ouvre la feuille de partage du système. `accept_invitation(jeton)` vérifie l'empreinte, l'expiration et l'usage unique, retire l'appelant de son foyer (supprimé avec ses données s'il en était le seul membre), l'ajoute comme `member` au foyer invitant et marque l'invitation acceptée. L'app demande confirmation avant l'appel si le foyer quitté contient des produits, puis vide sa base locale et se resynchronise.
- **Départ et retrait** (EF-7.4) : `leave_household()` retire l'appelant et lui crée un foyer neuf, comme à l'inscription ; `remove_member(user_id)`, réservée à l'`owner`, fait de même pour le membre retiré. Un `owner` qui part transmet son rôle au membre le plus ancien.
- **Export des données** (EF-7.3) : réalisé côté client depuis SQLite, en JSON, sans fonction serveur ; tout l'historique étant synchronisé (5.3), l'export local est complet.
- **Suppression du compte** (EF-7.3) : fonction Postgres `delete_account()` appelée par l'app, qui supprime physiquement le foyer et ses données si l'utilisateur en est le seul membre, sinon seulement son appartenance (rôle `owner` transmis au membre le plus ancien), puis l'utilisateur. Seules suppressions physiques autorisées, avec celle du foyer quitté par `accept_invitation`.

Pas d'Edge Function au MVP. Elles n'arriveront qu'avec les notifications et l'import de commandes (section 10).

### 5.7 Points tranchés le 19/10/2026

1. Fenêtre glissante abandonnée au MVP : tout l'historique est synchronisé ; `period_key` sera ajouté quand le volume le justifiera.
2. Pas de lien magique : mot de passe et Google au MVP, Apple en phase B.

## 6. Frontend

**Statut : décidé le 26/10/2026, révisé le 27/10/2026 (v2).**

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
| Navigation | Expo Router (fichiers = routes), onglets natifs | Même navigation sur web et natif, liens profonds gratuits |
| Composants | Primitives React Native + composants maison, pas de kit UI lourd | Expo UI (SwiftUI, Compose) est natif seulement : incompatible avec la phase A web. Un kit tiers ajouterait une dépendance pour cinq écrans |
| Styles | NativeWind (Tailwind pour React Native) | Même syntaxe sur les trois cibles, bien connue des modèles de génération de code |
| Listes | FlashList | Longues listes de produits sans saccade (ENF-3) |
| Icônes | Lucide (`lucide-react-native`) | Jeu cohérent, fonctionne sur web |
| État | Requêtes réactives PowerSync (`useQuery`) pour les données ; Zustand pour l'état d'interface seulement (filtre, onglet, brouillon de saisie) | Pas de store global des données : SQLite est la source, les écrans s'abonnent |
| Formulaires | Aucune bibliothèque : champs contrôlés, validation dans `core` | Un seul champ obligatoire par formulaire (ENF-8) |

### 6.2 Couche d'accès aux données

`packages/data` expose des **dépôts par entité** (`products`, `events`, `list`, `recipes`, `household`) avec deux faces :

- des **requêtes réactives** (`watchProducts()`, `watchList()`) qui renvoient un flux mis à jour à chaque écriture locale ou synchronisation ;
- des **commandes** (`checkLine`, `uncheckLine`, `setLineQuantity`, `removeLine`, `postponeLine`, `acceptSuggestion`, `refuseSuggestion`, `stopBuying`, `markFinished`) qui écrivent dans SQLite dans une transaction et appliquent les règles de 4.4 et 5.5 : date du « fini » calculée par `resolveFinishedAt` de `core`, `counted` sur « il m'en reste », achat créé, retiré ou mis à jour avec la coche d'une ligne. Une commande ne contient aucune formule : tout calcul vient de `core`.

La Liste passe les lignes du foyer à `listView` (4.9) : seules les lignes affichées sont rendues, `resolvePeriod` donne la période et `suggestForPeriod` reçoit la vue entière.

Les écrans n'écrivent jamais de SQL et n'importent jamais PowerSync (2.9). Un hook `useProductStates()` combine le flux des produits et des événements et appelle le moteur de `core` ; son résultat est mémorisé par produit et recalculé uniquement pour les produits dont les événements ont changé, ce qui tient ENF-4 (300 produits en moins d'une seconde) sans table dérivée.

### 6.3 Écrans du MVP

Quatre onglets, Liste · Produits · Recettes · Compte, une fiche produit et l'écran d'invitation. Il n'y a ni écran d'accueil ni mode magasin : la Liste, onglet par défaut, sert à préparer et à faire les courses (EF-4.7).

| Écran | Contenu | Gestes clés |
| --- | --- | --- |
| **Liste** | Lignes groupées par rayon dans l'ordre configuré (« À classer » en tête, frais et surgelés en dernier) ; lignes cochées barrées en fin de groupe jusqu'à la fin de la session (4.9), lignes revenues d'un report signalées ; panneau des suggestions replié, pastille « N suggestions », justification en une ligne une fois déplié (EF-4.8, EF-4.13) ; champ de saisie unique en bas (EF-4.9) | Tap sur la case : cocher, décocher. Tap sur le nom : mini-feuille (quantité −/+, « Retirer », « Reporter », fiche produit). Balayage vers la gauche : retirer. Dans le panneau : accepter, refuser « il m'en reste » ou « je n'en achète plus », tap sur la justification pour le relevé (EF-3.5). Ni confirmation ni message éphémère |
| **Produits** | Section « Il t'en reste sûrement peu » en tête (EF-3.3), puis le référentiel groupé par rayon, « il t'en reste environ 2 » et dernier achat en sous-titre (EF-1.8) ; recherche instantanée, qui sert aussi à marquer fini | Un tap « fini », un tap « il m'en reste », annulation par message éphémère ; tap sur un produit pour sa fiche |
| **Recettes** | Liste des recettes, création avec nom, portions, ingrédients par le même champ de saisie unique | Tap « ajouter à la liste » avec choix des portions |
| **Compte** | Taille du foyer, période de la liste (automatique, ou fixée de 1 à 31 jours), membres et invitation, ordre et noms des rayons, e-mail, mot de passe, déconnexion, agrégation anonyme (désactivée par défaut), export, suppression du compte, diagnostic (6.5) | Chaque réglage s'applique au foyer dès qu'il change ; seuls rejoindre ou quitter un foyer et supprimer le compte demandent confirmation |
| **Fiche produit** | Nom, catégorie, unité, « Je n'en achète plus » ; section « Réglages » repliée par défaut : famille, rythme, contenance, conservation, stock de sécurité, relevé (EF-3.5) ; historique des achats et événements avec correction et annulation (EF-2.4, EF-3.4) | Tout est modifiable en place ; rien n'est demandé |
| **Invitation** (route `invitation/[token]`) | Ouverte par le lien d'invitation : connexion ou création du compte, puis rattachement au foyer (EF-7.1, EF-7.4) | Un tap « Rejoindre » |

Règle transversale (ENF-8) : aucun écran des onglets Liste et Produits n'affiche les mots « rythme », « famille » ou « stock » ; ils disent « il t'en reste environ 2 » et « proposé parce que tu en prends chaque semaine ».

### 6.4 PWA (phase A)

- Build web par `expo export --platform web`, sortie statique servie par un Worker Cloudflare sans code (fichiers statiques seuls, `apps/mobile/wrangler.jsonc`, plan gratuit), déployé par `pnpm deploy:web` ; HTTPS obligatoire pour le service worker et OPFS. Cloudflare Pages, d'abord retenu, est désormais redirigé vers Workers par Wrangler.
- Expo ne génère ni manifeste ni service worker : le manifeste est écrit à la main (`display: standalone`, icônes, couleur de thème) et le service worker généré après le build par Workbox (`injectManifest`) pour mettre en cache le shell de l'app. Les données ne passent pas par ce cache : elles sont dans SQLite via OPFS (2.6).
- Base locale web configurée avec `OPFSCoopSyncVFS` (2.6). Première tâche du projet : un écran vide qui ouvre la base, l'écrit, se ferme et relit, testé sur l'iPhone cible en mode plein écran.
- Sur iOS, pas d'invite d'installation : l'app affiche une fois une aide « Partager → Sur l'écran d'accueil » si elle est ouverte dans Safari.

### 6.5 Hors ligne et synchronisation dans l'interface

- Aucune action n'attend le réseau ; toute écriture est locale puis synchronisée (2.1).
- Un indicateur discret (point dans l'en-tête) signale « synchronisé », « en attente » ou « erreur » ; jamais de bandeau bloquant.
- Un échec définitif du connecteur (5.4) est journalisé et visible dans l'onglet Compte > Diagnostic, avec export du journal.

### 6.6 Conventions pour le développement assisté

Un `CLAUDE.md` à la racine fixe ce que Claude Code doit respecter : la frontière `core` / `data` / `mobile` (2.9), l'interdiction de SQL et de PowerSync dans les écrans, les tests de `core` à écrire avant toute formule (4.8), le vocabulaire utilisateur (ENF-8), et la commande de vérification à exécuter avant chaque commit (typage, lint, tests). Les décisions de ce document y sont référencées par numéro de section plutôt que recopiées.

### 6.7 Points tranchés le 19/10/2026

1. Décidé le 19/10/2026 : NativeWind.
2. À vérifier au premier prototype (pas une décision) : sur la PWA iOS en plein écran, la barre d'onglets dessinée par Expo Router sur le web doit rester visible au-dessus de la barre d'accueil de l'iPhone (zone de sécurité basse, `env(safe-area-inset-bottom)`).

## 7. Catalogue par défaut

**Statut : décidé le 26/10/2026.** Répond à la question laissée ouverte par les spécifications fonctionnelles (constitution du catalogue).

### 7.1 Nature

Le catalogue est un **fichier de données livré avec l'application**, dans `packages/core/catalog/`, et non une table : pas de synchro, pas de serveur, disponible hors ligne au premier lancement, versionné avec le code. Il sert à pré-remplir un produit (EF-1.2), à nourrir la recherche du champ unique (EF-4.9) et à fournir les rythmes indicatifs (5.2 FS). Il ne contient jamais de marques ni de codes-barres (3.1 FS).

### 7.2 Format

JSON, un fichier par catégorie pour rester relisible, assemblés au build. Schéma vérifié dans `core` par une fonction de validation écrite à la main (aucune dépendance, 6.1) ; une entrée :

```json
{
  "id": "lait-demi-ecreme",
  "name": "Lait demi-écrémé",
  "aliases": ["lait"],
  "category_key": "cremerie",
  "unit_kind": "piece",
  "unit_label": "bouteille",
  "contents_qty": 1,
  "contents_unit": "l",
  "family": "rhythm",
  "rate_qty_per_person_per_day": 0.15,
  "household_scaling": "per_person",
  "shelf_life_days": 7,
  "base_ingredient": false
}
```

| Champ | Règle |
| --- | --- |
| `id` | Slug stable, jamais renommé (sert de clé dans `product.catalog_entry_id`) |
| `name`, `aliases` | Français, sans marque ; les alias couvrent les façons courantes de taper (« PQ », « coca » → « soda au cola ») |
| `category_key` | Référence une catégorie du jeu par défaut (7.4) |
| `family` | `rhythm` ou `reserve` ; jamais `occasional` dans le catalogue (c'est l'utilisateur qui décide qu'un produit est ponctuel) |
| `rate_qty_per_person_per_day` ou `lifetime_days` | L'un ou l'autre selon la famille, dans l'unité d'achat ; valeur pour une personne, sauf `household_scaling: per_household` |
| `shelf_life_days` | Facultatif ; renseigné pour le frais |
| `base_ingredient` | Vrai pour les produits que les recettes supposent présents (huile, sel, farine) ; pré-remplit `recipe_ingredient.kind` |

Un champ `catalog_version` (entier) est porté par le fichier assemblé et copié dans `product.catalog_version` à la création (RG-8).

### 7.3 Constitution

1. **Génération assistée** : Claude produit un premier jet de 250 à 300 entrées à partir de la liste des catégories, par lots de catégorie, avec consigne de rester générique et de donner des rythmes plausibles pour un adulte en France.
2. **Relecture manuelle** complète par l'auteur, qui corrige noms, alias et rythmes ; cette relecture est le vrai contrôle de qualité, l'étape 1 ne fait que gagner du temps.
3. **Tests automatiques** sur le fichier assemblé : identifiants uniques, `category_key` existant, un seul des deux champs de rythme et cohérent avec la famille, rythmes dans une plage plausible (0,01 à 5 unités/jour ; durée de vie de 3 à 365 jours), aucun doublon de nom normalisé.
4. **Enrichissement par l'usage** : les produits créés par les utilisateurs sans correspondance catalogue (EF-1.3) sont agrégés côté serveur par une requête sur `product.name_normalized`, exécutée à la main par l'auteur, limitée aux foyers qui l'ont accepté (`household.catalog_contribution`, EF-7.6), ne retenant que les noms présents dans au moins 5 foyers distincts et sans aucun rattachement à un compte. Les plus fréquents sont ajoutés au catalogue, relus comme en 2. Cet usage agrégé est déclaré dans la politique de confidentialité (section 8).

Taille visée au MVP : 250 à 300 entrées, soit l'essentiel des courses d'un foyer français ; un catalogue trop grand nuit à la recherche plus qu'il n'aide.

### 7.4 Catégories par défaut

Créées pour chaque nouveau foyer (5.6) dans l'ordre de parcours d'un hypermarché courant, réordonnables ensuite (EF-1.5) :

1. Hygiène et beauté
2. Bébé et animaux
3. Entretien et maison
4. Fruits et légumes
5. Boulangerie
6. Épicerie salée (pâtes, riz, conserves, sauces)
7. Épicerie sucrée (petit-déjeuner, biscuits, chocolat)
8. Boissons
9. Crémerie (lait, yaourts, fromage, œufs) — `system_key: fresh`
10. Viande, poisson, traiteur — `system_key: fresh`
11. Surgelés — `system_key: frozen`

Les deux clés système garantissent RG-9 (frais et surgelés en fin de parcours) même si l'utilisateur renomme les catégories.

### 7.5 Recherche

La recherche du champ unique (EF-4.9) est implémentée dans `core`, sans dépendance :

- Normalisation commune (minuscules, sans accents, sans ponctuation) des requêtes, des noms de produits, des noms et alias du catalogue ; `product.name_normalized` est calculé à l'écriture.
- Classement : produits de l'utilisateur dont un mot commence par la requête, puis ceux qui la contiennent, puis entrées du catalogue selon les mêmes règles ; les produits achetés récemment remontent à égalité de score.
- Pas de recherche floue au MVP ; les alias couvrent les variantes courantes. Une tolérance aux fautes (distance de Levenshtein sur les mots courts) est prévue si l'usage montre des échecs de recherche fréquents.
- Volume : 300 entrées de catalogue et quelques centaines de produits, recherche en mémoire à chaque frappe sans index, sous la milliseconde.

### 7.6 Mise à jour

- Une nouvelle version du catalogue arrive avec une mise à jour de l'app ; elle n'écrit jamais dans `product` (RG-8).
- Les entrées ne sont jamais supprimées, seulement marquées `deprecated: true` pour rester résolubles par les produits existants.
- Une entrée corrigée (rythme plus juste) ne touche que les produits créés après ; l'utilisateur garde ce qu'il a réglé.

### 7.7 Points tranchés le 19/10/2026

1. Catalogue fourni dès le départ (250 à 300 entrées), puis enrichi par l'agrégation des produits créés par les utilisateurs (7.3, étape 4).
2. Ordre des catégories : non alimentaire en premier (hygiène, bébé et animaux, entretien), puis alimentaire, frais et surgelés en dernier.

## 8. Sécurité et données personnelles

**Statut : décidé le 26/10/2026, révisé le 27/10/2026 (v2).**

### 8.1 Données traitées

| Donnée | Finalité | Base |
| --- | --- | --- |
| E-mail, mot de passe haché (ou identifiant Google) | Compte et connexion | Supabase Auth |
| E-mail des membres | Affiché aux autres membres du foyer (EF-7.4) | `household_member.email` |
| Invitations | Rejoindre un foyer (EF-7.4) ; empreinte du jeton seulement | `household_invitation`, serveur seul |
| Taille du foyer | Valeurs par défaut (5.4 FS) | `household` |
| Produits, achats, événements, listes, recettes | Le service lui-même | Tables du foyer |
| Journal de diagnostic local | Dépannage par l'utilisateur (6.5) | Appareil uniquement |

L'application ne collecte **aucune** donnée de localisation, aucun prix, aucun identifiant publicitaire, aucune analyse d'usage tierce (ENF-5). Le seul usage secondaire des données est l'agrégation anonyme des noms de produits pour le catalogue (7.3, étape 4), limitée aux foyers qui l'ont acceptée (EF-7.6, désactivée par défaut) et aux noms présents dans au moins 5 foyers, et déclarée dans la politique de confidentialité.

### 8.2 Protection

- **En transit** : HTTPS imposé partout (Supabase, PowerSync, hébergement web) ; aucun point d'entrée en clair.
- **Au repos côté serveur** : chiffrement des volumes assuré par Supabase et PowerSync ; sauvegardes quotidiennes Supabase à partir du plan Pro, export JSON hebdomadaire par script sur le plan gratuit (section 9).
- **Au repos sur l'appareil** : base SQLite sous la protection du système (bac à sable iOS et Android, verrouillage de l'appareil) ; sur le web, OPFS est isolé par origine. Pas de chiffrement applicatif de la base au MVP : les données ne sont pas sensibles au sens du RGPD, et le chiffrement local compliquerait OPFS sur Safari. À reconsidérer si des données plus sensibles entraient dans le périmètre.
- **Autorisation** : exclusivement par RLS sur `household_id` (5.5) ; aucune clé de service n'est embarquée dans l'app. Les clés publiques (`anon key` Supabase, URL PowerSync) sont par nature exposées et ne donnent accès qu'à ce que RLS autorise.
- **Secrets** : clé de service Supabase, jetons PowerSync et identifiants de déploiement vivent dans les variables d'environnement du CI et du poste de l'auteur, jamais dans le dépôt (`.env` ignoré, `.env.example` commité).

### 8.3 Compte

- Mot de passe : 10 caractères minimum, vérification contre les listes de mots de passe compromis (option Supabase Auth), pas de règles de composition.
- Réinitialisation par e-mail ; sessions longues avec jeton de rafraîchissement (pas de reconnexion quotidienne).
- Suppression du compte depuis l'app (EF-7.3) par la fonction `delete_account()` (5.6) ; effective immédiatement, sans délai de rétention. Les données du foyer restent tant qu'il a un autre membre.
- Lien d'invitation : jeton de 128 bits à usage unique, valable 7 jours, stocké seulement sous forme d'empreinte (5.6).
- Export depuis l'app en JSON (EF-7.3), généré sur l'appareil depuis SQLite.

### 8.4 Obligations

- Politique de confidentialité et mentions légales publiées sur le site de la PWA et liées depuis l'app ; obligatoires pour le store en phase C.
- Registre des traitements : un document court, tenu par l'auteur, qui liste les données de 8.1, les sous-traitants (Supabase, PowerSync, hébergeur web, Google pour la connexion) et leurs régions d'hébergement. Les projets Supabase et PowerSync sont créés dans une région de l'Union européenne.
- Pas de cookies ni de traceurs sur la PWA : aucune bannière de consentement nécessaire.

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
| Intégration | `data` : dépôts et commandes contre une base SQLite en mémoire ; connecteur contre le projet Supabase de développement, schéma de test réinitialisé | Vitest, Docker | Vérifie les règles 4.4 (date du « fini », `counted`), 5.4 (idempotence) et 5.5 (achat à la coche idempotent, invitations, un compte par foyer) |
| Bout en bout | Les parcours de 8 FS (première liste, courses, « fini », suggestions, invitation, recette) | Maestro sur natif, Playwright sur web | Exécutés avant chaque livraison, pas à chaque commit |
| Manuel | Le parcours de phase A sur l'iPhone réel (OPFS, plein écran, hors ligne en magasin) | Liste de contrôle dans le dépôt | À chaque changement de la couche de stockage ou de synchro |

Le moteur est la seule partie où la couverture est exigée ; ailleurs, les tests suivent les bugs rencontrés.

### 9.1 bis Hébergement du code et licence

**Décidé le 20/10/2026.**

- **GitHub**, dépôt **public** dès le premier commit : le projet fait partie d'un portfolio, et GitHub est l'hébergeur que lisent les recruteurs et les outils (Actions, Pages, intégrations Expo, Supabase, Sentry, Claude Code).
- **Licence AGPL-3.0** : toute redistribution ou exploitation du code comme service doit republier ses modifications sous la même licence, ce qui exclut un clone commercial fermé tout en gardant le code ouvert. L'auteur unique conserve la possibilité d'une double licence commerciale ; tout contributeur externe signe un accord de contribution (CLA) pour la préserver.
- **Publiable dès le départ** : README qui présente le problème, une démonstration et les choix techniques ; `LICENSE` ; `SECURITY.md` pour les signalements de vulnérabilité ; `.env.example` ; aucun secret jamais commité, l'historique étant public (8.2).
- Le nom et le logo de l'application ne sont pas couverts par la licence et pourront être protégés séparément.
- **Nom de l'application : Commedab** (figé le 26/10/2026, « comme d'hab »). Domaines : `commedab.app` (principal, PWA) et `commedab.com` libres au 26/10/2026 et réservés par l'auteur ; `commedab.fr` détenu par un tiers (« COMDAB », Paris, depuis avril 2025), sans conséquence pour une app vivant sur `.app`. L'orthographe « Commedhab » a été écartée : `commedhab.app` a été enregistré par un tiers le 23/10/2026. Reste à vérifier à l'INPI (classes 9 et 42) : « Commedab », « Comdab », « Comme d'hab ». Identifiants dérivés : dépôt GitHub `commedab`, identifiant de bundle `app.commedab`, nom affiché « Commedab », description du dépôt : « La liste de courses qui apprend tes habitudes : elle estime ce qu'il te reste et propose ce qui va manquer, sans inventaire. »

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

### 9.4 Intégration et livraison continues

GitHub Actions, un seul flux :

1. Sur chaque poussée : `pnpm check`, audit des dépendances.
2. Sur la branche principale : application des migrations sur l'environnement de développement, build web, déploiement sur l'hébergeur statique de développement.
3. Sur un tag de version : migrations en production, build web en production (phase A) ; en phase B, build iOS par EAS ou en local sur le Mac, envoi sur TestFlight ; en phase C, soumission au store.

Les règles de synchro PowerSync sont déployées par le CLI PowerSync dans la même étape que les migrations, pour que schéma et règles avancent ensemble.

### 9.5 Exploitation

- **Erreurs** : Sentry (plan gratuit) sur l'app et le web, sans données personnelles dans les événements (noms de produits exclus des messages d'erreur).
- **Sauvegardes** : plan gratuit Supabase sans sauvegarde automatique ; un script hebdomadaire (`pg_dump` par le CLI, lancé par GitHub Actions) archive la base dans un stockage privé. Supprimé si passage au plan Pro.
- **Surveillance** : tableau de bord PowerSync (usage, erreurs de synchro) et Supabase (requêtes lentes) ; aucune alerte au MVP au-delà des e-mails des deux services.
- **Indicateur produit** : le taux d'acceptation des suggestions (2.4 FS) est calculé sur l'appareil et affiché dans Compte > Diagnostic ; aucune remontée serveur.
- **Pause hebdomadaire** des projets gratuits (2.6) : une action planifiée GitHub Actions envoie une requête quotidienne triviale aux deux services pour éviter la mise en pause. Supprimée au passage en Pro.

### 9.6 Points tranchés

1. Décidé le 20/10/2026 : pas de Supabase local ; le développement utilise directement le projet cloud de développement. Les tests d'intégration du connecteur (9.1) tournent contre ce même projet, sur un schéma dédié réinitialisé avant chaque exécution.
2. Décidé le 20/10/2026 : Sentry dès la phase A.

## 10. Contraintes pour les évolutions hors MVP

**Statut : validé le 20/10/2026.** Pour chaque évolution des spécifications fonctionnelles (section 11), ce que le MVP doit déjà respecter et ce qui restera à faire.

| Évolution | Déjà prévu dans le MVP | Reste à faire le moment venu |
| --- | --- | --- |
| 1. Planning des repas par créneau | Recettes et portions en base ; `list_line.origin = recipe` | Table `meal_slot` (foyer, date, moment, recette, portions) ; la période de la liste dérivée du planning |
| 2. Catalogue de recettes et suggestions | Modèle de recette ; `base_ingredient` dans le catalogue | Source de recettes (import par URL en priorité), classement par stock estimé |
| 3. Prix et budget | Rien de bloquant ; `stock_event.purchased` est l'endroit naturel d'un prix | Colonne `price` nullable sur l'événement d'achat, agrégats par session de courses |
| 4. Pause de consommation (absence) | Le moteur reçoit la date courante en paramètre (4.1) | Table `household_pause` (début, fin) ; le moteur soustrait les jours de pause du temps écoulé |
| 5. Alerte de péremption, notifications | `shelf_life_days`, dates d'achat | Natif seulement (phase B) : Expo Notifications, calcul local quotidien par tâche en arrière-plan ; aucune Edge Function tant que l'alerte est calculée sur l'appareil |
| 6. Répartition des courses entre membres | Foyer partagé, lignes synchronisées entre membres en une seconde | Colonne `assigned_to` nullable sur `list_line` (ou affectation par catégorie), filtre « ma part » sur la Liste |
| Import de commandes drive | Modèle d'événement d'achat avec `source` | Edge Function d'import, correspondance produits drive → produits génériques, `source = import` |
| Code-barres | Produit générique | Table `product_barcode` (code, produit) ; scan natif (phase B) ; variantes rattachées au produit générique |

### 10.1 Invariants à ne jamais casser

1. Toute donnée métier porte `household_id` ; jamais `user_id` hors `household_member`.
2. Le stock reste dérivé : aucune évolution n'introduit de colonne de stock persistée et synchronisée.
3. Le moteur reste pur et sans effet de bord ; une nouvelle règle est une nouvelle fonction avec ses fixtures.
4. Les écrans ne voient ni SQL ni PowerSync ; une évolution passe par un nouveau dépôt ou une nouvelle commande dans `data`.
5. Le catalogue n'écrit jamais dans `product`.
6. Aucune fonction serveur n'est nécessaire à l'usage quotidien ; elles n'existent que pour l'inscription, l'invitation et le départ d'un foyer, la suppression de compte et, plus tard, les imports.
