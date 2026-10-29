# Commedab — Spécifications fonctionnelles v1

## 1. Objet du document

Le présent document définit les spécifications fonctionnelles de la version minimale (MVP) d'une application de gestion de liste de courses fondée sur l'estimation du stock domestique. Il décrit le périmètre, les concepts, les règles de gestion et les exigences fonctionnelles et non fonctionnelles. Les choix techniques (architecture, stack, modèle physique de données) font l'objet d'un document distinct.

| Version | Date | Statut |
| --- | --- | --- |
| 1.0 | 15/10/2026 | Validée pour cadrage technique |
| 1.1 | 20/10/2026 | Alignée avec les spécifications techniques (compte, rythme appris, règle RG-5, produits créés à la volée, catégorie différable) |

## 2. Contexte et objectifs

### 2.1 Problème adressé

Les applications de liste de courses existantes partent d'une liste vide que l'utilisateur remplit de mémoire. Les applications de gestion de stock domestique exigent un inventaire initial et une mise à jour continue des quantités, effort que les utilisateurs abandonnent rapidement.

### 2.2 Proposition

L'application déduit ce qui va manquer à partir de l'historique des achats et d'un rythme de consommation par produit, déclaré ou appris. Le stock domestique n'est jamais saisi : il est estimé. L'utilisateur ne fait que cocher ce qu'il achète ; ajouter un produit à la liste suffit à dire qu'il en manque.

### 2.3 Principe de conception : simple par défaut, paramétrable à la demande

L'application doit pouvoir être utilisée comme une liste de courses ordinaire, sans que l'utilisateur ait jamais à manipuler les notions de rythme, de pack, de contenance ou de stock estimé. Ces mécanismes fonctionnent en arrière-plan à partir des achats, et leurs effets apparaissent progressivement sous forme de suggestions. Tout paramètre reste accessible et modifiable sur la fiche du produit, mais aucun n'est exigé : un champ facultatif non renseigné se comporte toujours de manière raisonnable. Cette exigence prime sur la précision des estimations.

### 2.4 Objectifs du MVP

- Après un mois d'utilisation, les suggestions et la liste demandent moins de deux minutes de correction avant un passage en magasin.
- Aucun produit de consommation régulière n'est oublié sur deux cycles de courses consécutifs.
- L'ajout d'une recette ne met sur la liste que les ingrédients qui manquent d'après le stock estimé.

Ces objectifs s'apprécient à l'usage, sur plusieurs semaines de courses réelles ; l'application ne calcule aucun indicateur.

## 3. Périmètre

### 3.1 Décisions de cadrage

| Sujet | Décision | Justification |
| --- | --- | --- |
| Utilisateurs | Une personne, un compte ; aucune donnée partagée entre comptes | Le partage ajoute membres, invitations et réglages sans servir la validation de l'usage ; il reste une évolution (11) |
| Compte | Obligatoire, créé à la première ouverture (e-mail et mot de passe, ou Google) | Les données survivent à un changement d'appareil ; plusieurs appareils pour un même compte dès le MVP |
| Référentiel produit | Produits génériques (« lait », « yaourts nature »), sans marque ni code-barres | Saisie rapide, liste lisible |
| Inventaire initial | Aucun | Effort rédhibitoire ; le stock se construit à partir des achats |
| Niveau de stock | Uniquement déduit des achats ; jamais saisi, ni par une jauge, ni par un relevé, ni par un signal « fini » | Toute saisie de stock s'abandonne ; un ajout à la liste dit déjà qu'il en manque |
| Prix et budget | Hors périmètre | Sans valeur sur le problème ciblé |
| Recettes | Nom, ingrédients avec quantité facultative, notes ; ni portions, ni étapes, ni catalogue de recettes | Elles ne servent qu'à alimenter la liste |
| Liste | Un seul écran, la Liste, pour préparer et faire les courses ; toujours groupée par rayon et toujours cochable | Un mode à basculer s'oublie ; plusieurs vues n'apportent rien en rayon |
| Navigation | Quatre onglets : Liste (écran d'accueil), Produits, Recettes, Réglages ; une fiche par produit et par recette ; un panneau Ajouter ouvert depuis la Liste | Chaque onglet répond à un moment : faire ses courses, retrouver un produit, cuisiner, régler |
| Suggestions | Proposées dans le panneau Ajouter, jamais refusées : une suggestion ignorée revient la fois suivante | Refuser est un geste de plus qui n'apprend rien que les achats ne disent déjà |
| Fin des courses | Aucune action : les achats espacés de moins de 3 h forment une session, qui se termine d'elle-même | Un bouton « Terminer » s'oublie, et l'oubli fausse les dates d'achat |
| Période de la liste | Jamais demandée ni affichée : déduite du rythme des courses | Une question de plus à chaque liste, dont la réponse se lit dans l'historique |

### 3.2 Hors périmètre du MVP

Les fonctionnalités suivantes sont explicitement exclues : partage de la liste entre plusieurs comptes, planification des repas par créneau, lecture de codes-barres, catalogue de recettes et suggestions, profils par enseigne, suivi des prix, durée de conservation et alertes de péremption, notifications push, import de tickets de caisse, saisie en langage naturel.

## 4. Acteurs

| Acteur | Description |
| --- | --- |
| Utilisateur | Personne disposant d'un compte. Ses produits, achats, recettes et sa liste forment un ensemble qui n'appartient qu'à lui ; il y accède depuis un ou plusieurs appareils. |
| Système | L'application elle-même, qui estime les stocks, apprend les rythmes et construit les suggestions. |

## 5. Glossaire et concepts

| Terme | Définition |
| --- | --- |
| Produit | Article générique acheté régulièrement, défini par un nom, un rayon, une unité et une taille de pack ; attributs facultatifs en 5.4. |
| Rayon | Regroupement de produits correspondant à un rayon de magasin, ordonné pour le parcours en magasin. |
| Unité | Ce que l'on compte pour le produit : pièce, bouteille, rouleau, kg, L. Le rythme et le stock s'expriment dans cette unité. |
| Pack | Conditionnement dans lequel le produit s'achète, en nombre d'unités (pack de 6 bouteilles) ; 1 par défaut. La liste compte en packs (5.3). |
| Rythme de consommation | Nombre d'unités consommées par durée (5.1). |
| Achat | Seul fait enregistré sur un produit : une date et une quantité en unités, créé en cochant une ligne de la liste. |
| Stock estimé | Quantité probable restante, calculée et jamais saisie (5.2). |
| Catalogue | Base de produits courants livrée avec l'application, avec des valeurs par défaut. |
| Liste de courses | Liste unique et permanente de l'utilisateur, écran d'accueil de l'application : des lignes (produit, quantité en packs, cochée ou non, origine : suggestion, ajout manuel ou recette). Elle n'est jamais créée ni clôturée. |
| Suggestion | Produit que le système propose d'ajouter à la liste, avec une quantité et sa justification, dans le panneau Ajouter (EF-2.3). |
| Session de courses | Suite d'achats espacés de moins de 3 h. Elle se termine d'elle-même 3 h après le dernier achat ; elle est déduite des achats et jamais saisie (EF-1.7). |
| Ouverture de l'application | Démarrage de l'application, ou retour de l'application au premier plan. |
| Période de la liste | Nombre de jours que les suggestions doivent couvrir : 7 au départ, puis l'intervalle habituel entre deux sessions de courses (EF-2.4). |
| Recette | Nom, ingrédients (produit du référentiel, quantité et unité facultatives) et notes libres. |

### 5.1 Sources du rythme de consommation

Le système retient la première source disponible dans l'ordre suivant :

1. Rythme déclaré par l'utilisateur sur la fiche produit (« Tu en prends 5 / semaine »).
2. Rythme appris : pour chaque achat, le taux observé est la quantité achetée divisée par le nombre de jours jusqu'à l'achat suivant ; le rythme est la médiane des cinq derniers taux. Un rythme appris n'est utilisé qu'à partir de trois achats (RG-3), et reste borné entre la moitié et le double de la valeur du catalogue tant qu'il repose sur moins de cinq intervalles.
3. Rythme indicatif du catalogue, donné pour une personne.
4. Aucun : le produit n'est jamais suggéré, jusqu'à ce qu'un rythme soit appris ou déclaré.

### 5.2 Stock estimé

Le stock estimé repart de la dernière ancre :

- un ajout manuel du produit à la liste (EF-2.10), qui vaut zéro : on ajoute à la main ce qui manque ;
- à défaut, le premier achat connu, qui part de zéro.

Stock estimé = valeur de l'ancre + achats postérieurs − rythme × temps écoulé depuis l'ancre, borné à zéro. Une ligne retirée sans achat annule son ancre. L'estimation est toujours présentée en langage courant, comme une approximation (« il t'en reste environ 2 »).

### 5.3 Unités et packs

Le rythme, le stock et les achats se comptent en unités ; les lignes de la liste et les suggestions, en packs. Une suggestion est le besoin arrondi au pack entier supérieur (RG-2). Cocher une ligne de N packs enregistre un achat de N × taille du pack unités.

### 5.4 Attributs facultatifs du produit

| Attribut | Rôle |
| --- | --- |
| Rythme déclaré | Prime sur toute autre source (5.1). |
| Contenance | Quantité contenue dans une unité (bouteille de 1 L, paquet de 500 g). Permet de convertir un ingrédient de recette exprimé en grammes ou en litres en unités du produit (EF-4.4). |
| Taille du pack | Nombre d'unités par pack (5.3), 1 par défaut. |

## 6. Exigences fonctionnelles

Chaque exigence est identifiée EF-x.y. Les critères d'acceptation en précisent la vérification.

### 6.1 Liste

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-1.1 | La Liste est l'écran d'accueil de l'application : une liste unique et permanente, sans création ni clôture. Elle porte l'en-tête « Ma liste », un compteur « N sur M » (lignes cochées sur lignes affichées) et une barre de progression. | Aucun écran ne demande de créer ou de terminer une liste ; le compteur et la barre suivent chaque coche. |
| EF-1.2 | Les lignes sont toujours groupées par rayon, dans l'ordre défini en Réglages (EF-5.1) : les produits sans rayon en tête sous « À classer », les rayons frais et surgelés en dernier (RG-9). Dans chaque groupe, les lignes cochées sont barrées et placées en fin de groupe. | L'ordre affiché correspond à l'ordre configuré. |
| EF-1.3 | Un tap sur une ligne la coche : un achat est enregistré, daté de l'instant de la coche, pour la quantité de la ligne (5.3). Un tap sur une ligne cochée la décoche : l'achat est supprimé, sans laisser de trace. | Chaque ligne cochée produit exactement un achat ; une ligne cochée par erreur se décoche en un tap et ne laisse aucun achat. |
| EF-1.4 | Un appui long sur une ligne la met en surbrillance et ouvre une mini-feuille : quantité −/+, « Voir la fiche », « Retirer de la liste ». Sur une ligne cochée, la quantité modifie l'achat. | La quantité modifiée est celle de l'achat créé à la coche. |
| EF-1.5 | Un glissement vers la gauche découvre un seul bouton, « Retirer », le nom de la ligne restant visible. Retirer une ligne n'enregistre aucun achat ; retirer une ligne cochée supprime son achat. | Un produit retiré peut être proposé de nouveau aussitôt (EF-2.3). |
| EF-1.6 | Aucun geste de la Liste ne demande de confirmation ni n'affiche de message éphémère : décocher annule une coche, ajouter de nouveau annule un retrait. | Aucun message ne s'affiche après un geste sur la Liste. |
| EF-1.7 | Les achats espacés de moins de 3 h forment une session de courses ; la session se termine 3 h après son dernier achat. Rien n'est à valider en fin de courses. | Deux coches à 2 h 59 d'intervalle appartiennent à la même session ; deux coches à 3 h d'intervalle, à deux sessions. |
| EF-1.8 | Une ligne cochée reste affichée, barrée, jusqu'à la première ouverture de l'application qui suit la fin de sa session ; elle quitte alors la liste, et son achat reste dans l'historique. Une ligne non cochée reste sur la liste d'une session à l'autre, jusqu'à ce qu'elle soit cochée ou retirée. | En magasin, verrouiller le téléphone et rouvrir l'application ne retire aucune ligne cochée ; en rouvrant l'application plus de 3 h après sa dernière coche, l'utilisateur trouve une liste sans ligne cochée ; une ligne non cochée y est toujours, avec sa quantité. |
| EF-1.9 | Sous la barre de progression, une pastille par recette ajoutée à la liste (EF-4.5) : nom de la recette, « ×N » si elle est comptée N fois, nombre de ses lignes cochées sur le total de ses lignes. Les lignes d'une recette sont les lignes affichées dont le produit est l'un de ses ingrédients. La pastille est pleine quand toutes ses lignes sont cochées ou qu'elle n'en a aucune. Un tap ouvre la fiche recette. Une pastille disparaît quand plus aucune de ses lignes n'est affichée, à la première ouverture de l'application qui suit la fin d'une session de courses terminée après son ajout. | Une recette dont rien ne manquait a une pastille pleine jusqu'après les courses suivantes. |
| EF-1.10 | Une ligne issue d'une recette porte le nom de la recette en sous-titre ; elle reste triée par rayon. | Les lignes d'une recette sont dispersées dans leurs rayons, chacune avec son sous-titre. |
| EF-1.11 | En bas de la Liste, un champ « Ajouter un produit ou une recette » porte un badge « N suggestions » et ouvre le panneau Ajouter (6.2). | Le badge compte les suggestions du moment ; il est absent sans suggestion. |
| EF-1.12 | La Liste fonctionne sans connexion réseau ; les modifications sont synchronisées au retour de la connexion. | Cocher, décocher, modifier une quantité, retirer et ajouter sont possibles hors ligne sans perte de données. |

### 6.2 Panneau Ajouter et suggestions

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-2.1 | Le panneau Ajouter s'ouvre par-dessus la Liste, dont le haut reste visible sous un voile, clavier ouvert, le champ de recherche collé au clavier avec un bouton « Fermer » à côté. | Le panneau s'ouvre prêt à la frappe. |
| EF-2.2 | Avant toute saisie, le panneau présente les suggestions, toujours en entier, chacune avec son nom, sa justification (EF-2.5) et un bouton « Ajouter N » ; puis « Tous tes produits », du plus acheté au moins acheté, à faire défiler. | Ajouter trois suggestions prend trois taps. |
| EF-2.3 | Le système suggère chaque produit non archivé, doté d'un rythme (5.1) et absent de la liste affichée, dont le besoin sur la période (rythme × période − stock estimé) est positif. La quantité proposée est ce besoin arrondi au pack entier supérieur (RG-2). | Un produit dont le stock estimé couvre la période n'est pas proposé ; un produit déjà sur la liste non plus. |
| EF-2.4 | La période que couvrent les suggestions n'est jamais demandée ni affichée : 7 jours au départ, puis, dès trois sessions de courses sur des jours distincts, la médiane des cinq derniers intervalles entre jours de courses, bornée entre 2 et 31 jours. | Aucun écran ne mentionne de période. |
| EF-2.5 | Chaque suggestion est justifiée en une ligne de langage courant : ce qu'il reste probablement, quand ce sera épuisé, et d'où vient l'estimation (« Il t'en reste environ 1, fini vers jeudi · tu en prends chaque semaine »). | La justification est visible sans ouvrir la fiche produit et n'emploie ni « rythme » ni « stock » (ENF-8). |
| EF-2.6 | Une suggestion ne se refuse pas : ignorée, elle n'enregistre rien et revient tant que le besoin existe. | Aucun bouton de refus n'existe. |
| EF-2.7 | Une seule recherche, à la frappe, sert à tout ajouter. Les résultats viennent dans cet ordre : recettes, produits de l'utilisateur (les plus achetés d'abord, archivés compris), entrées du catalogue, puis « Créer « … » ». Chaque résultat porte le composant d'ajout (EF-2.9) ; une recette s'ajoute selon EF-4.5. | Ajouter trois produits connus prend moins de dix secondes. |
| EF-2.8 | « Créer « … » » crée le produit en un tap et l'ajoute à la liste, dans le rayon « À classer », en unité pièce et en pack de 1 ; le produit s'affiche avec son stepper et le champ se vide pour enchaîner. Le rayon et l'unité sont proposés juste en dessous, facultatifs, et restent modifiables sur la fiche. Aucun rythme n'est demandé. Un nom identique à une entrée du catalogue crée le produit depuis cette entrée (EF-3.7). | Un nom inconnu s'ajoute en un tap, sans aucune question. |
| EF-2.9 | Un même composant d'ajout sert partout (panneau Ajouter, résultats de recherche, fiche produit, cartes et fiche recette) : un bouton « Ajouter », puis, une fois le produit sur la liste, un stepper « − N + » ; le « − » à 1 retire la ligne (EF-1.5). Sur la fiche produit, le bouton dit ce qu'il ajoute : « Ajouter 1 pack (6) », ou « + 1 bouteille » pour un pack de 1. Ajouter un produit déjà sur la liste incrémente sa ligne, sans doublon. | Un produit n'a jamais deux lignes non cochées. |
| EF-2.10 | Ajouter un produit à la liste autrement qu'en acceptant une suggestion ou par une recette signale qu'il en manque : le stock estimé repart de zéro à cet instant (5.2). Retirer la ligne sans l'avoir cochée annule ce signal. Ajouter un produit archivé le réactive (EF-3.5). | Après un ajout manuel, le produit est estimé épuisé ; après le retrait de cette ligne, l'estimation antérieure revient. |
| EF-2.11 | « Ajouter N » ajoute la suggestion avec sa quantité ; le stepper l'ajuste ensuite. | La ligne créée porte la quantité proposée. |

### 6.3 Produits et achats

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-3.1 | L'onglet Produits présente le référentiel groupé par rayon, avec une recherche à la frappe ; chaque produit affiche ce qu'il en reste probablement (« il t'en reste environ 2 ») et la date de son dernier achat ; les produits archivés sont regroupés en bas. Un tap ouvre la fiche. | La recherche répond à la frappe sans validation. |
| EF-3.2 | La fiche produit présente le nom, le rayon et l'unité ; l'estimation en langage courant (« Il t'en reste environ 2 bouteilles, de quoi tenir jusqu'à jeudi ») ; le composant d'ajout (EF-2.9) ; « Je n'en achète plus » ; une section Réglages, toujours visible ; l'historique des achats. | Rien n'est demandé à l'ouverture de la fiche ; tout se modifie en place. |
| EF-3.3 | La section Réglages de la fiche présente, en vrais champs éditables, le rythme (« Tu en prends 5 / semaine », appris ou déclaré), l'unité, la contenance et « Acheté par packs de ». Modifier le rythme le déclare ; l'effacer rend la main au rythme appris ou au catalogue. | Un rythme déclaré est utilisé en priorité sur toute autre source dès le calcul suivant des suggestions. |
| EF-3.4 | L'historique de la fiche présente les achats du produit (date, quantité), du plus récent au plus ancien. Chaque achat se corrige (date, quantité) ou se supprime ; une ligne encore affichée sur la Liste se corrige depuis la Liste (EF-1.3, EF-1.4). | Une correction recalcule le stock estimé et le rythme appris. |
| EF-3.5 | « Je n'en achète plus » archive le produit : il n'est plus suggéré et n'apparaît plus dans « Tous tes produits » ; il reste trouvable par la recherche et en bas de l'onglet Produits, avec son historique. L'ajouter à la liste le réactive. | Un produit archivé n'est jamais suggéré ; ses achats restent consultables. |
| EF-3.6 | Le nom, le rayon, l'unité, la contenance et la taille du pack se modifient sur la fiche ; seul le nom est obligatoire. | Un produit sans rayon reste dans « À classer ». |
| EF-3.7 | Un produit créé depuis une entrée du catalogue (EF-2.7, EF-2.8) en reprend le rayon, l'unité, la taille du pack, la contenance et le rythme indicatif ; le produit appartient ensuite à l'utilisateur. | Une mise à jour ultérieure du catalogue ne modifie pas le produit (RG-8). |

### 6.4 Recettes

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-4.1 | L'onglet Recettes présente une carte par recette : nom, « 5 ingrédients · il te manque 2 », composant d'ajout en haut à droite (EF-2.9, appliqué à la recette), pastilles d'ingrédients, les manquants d'abord puis ceux que l'utilisateur a, barrés ; et un bouton « + Nouvelle ». | Les ingrédients manquants se lisent sans ouvrir la recette. |
| EF-4.2 | L'utilisateur crée et modifie une recette : nom, ingrédients ajoutés par la même recherche que le panneau Ajouter (produits, catalogue, « Créer »), quantité et unité facultatives saisies en ligne (« 200 g », « 2 »), notes libres. Ni portions ni étapes de préparation. | Seul le nom est obligatoire ; un ingrédient référence toujours un produit, existant ou créé à la volée. |
| EF-4.3 | La fiche recette présente ses ingrédients, les manquants d'abord, chacun avec sa quantité, ce qu'il en reste probablement et son composant d'ajout ; un bouton unique « Ajouter à la liste », sous lequel une phrase dit ce qui partira (« Lardons et crème partiront sur la liste, le reste tu l'as déjà. ») ; les notes ; « Modifier » et « Supprimer ». | La phrase change avec le nombre de fois où la recette est comptée. |
| EF-4.4 | Un ingrédient manque si le stock estimé est inférieur à la quantité requise, convertie en unités du produit par la contenance quand l'unité diffère ; une quantité qu'aucune contenance ne permet de convertir requiert un pack. Un ingrédient sans quantité (sel, huile) manque si le stock estimé est nul. Le manque est la différence, arrondie au pack entier supérieur ; un pack pour un ingrédient sans quantité. | Un ingrédient en stock suffisant n'est pas ajouté ; un ingrédient sans quantité n'est ajouté que si le produit est estimé épuisé. |
| EF-4.5 | « Ajouter à la liste » ne met sur la liste que les ingrédients manquants (EF-4.4), sur des lignes d'origine recette ; un ingrédient déjà sur la liste, sur une ligne non cochée, voit sa quantité cumulée, sans doublon de ligne. La recette peut être comptée N fois, par un stepper sur sa carte et sur sa fiche : les quantités requises sont multipliées par N avant le calcul du manque, et changer N ajuste les lignes non cochées en conséquence ; le « − » à 1 retire la recette de la liste et ce qu'elle y avait mis sur des lignes non cochées. La recette apparaît en pastille sur la Liste (EF-1.9). | Deux recettes partageant un ingrédient manquant produisent une seule ligne ; une recette comptée deux fois double le manque. |
| EF-4.6 | Supprimer une recette la retire de l'onglet Recettes et sa pastille de la Liste ; les lignes qu'elle avait ajoutées restent sur la liste, sans sous-titre. | Aucune ligne ne disparaît avec la recette. |

### 6.5 Réglages et compte

| Id | Exigence | Critères d'acceptation |
| --- | --- | --- |
| EF-5.1 | La section Rayons des Réglages permet d'ordonner les rayons par glisser-déposer ; l'ordre détermine le parcours en magasin. Un jeu de rayons est livré avec l'application dans un ordre de parcours usuel ; on ne crée, ne renomme, ne fusionne ni ne supprime de rayon. | L'ordre est conservé et appliqué à la Liste et à l'onglet Produits. |
| EF-5.2 | La section Compte affiche l'e-mail du compte et permet de le modifier, de changer le mot de passe et de se déconnecter. | La déconnexion efface les données de l'appareil ; elles reviennent à la connexion suivante. |
| EF-5.3 | Au premier lancement, l'application demande la création du compte (e-mail et mot de passe, ou Google) et ouvre la Liste, vide, le champ d'ajout en bas. | Aucune autre étape d'initialisation n'est imposée. |
| EF-5.4 | La section Mes données porte un interrupteur « Aider à améliorer le catalogue » : les noms des produits créés par l'utilisateur entrent dans une agrégation anonyme (ENF-5). Il est activé par défaut et désactivable à tout moment. | Désactivé, aucun nom de produit du compte n'entre dans l'agrégation suivante. |
| EF-5.5 | « Exporter mes données » produit un fichier JSON contenant les produits, les achats, les recettes avec leurs ingrédients et leurs notes, la liste (lignes et recettes ajoutées) et l'ordre des rayons. | L'export est complet et lisible sans l'application. |
| EF-5.6 | « Supprimer mon compte » efface, après confirmation, le compte et toutes ses données (produits, achats, recettes, liste, rayons), sur le serveur et sur l'appareil ; seuls subsistent les agrégats anonymes déjà constitués (EF-5.4). | Après suppression, la connexion avec le même e-mail ouvre un compte vide. |
| EF-5.7 | Le pied des Réglages affiche « Commedab », le numéro de version et la licence (« Commedab 0.1 · AGPL-3.0 »). | La version affichée est celle de l'application installée. |

## 7. Règles de gestion

| Id | Règle |
| --- | --- |
| RG-1 | Un produit a une et une seule unité, et une taille de pack (1 par défaut) ; rythmes, stocks et achats s'expriment en unités, lignes de liste et suggestions en packs. Un même article vendu sous plusieurs conditionnements est représenté par un seul produit, l'utilisateur ajustant la quantité ou la taille du pack. |
| RG-2 | Les quantités suggérées sont arrondies au pack entier supérieur : une suggestion vaut au moins un pack, et dépasse le besoin de moins d'un pack. |
| RG-3 | Un rythme appris requiert au moins trois achats du même produit ; en deçà, la source suivante (5.1) s'applique. |
| RG-4 | Les achats issus de lignes d'origine recette n'alimentent aucun apprentissage : ils comptent dans le stock, pas dans le rythme. |
| RG-5 | Aucun ajustement explicite du rythme sur un signal isolé : le rythme ne change que par les achats (médiane, 5.1) ou par une déclaration. Un ajout manuel recale le stock (5.2) sans toucher au rythme. |
| RG-6 | La liste est unique et permanente. Une ligne cochée reste modifiable (décochée, quantité, retrait) tant qu'elle est affichée (EF-1.8) ; ensuite, son achat ne se corrige que depuis la fiche produit (EF-3.4). |
| RG-7 | La suppression d'un produit est impossible ; seul l'archivage (« Je n'en achète plus ») existe. |
| RG-8 | Les valeurs issues du catalogue sont copiées à la création du produit et ne sont jamais synchronisées ensuite. |
| RG-9 | Les rayons frais et surgelés sont des rayons système, toujours placés en fin de parcours : l'utilisateur ordonne les autres rayons entre eux, et ces deux-là entre eux. |

## 8. Scénario d'usage sur le premier mois

L'application doit être utile dès la première liste et s'améliorer à chaque course sans effort supplémentaire.

| Moment | Action de l'utilisateur | État du système |
| --- | --- | --- |
| Jour 1 | Crée son compte, écrit sa liste dans le panneau Ajouter ; les noms inconnus sont créés en un tap, ceux du catalogue en reprennent les valeurs | Référentiel initialisé, rythmes du catalogue ; chaque ajout manuel marque le produit comme épuisé |
| Jour 1, en magasin | Coche ce qu'il achète, verrouille et rouvre son téléphone entre deux rayons ; le soir, les lignes cochées ont quitté la liste | Premiers achats datés, première session de courses |
| Semaine 1 | Ajoute à la main ce qui vient à manquer ; range dans leur rayon quelques produits « À classer » | Stocks recalés par les ajouts manuels |
| Semaine 2 | Ouvre le panneau Ajouter ; le badge annonce une dizaine de suggestions, ajoutées en un tap chacune | Suggestions issues des rythmes du catalogue et des achats, sur 7 jours |
| Semaine 3 | Enregistre trois recettes, en ajoute une à la liste ; seuls deux ingrédients partent sur la liste | Ingrédients manquants calculés sur le stock estimé ; pastille de la recette sur la Liste |
| Mois 1 | Déclare un rythme sur les quelques produits mal estimés | Rythmes appris disponibles sur les produits achetés trois fois ; période de la liste apprise des sessions de courses ; suggestions fiables sur l'essentiel |

## 9. Exigences non fonctionnelles

| Id | Exigence |
| --- | --- |
| ENF-1 | Cible mobile en priorité ; utilisable d'une main, éléments cliquables d'au moins 44 px sur la Liste. |
| ENF-2 | La Liste et toutes les actions courantes disponibles hors ligne ; synchronisation transparente au retour du réseau. Plusieurs appareils peuvent modifier les données d'un même compte ; en cas de modification concurrente, la dernière écriture l'emporte. |
| ENF-3 | Toute action courante (cocher, ajouter une suggestion, ajouter un produit) s'exécute en un geste et répond en moins de 200 ms. |
| ENF-4 | Calcul des suggestions pour un référentiel de 300 produits et 50 recettes en moins d'une seconde. |
| ENF-5 | Données personnelles limitées au strict nécessaire (aucune donnée de localisation, aucun prix, aucune analyse d'usage tierce) ; export et suppression conformes au RGPD. Seul usage secondaire, actif par défaut et désactivable (EF-5.4) : les noms de produits créés par les utilisateurs sont agrégés, sans rattachement à un compte et seulement s'ils apparaissent dans au moins cinq comptes, pour enrichir le catalogue ; déclaré dans la politique de confidentialité. |
| ENF-6 | Interface en français ; libellés d'unités et formats de date localisés. |
| ENF-7 | Le catalogue par défaut est versionné et livré avec l'application ; sa mise à jour ne modifie jamais les produits de l'utilisateur (RG-8). |
| ENF-8 | Divulgation progressive (2.3) : la Liste, le panneau Ajouter et l'onglet Produits n'emploient jamais les mots « rythme » ni « stock » ; ces paramètres ne se règlent que dans la section Réglages de la fiche produit. Aucun formulaire n'impose d'autre champ que le nom. Un geste est une action, sans confirmation ; seule la suppression du compte en demande une. Sur la Liste, on annule par le geste inverse ; ailleurs, supprimer un achat de l'historique ou une recette affiche un message éphémère qui permet d'annuler. |

## 10. Risques et points de vigilance

| Risque | Impact | Parade |
| --- | --- | --- |
| Estimation imprécise les premières semaines | Suggestions fausses, perte de confiance | Estimation présentée comme telle, rythmes du catalogue au départ, rythme déclaré disponible sur la fiche, ajout manuel qui recale le stock |
| Produit qui manque sans être ajouté à la main | Stock surestimé, suggestion tardive | L'achat suivant clôt l'intervalle et corrige le rythme appris ; la médiane absorbe un retard isolé |
| Suggestions ignorées qui reviennent | Panneau encombré | Une suggestion n'apparaît que si le besoin existe ; « Je n'en achète plus » l'éteint définitivement |
| Liste gonflée par les recettes | Liste inutilisable | Seuls les ingrédients manquants partent sur la liste, fusion des doublons |
| Hétérogénéité des unités | Calculs erronés | Une seule unité par produit, une taille de pack (RG-1) ; conversion des recettes par la contenance |
| Achats irréguliers (réceptions, invités) | Pollution des rythmes appris | Médiane des cinq derniers taux, seuil de trois achats (RG-3), achats de recette exclus (RG-4) |
| Sur-ingénierie du moteur d'estimation | Projet non livré | Règles arithmétiques simples (5.2), aucun apprentissage statistique |
| Coche oubliée ou faite après les courses | Achat daté trop tard, session déplacée | La ligne reste cochable, la date de l'achat se corrige dans l'historique ; la période apprise repose sur une médiane |
| Agrégation des noms de produits activée par défaut | Un nom peut révéler une donnée sensible (santé) au sens du RGPD | Aucun rattachement à un compte, seuil de cinq comptes, interrupteur visible dans Réglages, déclaration dans la politique de confidentialité |

## 11. Évolutions envisagées

Par ordre de valeur estimée ; aucune n'est engagée.

1. Planification des repas par créneau (jour et moment), la période de la liste découlant du planning.
2. Catalogue de recettes et suggestions selon le stock estimé.
3. Suivi des prix et budget.
4. Mise en pause de la consommation lors d'une absence prolongée. Au MVP, le système poursuit la décrémentation : au retour, les suggestions peuvent proposer des produits encore présents, qu'il suffit de ne pas ajouter.
5. Durée de conservation : borner la quantité suggérée d'un produit frais (deux jours de pain, même pour une liste de trois semaines), puis alerter lorsqu'un produit frais atteint sa durée de conservation. L'alerte requiert les notifications push.
6. Partage de la liste entre plusieurs comptes d'un même foyer, avec invitation ; puis répartition des courses entre les personnes présentes en magasin, chacune voyant sa part en tête et la progression des autres en temps réel.
7. Saisie en langage naturel dans le champ d'ajout : « 3kg de pomme de terre » donnerait le produit « Pomme de terre », la quantité 3 et l'unité kg. Idée à cadrer.
8. Connexion par d'autres fournisseurs d'identité que Google.

## Correspondance des identifiants

Les identifiants ont été renumérotés lors de l'alignement sur les maquettes basse fidélité ; cette table relie les anciens identifiants, cités dans l'historique du dépôt, aux nouveaux.

| Ancien | Nouveau |
| --- | --- |
| EF-1.1, EF-1.3 | EF-2.8, EF-3.6 |
| EF-1.2 | EF-3.7 |
| EF-1.4 | EF-3.5 |
| EF-1.5, EF-1.7 | EF-5.1 |
| EF-1.6 | EF-3.3 |
| EF-1.8 | EF-3.1 |
| EF-2.1 | EF-1.3 |
| EF-2.2 | EF-1.8 |
| EF-2.3, EF-2.4 | EF-3.4 |
| EF-3.1 à EF-3.5 | supprimées |
| EF-4.1 | EF-2.4 |
| EF-4.2 | EF-2.3 |
| EF-4.3 | supprimée |
| EF-4.4 | EF-2.6, EF-2.11 |
| EF-4.5 | EF-1.4, EF-1.5 |
| EF-4.6 | EF-4.5 |
| EF-4.7 | EF-1.1, EF-1.2, EF-1.6 |
| EF-4.8 | EF-2.5 |
| EF-4.9 | EF-2.7, EF-2.9 |
| EF-4.10 | EF-1.3 |
| EF-4.11 | EF-1.7 |
| EF-4.12 | EF-1.8 |
| EF-4.13 | EF-1.11, EF-2.2 |
| EF-4.14 | EF-1.12 |
| EF-5.1 | EF-4.2 |
| EF-5.2, EF-5.3 | supprimées |
| EF-5.4 | EF-4.4 |
| EF-5.5 | EF-4.5 |
| EF-7.1 | EF-5.3 |
| EF-7.2 | EF-5.1 |
| EF-7.3 | EF-5.5, EF-5.6 |
| EF-7.4 | supprimée |
| EF-7.5 | EF-5.2 |
| EF-7.6 | EF-5.4 |
| RG-10 | supprimée |
| 5.1 (familles) | supprimée |
| 5.2, 5.3 | 5.1, 5.2 |
| 5.4 (taille du foyer) | supprimée |
| 5.5 | 5.4 |
