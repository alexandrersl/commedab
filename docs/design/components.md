# Composants Commedab

Un composant par section ; les noms sont ceux à utiliser dans `apps/mobile/src/components`. Les classes CSS citées (`btn-primary`, `is-pending`…) sont des noms d'états et de variantes, pas du CSS à copier.

## AddControl

Le composant d'ajout commun, présent partout où un produit ou une recette peut rejoindre la liste : panneau Ajouter, résultats de recherche, fiche produit, cartes et fiche recette.

Deux états qui se remplacent sur place :

1. **Pas sur la liste** → bouton contour « Ajouter » (ou « Ajouter N » quand le moteur propose une quantité). Sur la fiche produit, deux boutons quand le produit s'achète par packs : « Ajouter 1 pack (6) » et « + 1 bouteille ».
2. **Sur la liste** → stepper `− N +`. `+` ajoute une unité (ou un pack). `−` à 1 **retire la ligne** sans rien enregistrer : le `−` passe en `alert` pour le dire. Pour une recette, N est le nombre de fois qu'elle est comptée.

États : en attente (`is-pending`, opacité 0,6 pendant l'écriture locale, jamais plus de `duration-base` visible en pratique), désactivé si le produit est archivé. Variante **champ** (`is-field`, rectangle `surface` bordé `line-strong`, texte `ink`) pour régler une valeur hors liste (packs, quantité) : le fond `action-soft` reste réservé à « sur la liste ». Le passage bouton → stepper se fait en `duration-fast`, sans toast : le changement sous le doigt suffit.

Le consommateur fournit : `quantity` (null = pas sur la liste), `suggested`, `packSize` et `unitLabel` pour la fiche, `onChange`.

## Button

Les quatre boutons de l'app, et rien d'autre : plein, contour, texte, alerte.

- **Plein** (`btn-primary`) : une seule action principale par écran. « Ajouter à la liste », la barre « Ajouter un produit ou une recette ». Hauteur `control-lg`, rayon `radius-card`, fond `action`, texte `on-action`.
- **Contour** (`btn-outline`) : l'action secondaire répétable, surtout « Ajouter » avant qu'un stepper le remplace. Hauteur `control-sm`, capsule, bordure `border-strong` en `action`.
- **Texte** (`btn-text`) : navigation et actions d'en-tête (« Modifier », « Annuler », « Fermer »). En `alert` pour « Supprimer » et « Je n'en achète plus ».
- **Alerte** (`btn-alert`) : confirmation d'une action irréversible dans une feuille (« Supprimer mon compte »). Jamais en pleine page.

États : repos, pressé (échelle 0,97 + fond assombri, `duration-fast`), désactivé (opacité 0,45, aucune interaction), chargement (spinner à la place de l'icône, libellé conservé, bouton verrouillé). Le libellé dit ce qui va se passer, à l'infinitif ou à l'impératif court. Pas de libellé « OK ».

Le consommateur fournit : le libellé, `onPress`, et au besoin `loading`, `disabled`, un badge numérique (barre du bas).

## ConfirmSheet

La feuille de confirmation d'une action irréversible : supprimer une recette, supprimer le compte. C'est la seule confirmation de l'app ; retirer une ligne, décocher, archiver un produit n'en demandent pas, parce qu'ils se défont.

Anatomie : poignée, question en `sentence` (« Supprimer Carbonara ? »), une phrase en `body-sm` `ink-muted` qui dit ce qui se passe vraiment (ce qui reste, ce qui part), bouton `btn-alert` pleine largeur dont le libellé répète l'action (« Supprimer la recette »), puis « Annuler » en bouton texte. Jamais « Êtes-vous sûr ? », jamais « Oui / Non ».

Monte sur un `scrim` en `duration-base` ; tap hors de la feuille = Annuler.

## Estimate

La phrase d'estimation, en tête de fiche produit et sur chaque ingrédient d'une recette (version courte). C'est la voix du moteur : une phrase en langage courant, en `sentence` (Fraunces 18px, droit), avec le chiffre clé en `action` graisse 700.

Formes selon ce que le moteur sait :
- rythme connu : « Il t'en reste environ **2 bouteilles**, de quoi tenir jusqu'à mardi. »
- probablement fini : « **Probablement fini** : le dernier pack date de 3 semaines. »
- rien à dire : « Je ne sais pas encore : dis-moi quand tu en reprends, j'apprendrai. »
- archivé : « Tu n'en achètes plus. » + bouton texte « Reprendre ».

Jamais de pourcentage, jamais de « stock », jamais de date brute : un jour de la semaine ou « il y a N jours ».

## Icons

Le jeu d'icônes de l'app : Phosphor, importé tel quel depuis `@phosphor-icons/core` (ici) et `phosphor-react-native` (dans l'app). Deux graisses : *regular* partout, *fill* pour l'onglet actif, *bold* pour la coche seulement.

Trois familles d'usage, et rien d'autre : les onglets, les utilitaires, et le jeu fermé des rayons (17, un par rayon du catalogue). Une icône de rayon s'affiche à 22 px dans l'annuaire Produits et à 14 px devant un en-tête de section de la liste, toujours en `currentColor` de son texte.

Ajouter une icône = ajouter un rayon ou un geste ; on ne met jamais d'icône sur une ligne de produit, un titre ou une carte recette. Les noms des rayons doivent rester alignés sur la liste des rayons des spécifications.

## LineSheet

La mini-feuille qui s'ouvre à l'appui long sur une ligne. Trois choses, toujours dans cet ordre : la quantité (stepper), « Voir la fiche », « Retirer de la liste » en `alert`.

Elle monte en `duration-base` sur un `scrim` ; la ligne concernée reste en surbrillance derrière. Un tap hors de la feuille ou un glissement vers le bas la ferme. Aucun titre : le nom du produit est en première ligne.

Retirer ne crée aucun événement de stock. Le consommateur fournit la ligne et les trois callbacks.

## ListRow

Une ligne de la liste de courses, et la même ligne pour les résultats de recherche et les ingrédients.

Anatomie : case ronde `checkbox` (bordure `line-strong`), nom en `body-strong`, sous-titre en `caption` (recette d'origine, estimation), quantité en `label` à droite ou contrôle d'ajout.

Gestes et états :
- **Tap** = coché (fond de case `action`, nom barré en `ink-muted`). Re-tap = décoché. Aucune confirmation.
- **Appui long** = `is-highlight` : fond `surface-2` + filet `action` à gauche, et la feuille LineSheet s'ouvre.
- **Glisser à gauche** = un seul bouton « Retirer » de 96px sur fond `alert`, la ligne reste lisible.
- **En attente** (`is-pending`) : ligne qui vient d'être créée ou synchronisée, opacité 0,55, interactions permises.
- **Chargement** : squelette de 3 lignes (voir States).

Les lignes cochées glissent en fin de groupe en `duration-slow` ; elles disparaissent à la prochaine ouverture de l'app. Les en-têtes de rayon sont en `section` (majuscules 11px) précédés de l'icône du rayon (Phosphor 14px, jeu fermé : voir Icons). « À classer » vient toujours en premier.

## Pill

Les pastilles : des capsules de 28px qui disent l'état d'un ingrédient ou d'un choix.

- `pill-missing` : ingrédient manquant d'une recette, fond `alert-soft`, texte `alert`. Toujours listées **en premier**.
- `pill-owned` : ingrédient qu'on a probablement, fond `surface-2`, texte `ink-muted` barré.
- `pill-choice` (34px) : option à choisir (rayon, unité) ; `is-selected` passe en `action-soft` bordé `action`.

Le badge (`badge`, 20px) porte un chiffre ou un mot court : le nombre de suggestions sur la barre du bas, « NEW » en `alert-soft` sur un produit créé à l'instant. Jamais de badge sur un onglet.

Une pastille n'est pas un bouton sauf `pill-choice` ; les manquantes mènent à l'ajout par le composant AddControl de la fiche, pas par la pastille.

## ProgressBar

La barre « 2 sur 12 » en tête de liste : 6px, rail `surface-2`, remplissage `action`, capsule.

Le compteur (`label`, `ink-muted`) est posé à droite du titre, la barre juste en dessous sur toute la largeur de la gouttière. Elle se remplit en `duration-base` à chaque coche. À 100 % elle reste pleine : pas de message, pas de confettis. `is-indeterminate` pendant la première synchronisation d'une liste (jamais plus de quelques secondes ; au-delà, afficher le bandeau hors-ligne).

## RecipeCard

Une recette sur l'écran Recettes : nom en Fraunces 20px, sous-titre « N ingrédients · il te manque M », composant d'ajout en haut à droite, puis les pastilles — manquantes d'abord, possédées barrées ensuite.

États : il manque des choses (sous-titre `ink-muted`), tout est là (sous-titre `action` « Tu as tout ce qu'il faut », pas de pastilles), sur la liste (stepper + « · sur la liste »), chargement (squelette). Tap sur le nom → fiche recette.

Le bouton « Ajouter » met sur la liste les ingrédients manquants seulement. Pas de portions, pas de temps de préparation, pas d'image : la carte est une liste de courses en puissance.

## RecipeChip

La pastille recette sous la barre de progression de la liste. Une par recette ajoutée, dans une rangée horizontale qui défile.

Contenu : toque Phosphor `ChefHat` 16px, nom, « ×N » si comptée N fois, « cochées sur total » de ses lignes. `is-complete` (fond `action`, texte `on-action`, coche) quand tout est dans le panier ou qu'il ne manquait rien.

Tap → fiche recette. Pas de retrait depuis la pastille : on retire la recette par son stepper (fiche ou carte). Hauteur `control-sm`, zone de tap 44px.

## ScreenHeader

L'en-tête d'un écran. Deux formes :

- **Racine** (onglet) : titre `title-screen` à gauche, une méta ou une action à droite (« 2 sur 12 », « + Nouvelle »). Marge haute `space-6`.
- **Fiche** : flèche retour Phosphor `CaretLeft` à gauche, actions texte à droite (« Modifier », « Supprimer » en `alert`, « Je n'en achète plus »), puis le nom en `title-hero` sur la ligne suivante avec sa méta en `label`.

Jamais plus de deux actions à droite. Pas de titre centré, pas d'icône dans le titre.

## SearchField

Le champ unique du panneau Ajouter et de la création de recette : capsule de `control` (44px), icône loupe, placeholder « Un produit, une recette… », bouton texte « Fermer » à droite, collé au clavier.

États : repos (bordure `line-strong`), actif (bordure `action`, curseur), chargement (spinner à droite, les résultats précédents restent affichés), aucun résultat (seule la ligne « Créer « … » » s'affiche, voir ListRow). La recherche se lance à la frappe sans bouton. Le champ se vide après « Créer » pour enchaîner, et garde le texte après un ajout depuis les résultats.

Le consommateur fournit `value`, `onChange`, `loading`, `onClose`.

## SettingField

Les champs de réglage d'une fiche produit, des Réglages de l'app et des ingrédients d'une recette. Une ligne par champ : libellé à gauche, valeur à droite dans un **rectangle `radius-field` sur fond `surface`, bordé `line-strong`, texte `ink` 700**. Le rectangle est blanc comme un champ, pas gris comme un bouton désactivé ; les actions, elles, sont des capsules.

Trois formes, trois interactions :

1. **Sélecteur** (Unité, Rayon, « Tu en prends ») : chevron `CaretDown` à droite. Tap → une feuille monte avec la liste des options (bouton radio, option courante en `action`). Choisir ferme la feuille et enregistre. Pour le rythme, la feuille porte un stepper de quantité, un segment jour / semaine / mois, « Enregistrer » et « Revenir à ce que j'ai appris » quand la valeur est déclarée.
2. **Saisie numérique** (Contenance, quantité d'ingrédient) : chiffres tabulaires alignés à droite. Tap → le rectangle passe en bordure `action` 1,5 px avec curseur, clavier numérique, barre « OK » au-dessus du clavier. Enregistré en quittant le champ ; erreur en `caption` `alert` sous le libellé, bordure `alert`, valeur conservée.
3. **Stepper de valeur** (Acheté par packs de, quantité dans la feuille du rythme ; la feuille du rythme porte aussi un segment jour / semaine / mois, capsule `surface-2` avec l'option active en `surface`) : même mécanique que le stepper d'ajout, mais en **variante champ** : rectangle `radius-field`, fond `surface`, bordure `line-strong`, texte `ink`, − et + en `ink-muted`. Le vert `action` sur un stepper veut toujours dire « sur la liste » ; un réglage n'y a pas droit.

Le rythme porte un indice `appris` / `déclaré` / `à définir` en `ink-muted` devant la valeur : le moteur dit d'où vient le chiffre. Pendant l'enregistrement, un spinner `action` remplace le chevron ; jamais de bouton « Valider ». Désactivé (produit archivé) : toute la ligne à 0,45, pas de chevron. Toute la ligne est tapable, pas seulement le rectangle.

## States

Les états d'écran qui ne sont pas du contenu : chargement, vide, hors ligne, erreur. Ils sont dessinés une fois ici et réutilisés tels quels.

- **Chargement** : squelettes (`skel`, fond `skeleton`, pulse sur `duration-slow` × 4) qui reprennent la silhouette du contenu attendu : trois lignes pour une liste, deux cartes pour les recettes. Jamais de spinner plein écran. Un chargement local (un bouton, un champ) utilise le spinner du composant.
- **Vide** : titre en `sentence` (Fraunces 20px, 500) + une phrase en `body-sm` `ink-muted`, et au besoin une action. Le texte dit quoi faire, pas qu'il n'y a rien : « Rien sur ta liste. Ajoute un produit, ou laisse-moi te proposer ce qui manque d'habitude. »
- **Hors ligne** : bandeau `banner` discret sous l'en-tête, fond `surface-2`, icône Phosphor `WifiSlash` ; tout reste utilisable, l'app écrit en local. Il disparaît au retour du réseau sans toast, sauf si une écriture a échoué.
- **Erreur** : pour une écriture, un toast `is-error` avec « Réessayer » ; pour un écran qui ne peut pas charger (très rare, données locales), l'état vide avec une phrase d'erreur et « Réessayer ».

## SuggestionRow

Une suggestion du moteur, sous le titre « Comme d'hab chef ? » : nom en `body-strong`, justification en `caption` (une phrase, en langage courant, qui dit pourquoi), bouton contour « Ajouter N ».

Le bloc des suggestions s'affiche toujours en entier, avant « Tous tes produits ». Une suggestion ignorée revient la fois suivante ; il n'y a pas de bouton pour la refuser. Une fois ajoutée, le bouton devient le stepper et la ligne reste à sa place jusqu'à la fermeture du panneau.

États : chargement (deux lignes de squelette), aucune suggestion (le bloc disparaît, le titre aussi : on n'affiche pas « Rien à suggérer »).

Le consommateur fournit la liste des suggestions `{product, quantity, reason}` et `onAdd`.

## TabBar

Quatre onglets, toujours les mêmes, dans cet ordre : Liste, Produits, Recettes, Réglages. Icônes Phosphor 22px (`ListChecks`, `Basket`, `ChefHat`, `Sliders`) : graisse *regular* au repos, *fill* pour l'onglet actif, libellé `tab` 11px. Actif = `ink` graisse 700, inactif = `ink-muted`. Fond `surface`, filet `line` au-dessus, hauteur `tab-bar` dont 24px de zone de sécurité.

Pas de badge sur les onglets : le nombre de suggestions vit sur la barre « Ajouter » de la liste. La barre reste visible sous le panneau Ajouter (derrière le scrim) et disparaît sous le clavier.

## TextInput

Le champ de texte libre des écrans de compte et de création de recette : libellé au-dessus en `label` `ink-muted`, boîte de `control` (44px) sur `surface`, bordure `line-strong`, rayon `radius-field`, texte `body`. Placeholder en `ink-muted` qui montre un exemple (« Ex. Carbonara », « 8 caractères minimum »), jamais une consigne.

États : repos, actif (bordure `action` 1,5 px), erreur (bordure `alert`, message en `caption` `alert` sous la boîte, valeur conservée), désactivé (0,45). Une zone de texte (Notes) est le même champ en hauteur libre, minimum 64px.

Le lien d'aide d'un champ (« Mot de passe oublié ? ») est un bouton texte aligné à droite sous la boîte. Pas d'icône dans le champ, sauf la loupe du champ de recherche (SearchField), qui est un autre composant.

## Toast

Un message bref en bas d'écran, au-dessus de la barre d'onglets, pour une action dont le résultat n'est **pas visible sous le doigt**. Jamais pour une coche, un stepper, un ajout depuis le panneau Ajouter, un réglage modifié sur place.

Quand : une recette ajoutée depuis sa fiche (« 2 produits ajoutés à la liste »), un export lancé, une erreur d'écriture (« Pas enregistré, réessayer »), le retour en ligne après une synchronisation.

Formes : neutre (fond `ink`, texte `ground`, action optionnelle en `action-soft`), erreur (`is-error`, fond `alert-soft`, texte et bordure `alert`, action « Réessayer » obligatoire). Entrée en `duration-base` par le bas, disparition après 4 s, ou 8 s avec action ; un seul toast à la fois, le nouveau remplace l'ancien. Pas d'icône, pas de titre.

## Toggle

L'interrupteur des Réglages (« Aider à améliorer le catalogue »). 46×28, capsule, pouce `surface`. Fond `action` quand activé, `line-strong` sinon ; désactivé à 0,45. Le libellé est à gauche, l'explication en `caption` dessous. Pas d'état intermédiaire : un toggle qui attend le réseau reste à sa nouvelle position et se remet en place si l'écriture échoue, avec un toast d'erreur.
