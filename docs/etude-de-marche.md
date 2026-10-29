# Commedab — Étude de marché

## 1. Objet et méthode

Cette étude confronte le projet (spécifications fonctionnelles v1) à l'offre existante afin de vérifier qu'il apporte une valeur réelle, d'identifier ce qui est déjà fait ailleurs, et d'ajuster le positionnement avant la phase technique.

Méthode : recension des applications grand public (France et international), des outils open source auto-hébergés et des fonctions intégrées aux applications d'enseignes, à partir des fiches éditeurs, des comparatifs 2025-2026 et des retours d'utilisateurs. Aucune application n'a été installée ; les constats reposent sur les sources listées en fin de document et datent d'octobre 2026.

## 2. Synthèse

**Le marché est saturé sur la liste de courses simple et sur l'inventaire domestique explicite. Il est quasiment vide sur l'approche du projet : un stock déduit des achats, sans inventaire, qui alimente des suggestions.**

Trois constats structurent l'étude :

1. La liste de courses partagée est un commodité gratuite, maîtrisée par Bring!, Listonic, AnyList et désormais Apple Rappels (tri automatique par rayon depuis iOS 17). Aucun projet ne gagnera sur ce terrain ; il faut y être au niveau, sans plus.
2. Les applications d'inventaire domestique (KitchenPal, NoWaste, Pantry Check, Grocy, et la vague 2025-2026 à scan de ticket : Fango, Expireless, The Pantry) échouent toutes sur le même point, documenté par leurs propres éditeurs : la saisie manuelle tue l'usage en deux semaines. Leur réponse est de rendre la saisie plus rapide (ticket, code-barres, IA), pas de la supprimer.
3. L'apprentissage du rythme d'achat pour prédire les manques existe, mais à la marge : Capitan (2015, disparu), L1st.ai (prédiction après 3 à 5 courses, modèle par abonnement), la fonction « produits habituels » des drives, et les « Regulars » d'Ocado dont les utilisateurs disent qu'ils prédisent mal. Personne ne combine période de couverture, rythme appris, recettes nettes du stock estimé et parcours en magasin dans une app simple.

Le projet est donc pertinent, à deux conditions : se positionner comme « la liste de courses qui apprend » et non comme un gestionnaire de stock (segment discrédité), et atteindre un niveau de qualité de suggestion qui justifie de quitter Bring! ou Rappels, car la liste simple n'est pas un argument.

## 3. Panorama du marché

Quatre segments se partagent le besoin « savoir quoi acheter ». Le projet se situe à l'intersection des deux premiers, avec un pied dans le troisième.

| Segment | Promesse | Acteurs représentatifs | Modèle économique | État |
| --- | --- | --- | --- | --- |
| Liste de courses partagée | Ne rien oublier, partager en temps réel, trier par rayon | Bring!, Listonic, AnyList, OurGroceries, Apple Rappels, Google Keep | Gratuit avec publicité et promotions d'enseignes (Bring!), freemium (AnyList, Listonic), intégré à l'OS (Apple) | Mature, saturé, gratuit |
| Inventaire domestique | Savoir ce qu'on a, éviter les doublons et le gaspillage, alerter sur les dates | KitchenPal, NoWaste, Pantry Check, Out of Milk, Panzy, Your Food, Fango, Expireless, The Pantry, Grocy, Kitchentory | Freemium, abonnement, open source auto-hébergé | Fragmenté, fort taux d'abandon, renouvellement par le scan de ticket (2025-2026) |
| Recettes vers liste | Choisir des repas, obtenir la liste, commander | Jow (France), Mealime, Samsung Food, Paprika, AnyList | Gratuit financé par les enseignes partenaires (Jow), abonnement | Dominé en France par Jow, adossé aux drives |
| Réassort par l'enseigne | Retrouver ses produits habituels, panier pré-rempli | E.Leclerc Drive « produits habituels », Carrefour (panier via Assistant Google à partir des achats passés), Ocado Regulars, Amazon « Abonnez-vous et économisez » | Captif à l'enseigne | Fonctionnel mais limité à l'historique de commande, pas de notion de consommation |

### 3.1 Ce que chaque segment fait bien et mal

- Les listes partagées sont excellentes sur la saisie (autocomplétion, voix, suggestions « vous avez probablement besoin de » chez Bring!) et sur le parcours en magasin, mais ne savent rien du stock : la liste repart de zéro ou de l'historique brut.
- Les inventaires savent ce qu'il y a chez l'utilisateur, à condition qu'il le dise ; ils dérivent dès la deuxième semaine et perdent sa confiance. Grocy, le plus complet, est explicitement décrit comme un « ERP de la cuisine », exigeant et réservé aux auto-hébergeurs.
- Les applications de recettes produisent des listes exactes pour les repas, mais ignorent les produits du quotidien hors recettes ou les traitent par des favoris à cocher (Jow).
- Les enseignes connaissent l'historique d'achat mieux que quiconque, mais ne modélisent pas la consommation : « produits habituels » est une liste de favoris, pas une prédiction, et l'utilisateur est enfermé dans l'enseigne.

## 4. Acteurs clés

### 4.1 Bring! (Suisse, référence européenne)

Liste partagée gratuite, très répandue en Europe germanophone et en France. Points forts : prise en main en moins de trente secondes, suggestions « vous avez probablement besoin de » pour remplir une liste de produits de base en quelques gestes, historique des achats récents à remettre sur la liste, suggestions d'articles associés à la saisie, tri par rayon paramétrable, calculateur de portions sur les recettes. Financée par les prospectus et offres d'enseignes affichés dans l'app, avec publicité. Pas de notion de stock ni de rythme : les suggestions sont génériques ou tirées de l'historique brut.

### 4.2 Listonic (Pologne)

Concurrent direct de Bring!, gratuit sans limite, revendique de mémoriser les achats fréquents et de permettre le suivi d'articles récurrents, avec un assistant IA qui compose une liste à partir d'une consigne ou d'une photo. La comparaison éditeur reconnaît l'absence de liste de garde-manger avec état de stock. Le plus proche du projet sur la saisie et l'ergonomie ; rien sur l'estimation.

### 4.3 Apple Rappels (iOS 17 et suivants)

Le type de liste « Courses » classe automatiquement chaque article dans un rayon (fruits et légumes, viande, produits laitiers, hygiène…), mémorise les corrections de l'utilisateur, se partage en famille et se synchronise par iCloud. Gratuit, pré-installé, sans publicité. C'est le concurrent qui fixe le niveau minimal : une liste à tri automatique par rayon n'est plus une fonctionnalité, c'est un acquis de l'OS.

### 4.4 Jow (France)

Application française gratuite, 4,8/5 sur plus de 100 000 avis App Store, partant des recettes pour générer une liste puis remplir le panier d'un drive partenaire (Carrefour, Leclerc, Auchan, Intermarché, Monoprix…). Demande dès l'inscription la taille du foyer et les préférences, adapte les quantités au nombre de personnes, mémorise les produits du quotidien hors recettes sous forme d'icônes à ajouter en un clic. Financée par les enseignes. Limites signalées par les utilisateurs : catalogue de recettes dépendant du drive choisi, inutile pour qui fait ses courses chez Lidl, Aldi ou en magasin de proximité, sauf via un compte « sans enseigne » payant pour la liste à cocher. Jow possède le segment recettes → liste en France ; le projet ne doit pas chercher à le concurrencer sur les recettes.

### 4.5 Inventaires domestiques : KitchenPal, NoWaste, Pantry Check, Panzy, Your Food

Tous reposent sur un inventaire explicite par emplacement (placard, frigo, congélateur), avec dates de péremption, alertes, code-barres, et génération de liste à partir des produits bas ou terminés. KitchenPal propose des recettes filtrées par le contenu du garde-manger et une liste construite à partir des produits « récemment finis, bas, souvent achetés ». Panzy déplace automatiquement vers la liste les produits en stock bas. Les comparatifs 2026 convergent sur le même diagnostic : l'inventaire dérive dès que l'utilisateur cesse de le mettre à jour, et un inventaire à moitié faux est pire qu'aucun.

### 4.6 La vague « scan de ticket » : Fango, Expireless, The Pantry, Cooklist

Réponse 2025-2026 au problème de saisie : une photo du ticket de caisse crée 20 à 40 lignes d'inventaire, l'IA reconnaît les produits et estime les dates. Fango (Finlande) ajoute une liste de courses qui lit l'inventaire, suggère ce qui va manquer et se trie par rayon. The Pantry déduit les ingrédients du stock à chaque recette cuisinée. Ces apps traitent l'entrée de stock ; la sortie reste manuelle (« un geste de moins de 5 secondes par article », selon Expireless). Elles confirment que la demande existe pour un stock « qui se remplit tout seul », et que l'obstacle restant est la consommation.

### 4.7 Grocy (open source, auto-hébergé)

Référence des auto-hébergeurs (8 600 étoiles GitHub, neuf ans) : stock par transactions (achat, consommation, transfert), dates, codes-barres, quantités minimales déclenchant la liste, recettes avec vérification de disponibilité et déduction du stock, corvées, piles, équipements. Modèle rigoureux et exhaustif, qui suppose de saisir chaque consommation. KitchenOwl occupe le créneau inverse : liste partagée et recettes, sans stock. Aucun outil open source n'occupe l'entre-deux visé par le projet.

### 4.8 Les précurseurs de la prédiction : Capitan, L1st.ai, Grocery

Capitan (2015) promettait une liste qui apprend les habitudes, suggère ce qui manque et trie par rayon à partir de l'ordre de cochage agrégé ; l'app n'est plus active. L1st.ai (2025-2026) affiche une flamme sur les produits « probablement bas », apprend la fréquence par produit après trois à cinq courses, et associe des promotions d'enseignes ; cible nord-américaine. Grocery (iOS) apprend l'ordre dans lequel l'utilisateur coche ses articles pour trier la liste suivante, et conserve un historique d'achats avec statut de stock. Ces trois apps valident l'idée de base ; aucune n'a atteint la masse critique, et aucune ne relie la prédiction à une période de couverture ni aux recettes.

### 4.9 Enseignes et drives

E.Leclerc Drive propose une rubrique « Mes produits habituels » ; Carrefour a construit avec Google un panier vocal rempli à partir des achats précédents ; Ocado (Royaume-Uni) vend des « Regulars » à fréquence choisie, dont des utilisatrices rapportent qu'il fallait sans cesse ajouter et retirer des articles faute de bonne prédiction. L'historique d'achat seul, sans modèle de consommation ni correction par l'utilisateur, ne produit pas de liste fiable : c'est précisément l'écart que le projet comble.

## 5. Enseignements transversaux

### 5.1 Pourquoi les applications de stock sont abandonnées

Les éditeurs eux-mêmes le documentent dans leurs comparatifs : la saisie manuelle est faite avec enthousiasme une semaine, puis une fois, puis plus jamais ; au bout de deux ou trois semaines l'inventaire ne correspond plus à la réalité et chaque suggestion repose sur des produits que l'utilisateur n'a plus. Un inventaire à moitié à jour est pire qu'aucun parce qu'on cesse de lui faire confiance. Les deux parades observées sont le scan de ticket pour l'entrée, et un geste unique pour la sortie. Aucun acteur grand public n'a tenté la troisième voie du projet : ne pas tenir d'inventaire et estimer.

Le second mécanisme d'abandon est l'absence de récompense immédiate : marquer un produit « fini » n'a d'intérêt que si cela produit quelque chose tout de suite. Les apps qui survivent sont celles où l'action a un effet visible. Le projet n'a pas de geste « fini » : son seul signal, ajouter un produit à la liste, a un effet visible immédiat. Le choix de suggérer plutôt que d'ajouter automatiquement doit, lui, être compensé par des suggestions visibles dès l'ouverture du panneau d'ajout, sinon elles seront ignorées.

### 5.2 Ce que les utilisateurs valorisent

Dans les avis et comparatifs, les critères qui reviennent sont, par ordre : le partage en temps réel, la rapidité de saisie (autocomplétion, voix), le tri par rayon, l'absence de compte obligatoire, l'absence de publicité, le fonctionnement hors ligne. Le partage est systématiquement cité en premier pour les apps de liste, y compris par des utilisateurs seuls qui ne s'en servent pas : il conditionne l'adoption par le foyer et, à terme, la recommandation.

### 5.3 Tendances 2025-2026

- Entrée de données par IA : ticket photographié, e-ticket partagé depuis l'app de l'enseigne, commande vocale, photo de placard.
- Tri par rayon devenu standard, jusque dans l'OS (Apple Rappels).
- Monétisation par les enseignes (prospectus, promotions, commissions drive) plutôt que par l'utilisateur, sauf pour les apps de niche à abonnement.
- Multiplication de petites apps « IA » à faible traction, souvent sans modèle de consommation réel derrière le discours.

### 5.4 Contexte démographique français

Selon l'Insee, 33 % des ménages étaient composés d'une seule personne en 2018 et cette part atteindrait 41 % en 2050 ; la taille moyenne des ménages, autour de 2,2 personnes, continue de baisser. Un MVP mono-utilisateur adresse donc un tiers des foyers, et la cible solo ne se résume pas à un cas de test personnel. Les foyers de deux personnes et plus restent majoritaires et attendent le partage : c'est l'évolution n° 6 du cahier des charges, à ne pas repousser trop loin.

## 6. Positionnement du projet

### 6.1 Matrice fonctionnelle

| Capacité | Bring! / Listonic | Apple Rappels | Jow | KitchenPal / NoWaste | Fango / Expireless | Grocy | L1st.ai | Projet (MVP) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Liste partagée temps réel | Oui | Oui | Non | Oui | Oui | Oui | Oui | Non (évolution 6) |
| Tri par rayon | Oui | Oui, automatique | Oui | Oui | Oui | Oui | Oui | Oui |
| Hors ligne en magasin | Partiel | Oui | Non | Partiel | Oui | Non | ? | Oui |
| Sans inventaire initial | Oui | Oui | Oui | Non | Non, ticket | Non | Oui | Oui |
| Stock connu | Non | Non | Non | Déclaré | Déclaré par ticket | Déclaré par transactions | Non | Estimé |
| Rythme de consommation appris | Non | Non | Non | Non | Non | Non | Oui, fréquence | Oui, déclaré ou appris |
| Suggestions « va manquer » | Génériques | Non | Non | Sur stock déclaré | Sur stock déclaré | Sur minimum déclaré | Oui | Oui, avec justification |
| Période de couverture | Non | Non | Semaine | Non | Non | Non | Non | Apprise, 2 à 31 jours |
| Recettes nettes du stock | Non | Non | Non | Oui, sur stock déclaré | Partiel | Oui | Non | Oui, sur stock estimé |
| Correction en un geste | s.o. | s.o. | s.o. | Non | Oui | Non | ? | Oui |
| Gratuit, sans pub, sans compte obligatoire | Pub | Oui | Enseignes | Freemium | Freemium | Oui, auto-hébergé | Abonnement | À décider |

### 6.2 Différenciation réelle

Trois éléments ne se trouvent réunis nulle part et constituent la proposition de valeur :

1. **Stock estimé sans saisie**, à partir des achats et d'un rythme appris, recalé par les ajouts manuels à la liste. C'est l'inverse exact du modèle dominant (inventaire déclaré), et la réponse directe à la cause d'abandon n° 1.
2. **Période de couverture** : la question « pour combien de jours ? » n'existe dans aucune app étudiée, alors qu'elle change tout entre une course quotidienne et un plein mensuel. Le projet y répond sans la poser, en l'apprenant du rythme des courses.
3. **Recettes nettes du stock estimé** : seuls les ingrédients qui manquent partent sur la liste, sans exiger d'inventaire. Grocy et KitchenPal le font, mais sur un stock déclaré.

S'y ajoutent deux choix de conception qui sont des différenciateurs d'usage plutôt que de fonction : la divulgation progressive (l'app reste une liste simple tant que l'utilisateur ne veut pas plus) et la justification de chaque suggestion, absente de toutes les apps « intelligentes » observées.

### 6.3 Ce qui n'est pas différenciant

Tri par rayon, catalogue de produits, saisie rapide, liste utilisable en magasin, recettes personnelles : ce sont des prérequis que Bring!, Listonic et Apple Rappels font gratuitement et bien. Le projet doit les faire au niveau, mais aucun utilisateur ne changera d'app pour cela.

## 7. Menaces et risques de marché

| Menace | Probabilité | Impact | Lecture |
| --- | --- | --- | --- |
| Bring! ou Listonic ajoutent une prédiction par rythme d'achat | Élevée à moyen terme | Fort | Listonic annonce déjà le suivi d'articles récurrents ; ils ont l'historique et des millions d'utilisateurs. Le projet n'a pas de barrière défensive sur la fonction elle-même, seulement sur la qualité d'exécution et l'absence de publicité. |
| Apple ou Google intègrent la suggestion de réassort dans Rappels ou Keep | Moyenne | Fort | Apple a déjà pris le tri par rayon. Une suggestion « vous achetez du lait chaque semaine » est à leur portée. |
| Jow étend ses « produits du quotidien » à un vrai modèle de consommation | Moyenne | Moyen | Jow a le foyer, l'historique de commande drive et les quantités ; mais son modèle dépend des enseignes partenaires et du drive, pas du magasin physique. |
| Les apps à scan de ticket ajoutent l'estimation de consommation | Moyenne | Moyen | Fango suggère déjà ce qui va manquer sur stock déclaré ; coupler ticket et rythme serait naturel. Elles restent dépendantes de l'OCR et d'un compte. |
| Le marché ne veut pas d'une app de plus : la liste simple suffit | Élevée | Fort | C'est le risque principal. Il ne se lève que par la preuve, à l'usage, que les suggestions font gagner du temps. |
| Faible fiabilité perçue des suggestions le premier mois | Élevée | Fort | Documenté chez Ocado Regulars : une prédiction médiocre est pire qu'aucune. Le démarrage à froid doit être géré par le catalogue et la justification des suggestions. |

Aucune de ces menaces n'invalide le projet en tant que projet personnel ou d'apprentissage ; elles bornent son potentiel en tant que produit : la fenêtre existe, elle n'est pas défendable par la fonction seule.

## 8. Recommandations

### 8.1 Positionnement

- Nommer et présenter le projet comme **une liste de courses qui apprend ce que vous consommez**, jamais comme une gestion de stock ou un inventaire. Le mot « stock » ne doit pas apparaître dans l'interface ; « il vous en reste probablement » suffit.
- Assumer le créneau gratuit, sans publicité, sans compte obligatoire et hors ligne, que Bring! (publicité) et L1st.ai (abonnement) n'occupent pas. Le coût est de renoncer à la monétisation par les enseignes ; en projet personnel, c'est cohérent.
- Ne pas concurrencer Jow sur les recettes : les recettes du projet servent la liste, pas l'inspiration. Envisager à terme un import de recettes depuis une URL plutôt qu'un catalogue.

### 8.2 Ajustements aux spécifications

| Sujet | Proposition | Origine |
| --- | --- | --- |
| Apprentissage de l'ordre des rayons | Mémoriser l'ordre dans lequel l'utilisateur coche en magasin et proposer de réordonner les catégories en conséquence. Peu coûteux, différenciant au quotidien. | Grocery (iOS), Capitan |
| Partage | Garder hors MVP, mais concevoir le modèle de données avec un « foyer » dès le départ (toute donnée rattachée au foyer, pas à l'utilisateur) pour que l'évolution 6 ne soit pas une migration. | 5.2, 5.4 |
| Import d'achats | Ajouter aux évolutions un import des commandes drive (export ou e-ticket) comme accélérateur d'historique, avant le scan de ticket par OCR, plus fragile. | 4.6, 4.9 |
| Justification des suggestions | Déjà prévue (EF-2.5) ; la rendre centrale dans le panneau d'ajout, c'est l'argument de confiance que personne d'autre n'offre. | 6.2 |

### 8.3 Feuille de route recommandée

1. MVP tel que spécifié, en usage personnel, jusqu'à ce que les suggestions tiennent leurs objectifs (2.4 des spécifications fonctionnelles).
2. Partage de la liste au sein d'un foyer : c'est la condition pour que d'autres personnes l'utilisent et en parlent.
3. Import d'historique drive, puis planning des repas.
4. Durée de conservation, alerte de péremption et notifications.

### 8.4 Décision

Le projet est pertinent et son angle est rare. Sa réussite ne dépend pas de la fonctionnalité, que d'autres pourraient copier, mais de la qualité de l'estimation le premier mois et de la discipline de simplicité. Les spécifications sont alignées avec ces deux exigences ; les ajustements ci-dessus les renforcent sans les élargir.

## Sources

- Comparatifs listes de courses : meslistesdecourses.fr (applications gratuites 2026, apps partagées), Listonic (meilleures apps, comparaison Listonic vs Out of Milk), AlternativeTo (Bring!, Listonic, AnyList, Out of Milk)
- Bring! : getbring.com (blog « best shopping list app », « save money »), fiches App Store et Google Play, Screensdesign
- Apple Rappels : support.apple.com/105086, MacTrast (iOS 17)
- Jow : clubic.com, presse-citron.net, futura-sciences.com, parrainduweb.fr (avis), LSA (partenariat Monoprix), vitepromo.com
- Inventaires : KitchenPal (kitchenpalapp.com, Google Play), NoWaste (App Store), Panzy (App Store), Your Food (yourfood.app), Expireless (expireless.app), Fango (fango.fi, « best pantry inventory app 2026 », « kitchen inventory app »), The Pantry (thepantry.app), Recipy (« best pantry tracking apps 2026 »), MealThinker, Listero, Sously, Vorby, Meet Penny
- Grocy : github.com/grocy/grocy, linuxlinks.com, selfhostyourself.com, dinao.com
- Prédiction : L1st.ai, Capitan (VentureBeat, TechPP, tech.co, Dealroom), Grocery (App Store), smart-replenish (GitHub)
- Enseignes : E.Leclerc Drive (App Store), Carrefour et Google Assistant (Futura, communiqué AMF 2020), Ocado Regulars (The Grocer, Mumsnet)
- Démographie : Insee, projections de ménages 2018-2050 (Insee Analyses n° 201 et 202, Hauts-de-France 2024)
