# Commedab — Spécifications fonctionnelles v2

## 1. Objet du document

Le présent document définit les spécifications fonctionnelles de la version minimale (MVP) d'une application de gestion de liste de courses fondée sur l'estimation du stock domestique. Il décrit le périmètre, les concepts, les règles de gestion et les exigences fonctionnelles et non fonctionnelles. Les choix techniques (architecture, stack, modèle physique de données) font l'objet d'un document distinct.

| Version | Date | Statut |
| --- | --- | --- |
| 1.0 | 15/10/2026 | Validée pour cadrage technique |
| 1.1 | 20/10/2026 | Alignée avec les spécifications techniques (compte, rythme appris, règle RG-5, produits créés à la volée, catégorie différable) |
| 2.0 | 27/10/2026 | Maquettes v2, résumées ci-dessous |

Changements de la v2 :

- La Liste est l'écran d'accueil : une liste unique et permanente du foyer, toujours groupée par rayon et toujours cochable. Plus d'écran Accueil ni de mode magasin ; les exigences du mode magasin (EF-6.x) rejoignent 6.4.
- Cocher une ligne enregistre l'achat, décocher le retire. Plus de clôture de liste ni de « Terminer les courses » : les coches espacées de moins de 3 h forment une session de courses, à la fin de laquelle les lignes cochées quittent la liste.
- Un tap sur une ligne la coche ; un appui long ouvre une mini-feuille (quantité, fiche, « Retirer de la liste ») ; un balayage vers la gauche retire la ligne. Retirer n'enregistre aucun achat ; une ligne non cochée reste simplement sur la liste.
- La période de la liste n'est plus demandée : 7 jours, puis l'intervalle habituel entre deux sessions de courses ; elle se fixe dans l'onglet Compte.
- Les suggestions sont regroupées sur une ligne « N suggestions » en fin de liste, qui se déplie en place.
- « Archiver » devient « Je n'en achète plus ».
- « Fini » et « il m'en reste » passent dans l'onglet Produits, sous « Il t'en reste sûrement peu ».
- Nouvel onglet Compte, avec les membres du foyer et l'invitation : un foyer se partage entre plusieurs comptes dès le MVP. L'agrégation anonyme des noms de produits devient un accord explicite, désactivé par défaut.
- Navigation en quatre onglets : Liste, Produits, Recettes, Compte.

## 2. Contexte et objectifs

### 2.1 Problème adressé

Les applications de liste de courses existantes partent d'une liste vide que l'utilisateur remplit de mémoire. Les applications de gestion de stock domestique exigent un inventaire initial et une mise à jour continue des quantités, effort que les utilisateurs abandonnent rapidement.

### 2.2 Proposition

L'application déduit le contenu de la liste de courses à partir de l'historique des achats et d'un rythme de consommation par produit, déclaré ou appris. Le stock domestique n'est jamais saisi : il est estimé, et l'utilisateur ne fait que cocher ce qu'il achète et signaler les écarts.

### 2.3 Principe de conception : simple par défaut, paramétrable à la demande

L'application doit pouvoir être utilisée comme une liste de courses ordinaire, sans que l'utilisateur ait jamais à manipuler les notions de rythme, de famille, de contenance ou de stock estimé. Ces mécanismes fonctionnent en arrière-plan à partir des achats validés, et leurs effets apparaissent progressivement sous forme de suggestions. Tout paramètre reste accessible et modifiable par l'utilisateur qui le souhaite, mais aucun n'est exigé : un champ facultatif non renseigné se comporte toujours de manière raisonnable. Cette exigence prime sur la précision des estimations.

### 2.4 Objectifs mesurables du MVP

- Après un mois d'utilisation, la liste pré-remplie demande moins de deux minutes de correction avant un passage en magasin.
- Aucun produit de consommation régulière n'est oublié sur deux cycles de courses consécutifs.
- L'ajout d'une recette n'introduit aucun ingrédient déjà présent en stock estimé suffisant.

Ces objectifs sont mesurés par un indicateur conservé localement : pour chaque session de courses, le nombre de suggestions acceptées, modifiées et refusées, ainsi que le nombre de lignes ajoutées manuellement. L'objectif est atteint lorsque les suggestions acceptées sans modification dépassent 80 % sur trois sessions de courses consécutives.

## 3. Périmètre

### 3.1 Décisions de cadrage

| Sujet | Décision | Justification |
| --- | --- | --- |
| Utilisateurs | Un foyer, partagé par un ou plusieurs comptes sur invitation | Les courses d'un foyer se font à plusieurs ; toute donnée étant rattachée au foyer, le partage n'ajoute qu'un membre |
| Compte | Obligatoire, créé à la première ouverture (e-mail et mot de passe, ou Google) | Les données survivent à un changement d'appareil ; multi-appareil dès le MVP |
| Référentiel produit | Produits génériques (« lait », « yaourts nature »), sans marque ni code-barres | Saisie rapide, liste lisible |
| Inventaire initial | Aucun | Effort rédhibitoire ; le stock se construit à partir des achats |
| Niveau de stock | Événements discrets (acheté, entamé, fini), jamais de jauge ; un relevé manuel reste possible mais n'est jamais demandé | Une jauge continue n'est pas maintenue dans la durée |
| Prix et budget | Hors périmètre | Sans valeur sur le problème ciblé |
| Recettes | Ingrédients et portions uniquement, sans instructions ni catalogue de recettes | Elles ne servent qu'à alimenter la liste |
| Liste | Un seul écran, la Liste, pour préparer et faire les courses ; toujours groupée par rayon | Un mode à basculer s'oublie ; plusieurs vues n'apportent rien en rayon |
| Navigation | Quatre onglets : Liste (écran d'accueil), Produits, Recettes, Compte ; une fiche par produit | Chaque onglet répond à un moment : faire ses courses, signaler ce qui manque, cuisiner, régler |
| Fin des courses | Aucune action : les coches espacées de moins de 3 h forment une session, qui se termine d'elle-même | Un bouton « Terminer » s'oublie, et l'oubli fausse les dates d'achat |

### 3.2 Hors périmètre du MVP

Les fonctionnalités suivantes sont explicitement exclues : planification des repas par créneau, lecture de codes-barres, répartition des courses entre membres, catalogue de recettes et suggestions, profils par enseigne, suivi des prix, notifications push, import de tickets de caisse.

## 4. Acteurs

| Acteur | Description |
| --- | --- |
| Membre | Personne du foyer disposant d'un compte. Un foyer compte un ou plusieurs membres, invités par un membre existant (EF-7.4) ; tous voient et modifient les mêmes données. « L'utilisateur » désigne dans ce document n'importe quel membre. |
| Système | L'application elle-même, qui estime les stocks, apprend les rythmes et construit les suggestions. |

## 5. Glossaire et concepts

| Terme | Définition |
| --- | --- |
| Produit | Article générique acheté régulièrement, défini par un nom, une catégorie, une unité d'achat et une famille ; attributs facultatifs en 5.5. |
| Catégorie | Regroupement de produits correspondant à un rayon de magasin ; ordonnée pour le parcours en magasin. |
| Unité d'achat | Conditionnement dans lequel le produit s'achète (paquet, bouteille, tube, kg, pièce). Un produit n'a qu'une unité d'achat. |
| Famille | Mode de rachat du produit : à rythme ou à réserve (voir 5.1). |
| Rythme de consommation | Vitesse à laquelle le produit est consommé, dans l'unité d'achat du produit (voir 5.2). |
| Événement de stock | Fait daté enregistré sur un produit : acheté, entamé (dernière réserve), fini, ou relevé (quantité constatée par l'utilisateur, facultatif). |
| Stock estimé | Quantité probable restante au foyer, calculée et jamais saisie (voir 5.3). |
| Catalogue | Base de produits courants livrée avec l'application, avec des valeurs par défaut. |
| Taille du foyer | Nombre de personnes, réglage du foyer servant aux valeurs par défaut (voir 5.4). |
| Liste de courses | Liste unique et permanente du foyer, écran d'accueil de l'application : des lignes (produit, quantité, cochée ou non, origine : suggestion, saisie manuelle ou recette). Elle n'est jamais créée ni clôturée. |
| Session de courses | Suite de coches espacées de moins de 3 h, quel que soit le membre qui coche. Elle se termine d'elle-même 3 h après la dernière coche ; elle est déduite des coches et jamais saisie (EF-4.11). |
| Période de la liste | Nombre de jours que les suggestions doivent couvrir : 7 au départ, puis l'intervalle habituel entre deux sessions de courses (EF-4.1). |
| Recette | Nom, nombre de portions et liste d'ingrédients référencés dans le référentiel produits. |

### 5.1 Familles de produits

Les deux familles portent un rythme de consommation mais obéissent à des logiques de suggestion distinctes.

| Famille | Exemples | Rythme exprimé en | Déclencheur de suggestion |
| --- | --- | --- | --- |
| À rythme | lait, yaourts, pain, fruits | quantité par durée (1 yaourt/jour, 300 g/semaine) | Quantité à acheter = rythme × période − stock estimé, si positive |
| À réserve | lessive, dentifrice, piles, papier toilette | durée de vie d'une unité d'achat (1 tube ≈ 6 semaines) | Événement « entamé la dernière réserve », ou réserve estimée épuisée avant la fin de la période |

Un stock de sécurité (nombre d'unités d'avance, 1 par défaut) est configurable par produit de la famille « à réserve ».

### 5.2 Sources du rythme de consommation

Le système retient la première source disponible dans l'ordre suivant :

1. Rythme déclaré par l'utilisateur sur la fiche produit.
2. Rythme appris : pour chaque achat, le taux observé est la quantité achetée divisée par la durée jusqu'à l'achat suivant ou jusqu'à un « fini », le premier des deux ; le rythme est la médiane des cinq derniers taux. Un rythme appris n'est utilisé qu'à partir de trois achats enregistrés, et reste borné entre la moitié et le double de la valeur de référence tant qu'il repose sur moins de cinq intervalles.
3. Rythme indicatif du catalogue, ajusté à la taille du foyer ; à défaut, valeur par défaut de la catégorie.

### 5.3 Stock estimé

Le stock estimé est reconstruit depuis le dernier événement d'ancrage : un « fini » (valeur zéro), un « entamé la dernière réserve » (une unité d'achat) ou un relevé (quantité constatée). Stock estimé = valeur de l'ancre + achats postérieurs − rythme × temps écoulé depuis l'ancre, borné à zéro. Sans ancre, le calcul part du premier achat connu. L'estimation est toujours présentée comme telle et corrigeable en un geste.

### 5.4 Taille du foyer

Réglage du foyer demandé au premier lancement et modifiable dans l'onglet Compte. Il n'intervient que dans les valeurs par défaut : les rythmes indicatifs du catalogue sont exprimés pour une personne et multipliés à la création du produit selon un coefficient propre à chaque entrée du catalogue (« par personne » pour les yaourts, « par foyer » pour le liquide vaisselle) ; il fixe également le nombre de portions proposé lors de l'ajout d'une recette. Une modification ultérieure ne recalcule que les produits encore sur leur rythme par défaut ; les rythmes déclarés ou appris ne sont jamais modifiés.

### 5.5 Attributs facultatifs du produit

| Attribut | Rôle |
| --- | --- |
| Contenance | Quantité contenue dans une unité d'achat (paquet de 1 kg, boîte de 6 œufs). Permet d'exprimer un rythme ou un ingrédient en grammes, litres ou pièces, converti en fraction d'unité d'achat (RG-1). |
| Durée de conservation | Durée pendant laquelle le produit reste consommable (pain : 2 jours, yaourts : 3 semaines). Borne la quantité suggérée quelle que soit la période choisie (RG-10). |
| Ponctuel | Produit acheté sans régularité (apéritif, réception). Jamais suggéré, exclu de l'apprentissage (RG-4). Attribué uniquement par l'utilisateur, depuis la fiche produit ; jamais par défaut : un produit créé à la volée est « à rythme » sans rythme, et devient suggérable dès que son rythme est appris ou déclaré, ou une fois après un « fini » (EF-3.2). |

## 6. Exigences fonctionnelles

Chaque exigence est identifiée EF-x.y. Les critères d'acceptation en précisent la vérification.

### 6.1 Référentiel produits

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-1.1 | L'utilisateur peut créer un produit en une saisie : seuls le nom et la catégorie sont demandés ; l'unité d'achat (pièce par défaut), la famille (à rythme par défaut), le rythme et les attributs de 5.5 sont facultatifs et modifiables ensuite. | Un produit est créé avec le nom et la catégorie en moins de 10 secondes. |
| EF-1.2 | L'utilisateur peut créer un produit à partir du catalogue par recherche sur le nom ; la fiche est pré-remplie (catégorie, famille, unité, contenance, durée de conservation, rythme ajusté au foyer) et modifiable avant validation. | La recherche renvoie les entrées du catalogue correspondantes ; le produit créé appartient à l'utilisateur et n'est pas modifié par une mise à jour ultérieure du catalogue. |
| EF-1.3 | L'utilisateur peut créer un produit à la volée depuis la liste de courses en saisissant un nom inconnu ; la catégorie est demandée mais peut être différée : sans catégorie, le produit est rangé dans un groupe « À classer » affiché en tête de liste. Le produit est « à rythme » sans rythme connu ; il n'est suggéré qu'après trois achats (RG-3) ou un rythme déclaré, ou une fois après un « fini » (EF-3.2). | Le produit apparaît immédiatement dans la liste et dans le référentiel. |
| EF-1.4 | L'utilisateur peut modifier un produit, ou indiquer « Je n'en achète plus » depuis sa fiche ou en refusant une suggestion (EF-4.4) : le produit est archivé, n'est plus suggéré et conserve son historique. Le retrouver par le champ unique (EF-4.9) et l'ajouter à la liste le réactive. | Les achats passés restent consultables après archivage ; un produit archivé reste trouvable par la recherche. |
| EF-1.5 | Les rayons (catégories) sont ordonnés par glisser-déposer dans l'onglet Compte. L'ordre détermine le parcours en magasin. | L'ordre est conservé, partagé par les membres du foyer et appliqué à la Liste. |
| EF-1.6 | L'utilisateur peut déclarer, modifier ou supprimer le rythme d'un produit. | Un rythme déclaré est utilisé en priorité sur toute autre source dès le calcul suivant des suggestions. |
| EF-1.7 | Un jeu de catégories par défaut est livré avec l'application dans un ordre de parcours usuel ; l'utilisateur peut, dans l'onglet Compte, en créer, renommer, fusionner ou supprimer, sauf les catégories système (RG-9). | La suppression d'une catégorie demande vers quelle catégorie déplacer ses produits. |
| EF-1.8 | L'onglet Produits présente le référentiel, consultable par recherche sur le nom et par catégorie, avec le stock estimé et la date du dernier achat de chaque produit ; la section « Il t'en reste sûrement peu » (EF-3.3) est en tête. | La recherche répond à la frappe sans validation. |

### 6.2 Achats et historique

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-2.1 | Cocher une ligne enregistre un événement « acheté », daté de l'instant de la coche, avec la quantité de la ligne ; décocher la ligne retire cet achat (EF-4.10). | Chaque ligne cochée produit exactement un achat ; une ligne décochée ou retirée n'en laisse aucun. |
| EF-2.2 | Une ligne non cochée reste sur la liste d'une session de courses à l'autre, jusqu'à ce qu'elle soit cochée ou retirée. | Après les courses, une ligne non cochée est toujours sur la liste, avec sa quantité. |
| EF-2.3 | L'historique des achats d'un produit (date, quantité) est consultable depuis sa fiche. | Les achats s'affichent du plus récent au plus ancien. |
| EF-2.4 | L'utilisateur peut corriger ou supprimer un achat enregistré par erreur : depuis la Liste tant que dure la session de courses (EF-4.5, EF-4.10), puis depuis la fiche produit. | La correction recalcule le stock estimé et le rythme appris. |

### 6.3 Réapprovisionnement

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-3.1 | L'utilisateur peut signaler « fini » ou « entamé la dernière réserve » sur un produit en un geste, depuis l'onglet Produits (section « Il t'en reste sûrement peu », ou produit trouvé par la recherche) ou depuis la fiche produit. | L'événement prend la date du jour (corrigeable depuis la fiche, jamais demandée) et recale le stock estimé selon 5.3 ; un message éphémère confirme « proposé pour tes prochaines courses » et permet d'annuler. |
| EF-3.2 | Un événement ne modifie jamais la liste ; il marque le produit « à racheter », qui entre dans les suggestions (EF-4.13), même sans rythme connu. Un produit proposé à ce seul titre l'est jusqu'à la fin des premières courses commencées après l'événement : s'il n'a pas été ajouté, il n'est plus proposé jusqu'au prochain événement. | Aucune ligne n'est ajoutée à la liste à la suite d'un événement. |
| EF-3.3 | La section « Il t'en reste sûrement peu », en tête de l'onglet Produits, présente les produits dont le stock estimé est probablement bas, chacun confirmable (« fini ») ou ignorable (« il m'en reste »). | Ignorer enregistre un relevé d'une unité d'achat à la date du jour ; aucun autre ajustement. |
| EF-3.4 | L'utilisateur peut annuler un événement signalé par erreur depuis la fiche produit. | L'annulation restaure l'estimation antérieure. |
| EF-3.5 | L'utilisateur peut saisir, depuis la fiche produit, la quantité qu'il constate chez lui (relevé). Le relevé fixe le stock estimé à cette valeur à cette date et sert de nouveau point de départ. Il n'est proposé nulle part ailleurs et jamais demandé ; il est accessible depuis la justification d'une suggestion (EF-4.8) pour corriger une estimation jugée fausse. | Un relevé remplace l'estimation courante ; l'estimation suivante repart du relevé et du rythme. Aucun écran n'incite à faire un relevé. |

### 6.4 Liste de courses

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-4.1 | La période que couvrent les suggestions n'est jamais demandée : 7 jours au départ, puis, dès trois sessions de courses sur des jours distincts, la médiane des cinq derniers intervalles entre sessions, bornée entre 2 et 31 jours. L'utilisateur peut la fixer dans l'onglet Compte, de 1 à 31 jours, ou revenir au réglage automatique (EF-7.2). | Aucun écran de la Liste ne demande de période ; une période fixée prime sur la période apprise. |
| EF-4.2 | Le système propose les produits « à rythme » dont la quantité calculée (5.1) est positive, bornée par la durée de conservation (RG-10) et arrondie au pas de l'unité d'achat (RG-2). | Un produit dont le stock estimé couvre la période n'est pas proposé ; une période de 31 jours ne propose pas plus de deux jours de pain. |
| EF-4.3 | Le système propose les produits « à réserve » marqués « à racheter » ou dont la réserve estimée s'épuise avant la fin de la période, à hauteur du stock de sécurité. | Un produit à réserve suggéré propose une quantité égale à son stock de sécurité. |
| EF-4.4 | Chaque suggestion est acceptée ou refusée en un geste. Accepter ajoute la ligne à la liste. Le refus distingue « il m'en reste » (recale l'estimation) et « je n'en achète plus » (archive le produit, EF-1.4). | Un produit refusé n'est pas re-suggéré avant la fin des courses suivantes. |
| EF-4.5 | Un appui long sur une ligne ouvre une mini-feuille : quantité −/+, accès à la fiche produit, « Retirer de la liste ». Un balayage vers la gauche retire la ligne, sans autre choix. Retirer n'enregistre aucun achat. La quantité se modifie aussi sur une ligne cochée (promotion, lot) : l'achat prend la nouvelle quantité, prise en compte dans le stock estimé (5.3). | Les modifications manuelles priment sur les suggestions ; un produit retiré n'est pas re-suggéré avant la fin des courses suivantes. |
| EF-4.6 | L'utilisateur peut ajouter une ou plusieurs recettes à la liste depuis l'onglet Recettes (voir 6.5). | Les ingrédients résultants sont fusionnés avec les lignes existantes. |
| EF-4.7 | La Liste est l'écran d'accueil de l'application : une liste unique et permanente par foyer, sans création ni clôture, toujours groupée par rayon dans l'ordre défini en EF-1.5 (lignes sans catégorie en tête sous « À classer », catégories frais et surgelés en dernier) et toujours cochable. Aucun geste de la Liste ne demande de confirmation ni n'affiche de message éphémère : décocher annule une coche, ajouter de nouveau annule un retrait. | L'ordre affiché correspond à l'ordre configuré ; aucun écran ne demande de créer ou de terminer une liste. |
| EF-4.8 | Chaque suggestion affiche sa justification en une ligne : stock estimé, date d'épuisement prévue et source du rythme (déclaré, appris, catalogue). | La justification est visible sans ouvrir la fiche produit. |
| EF-4.9 | L'ajout d'un produit à la liste se fait par un champ de saisie unique. À la frappe, une liste de résultats mêle les produits de l'utilisateur (en premier, dont les récemment achetés) et les entrées du catalogue ; un tap sur un résultat l'ajoute. Valider la saisie sans choisir ajoute le texte tel quel : s'il correspond exactement à un produit ou une entrée du catalogue, celui-ci est utilisé, sinon un produit est créé à la volée (EF-1.3). Un second tap sur une ligne déjà présente incrémente sa quantité. | Ajouter trois produits connus prend moins de dix secondes ; un nom inconnu ne provoque qu'une question (la catégorie), différable. |
| EF-4.10 | Un tap sur une ligne la coche ou la décoche. Cocher enregistre l'achat (EF-2.1) ; la ligne reste affichée, barrée, en fin de son groupe. Décocher retire l'achat. | Une ligne cochée par erreur se décoche en un tap, sans laisser d'achat. |
| EF-4.11 | Les coches espacées de moins de 3 h forment une session de courses, quel que soit le membre qui coche ; la session se termine 3 h après sa dernière coche. Rien n'est à valider en fin de courses. | Deux coches à 2 h 59 d'intervalle appartiennent à la même session ; deux coches à 3 h d'intervalle, à deux sessions. |
| EF-4.12 | À la fin de la session de courses, les lignes cochées quittent la liste ; leurs achats restent dans l'historique. | En ouvrant l'application après ses courses, l'utilisateur trouve une liste sans ligne cochée ; tant que la session dure, une ligne cochée reste décochable. |
| EF-4.13 | Les suggestions sont regroupées sur une ligne « N suggestions » placée en fin de liste, de même gabarit que les autres lignes et repliée par défaut ; un tap la déplie en place et montre chaque suggestion avec sa quantité et sa justification (EF-4.8). | Une suggestion n'entre dans la liste que si elle est acceptée ; repliées, les suggestions n'occupent qu'une ligne. |
| EF-4.14 | La Liste fonctionne sans connexion réseau ; les modifications sont synchronisées au retour de la connexion. | Cocher, décocher, modifier une quantité et retirer sont possibles hors ligne sans perte de données. |

### 6.5 Recettes

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-5.1 | L'utilisateur peut créer, modifier et supprimer une recette : nom, nombre de portions de référence, ingrédients (produit du référentiel, quantité dans l'unité d'achat ou en fraction de celle-ci). | Un ingrédient référence obligatoirement un produit existant ou créé à la volée. |
| EF-5.2 | Chaque ingrédient est qualifié « de base » ou « spécifique ». | Le qualificatif est modifiable à tout moment. |
| EF-5.3 | À l'ajout d'une recette à la liste, depuis l'onglet Recettes, l'utilisateur indique le nombre de portions (taille du foyer par défaut) ; les quantités sont mises à l'échelle. | Les quantités sont proportionnelles au ratio portions demandées / portions de référence. |
| EF-5.4 | Un ingrédient « spécifique » est toujours ajouté ; un ingrédient « de base » n'est ajouté que si le stock estimé est inférieur à la quantité requise, à hauteur du manque. | Une recette dont tous les ingrédients de base sont en stock n'ajoute que ses ingrédients spécifiques. |
| EF-5.5 | Un ingrédient déjà présent sur la liste, sur une ligne non cochée, voit sa quantité cumulée, sans doublon de ligne. | Deux recettes partageant un ingrédient produisent une seule ligne. |

### 6.6 Compte

Les exigences de l'onglet Compte gardent les identifiants EF-7.x ; les identifiants EF-6.x, ceux du mode magasin de la v1, ne sont pas réattribués.

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-7.1 | Au premier lancement, l'application demande la création du compte (e-mail et mot de passe, ou Google) puis la taille du foyer, et ouvre la Liste. Ouverte depuis une invitation, elle rattache le compte au foyer invitant sans demander la taille du foyer. | Aucune autre étape d'initialisation n'est imposée. |
| EF-7.2 | L'onglet Compte permet de modifier la taille du foyer, la période de la liste (automatique, ou fixée de 1 à 31 jours, EF-4.1) ainsi que l'ordre et les noms des rayons (EF-1.5, EF-1.7). | Les modifications s'appliquent selon 5.4 et EF-4.1, pour tous les membres du foyer. |
| EF-7.3 | L'utilisateur peut exporter l'ensemble des données du foyer (produits, achats, recettes) dans un format ouvert et supprimer son compte. Supprimer son compte le retire du foyer ; le foyer et ses données ne sont supprimés qu'avec son dernier membre. | L'export est complet et lisible sans l'application. |
| EF-7.4 | L'onglet Compte liste les membres du foyer et permet d'en inviter un par un lien à partager, valable 7 jours et utilisable une fois. Un compte n'appartient qu'à un foyer : rejoindre un foyer quitte le précédent, et l'application demande confirmation si celui-ci contient des produits. Un membre peut quitter le foyer ; le créateur du foyer peut retirer un membre. | Un invité qui ouvre le lien rejoint le foyer et voit la même liste ; un membre qui quitte le foyer retrouve un foyer vide. |
| EF-7.5 | L'onglet Compte affiche l'e-mail du compte et permet de le modifier, de changer le mot de passe et de se déconnecter. | La déconnexion efface les données du foyer de l'appareil ; elles reviennent à la connexion suivante. |
| EF-7.6 | Le foyer peut autoriser l'agrégation anonyme de ses noms de produits pour enrichir le catalogue (ENF-5) ; l'accord est désactivé par défaut et révocable. | Sans accord, aucun nom de produit du foyer n'entre dans l'agrégation. |

## 7. Règles de gestion

| Id | Règle |
| --- | --- |
| RG-1 | Un produit a une et une seule unité d'achat ; rythmes, quantités de liste et quantités d'ingrédients s'expriment dans cette unité ou en fraction décimale de celle-ci. Un même article vendu sous plusieurs conditionnements est représenté par un seul produit, l'utilisateur ajustant la quantité achetée. |
| RG-2 | Les quantités suggérées sont arrondies au pas supérieur de l'unité d'achat : pièce entière pour un conditionnement, 100 g pour un produit au poids, 0,5 L pour un produit au volume. |
| RG-3 | Un rythme appris requiert au moins trois achats du même produit ; en deçà, la source suivante (5.2) s'applique. |
| RG-4 | Les achats d'un produit marqué ponctuel n'alimentent aucun apprentissage. Les lignes d'origine « recette » sont également exclues de l'apprentissage. |
| RG-5 | Aucun ajustement explicite du rythme sur un signal isolé : un « fini » clôt l'intervalle de consommation en cours et entre dans la médiane (5.2) ; un refus « il m'en reste » devient un relevé d'une unité qui recale le stock (5.3). Un « fini » signalé peu après un achat (moins de la moitié de la durée de vie attendue d'une unité) est rattaché à la veille de cet achat, avec message annulable. |
| RG-6 | La liste du foyer est unique et permanente. Une ligne cochée reste modifiable (décochée, quantité) tant que dure la session de courses ; ensuite, son achat ne se corrige que depuis la fiche produit (EF-2.4). |
| RG-7 | La suppression d'un produit référencé par une recette ou un achat est interdite ; seul l'archivage (« Je n'en achète plus ») est possible. |
| RG-8 | Les valeurs issues du catalogue sont copiées à la création du produit et ne sont jamais synchronisées ensuite. |
| RG-9 | Les catégories « frais » et « surgelés » sont des catégories système, renommables mais non supprimables, toujours placées en fin de parcours. |
| RG-10 | La quantité suggérée d'un produit à rythme ne dépasse jamais rythme × durée de conservation, à l'arrondi près (RG-2) : on ne propose pas moins d'une unité d'achat. Sans durée de conservation renseignée, la période seule s'applique. |

## 8. Scénario d'usage sur le premier mois

L'application doit être utile dès la première liste et s'améliorer à chaque course sans effort supplémentaire.

| Moment | Action de l'utilisateur | État du système |
| --- | --- | --- |
| Jour 1 | Crée son compte, saisit la taille du foyer, écrit sa liste ; les produits inconnus sont créés à la volée ou depuis le catalogue | Référentiel initialisé, rythmes par défaut |
| Jour 1, en magasin | Coche ce qu'il achète ; les lignes cochées quittent la liste après les courses | Premiers achats datés, première session de courses |
| Semaine 1 | Signale « fini » sur quelques produits depuis l'onglet Produits ; invite un autre membre du foyer | Premiers recalages d'estimation ; liste partagée |
| Semaine 2 | Ouvre la Liste ; la ligne « N suggestions », en fin de liste, en annonce une dizaine, acceptées en un geste | Suggestions issues des rythmes par défaut et des événements, sur 7 jours |
| Semaine 3 | Enregistre trois recettes, en ajoute une à la liste | Ingrédients de base soustraits du stock estimé |
| Mois 1 | Déclare un rythme sur les produits mal estimés | Rythmes appris disponibles sur les produits achetés trois fois ; période de la liste apprise des sessions de courses ; suggestions fiables sur l'essentiel |

## 9. Exigences non fonctionnelles

| Id | Exigence |
| --- | --- |
| ENF-1 | Cible mobile en priorité ; utilisable d'une main, éléments cliquables d'au moins 44 px sur la Liste. |
| ENF-2 | La Liste et toutes les actions courantes disponibles hors ligne ; synchronisation transparente au retour du réseau. Plusieurs appareils et plusieurs membres peuvent modifier le foyer ; en cas de modification concurrente, la dernière écriture l'emporte, les événements et achats étant additifs et jamais perdus. |
| ENF-3 | Toute action courante (cocher, signaler « fini », accepter une suggestion) s'exécute en un geste et répond en moins de 200 ms. |
| ENF-4 | Calcul des suggestions pour un référentiel de 300 produits et 50 recettes en moins d'une seconde. |
| ENF-5 | Données personnelles limitées au strict nécessaire (aucune donnée de localisation, aucun prix, aucune analyse d'usage tierce) ; export et suppression conformes au RGPD. Seul usage secondaire, soumis à l'accord du foyer (EF-7.6, désactivé par défaut) : les noms de produits créés par les utilisateurs sont agrégés, sans rattachement à un compte et seulement s'ils apparaissent dans au moins cinq foyers, pour enrichir le catalogue ; déclaré dans la politique de confidentialité. |
| ENF-6 | Interface en français ; libellés d'unités et formats de date localisés. |
| ENF-7 | Le catalogue par défaut est versionné et livré avec l'application ; sa mise à jour ne modifie jamais les produits de l'utilisateur (RG-8). |
| ENF-8 | Divulgation progressive (2.3) : les onglets Liste et Produits n'exposent aucune notion de rythme, famille ou stock ; ces paramètres ne sont visibles que sur la fiche produit, dans une section repliée par défaut. Aucun formulaire n'impose d'autre champ que le nom et, pour un produit, la catégorie. |

## 10. Risques et points de vigilance

| Risque | Impact | Parade |
| --- | --- | --- |
| Estimation imprécise les premières semaines | Suggestions ignorées, perte de confiance | Estimation présentée comme telle, correction en un geste, rythme déclaré disponible dès le MVP |
| Faible taux de déclaration des événements | Rythmes mal recalés | Geste accessible en tête de l'onglet Produits ; l'apprentissage par écart d'achats fonctionne pour les deux familles sans déclaration |
| Liste gonflée par les recettes | Liste inutilisable | Ingrédients « de base » soustraits du stock estimé, fusion des doublons |
| Hétérogénéité des unités | Calculs erronés | Une seule unité d'achat par produit (RG-1) |
| Achats irréguliers (réceptions, invités) | Pollution des rythmes appris | Produits ponctuels sans rythme (RG-4), seuil de trois achats (RG-3) |
| Sur-ingénierie du moteur d'estimation | Projet non livré | Règles arithmétiques simples (5.3), aucun apprentissage statistique |
| Coche oubliée ou faite après les courses | Achat daté trop tard, session déplacée | La ligne reste cochable ; « fini » et relevé recalent l'estimation ; la période apprise repose sur une médiane |

## 11. Évolutions envisagées

Par ordre de valeur estimée ; aucune n'est engagée.

1. Planification des repas par créneau (jour et moment), la période de la liste découlant du planning.
2. Catalogue de recettes et suggestions selon le stock estimé.
3. Suivi des prix et budget.
4. Mise en pause de la consommation lors d'une absence prolongée. Au MVP, le système poursuit la décrémentation et l'utilisateur refuse les suggestions au retour, ce qui recale l'estimation par un relevé (5.3).
5. Alerte de péremption : notification lorsqu'un produit frais en stock estimé atteint sa durée de conservation sans événement « fini », pour inciter à le consommer. Requiert la durée de conservation (5.5) et les notifications push, tous deux hors MVP pour cette fonction.
6. Répartition des courses entre membres du foyer : attribuer des rayons (ou des lignes) à chaque membre présent en magasin, chacun voyant sa part en tête et la progression des autres en temps réel. Techniquement simple, le foyer étant déjà partagé et chaque ligne synchronisée entre membres en une seconde.
