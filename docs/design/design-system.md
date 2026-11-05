# Design system Commedab

Commedab est une liste de courses qui apprend les habitudes de la maison. Le système porte une seule idée : **l'app parle comme quelqu'un qui connaît ta cuisine**, et tout ce qui n'est pas cette voix s'efface. Direction « Toque » : lin, encre brune, un vert profond pour agir, un corail pour ce qui manque, une serif droite pour les mots qui comptent.

Ce document est la référence pour tout écran, composant ou texte ajouté à l'app. Les maquettes basse fidélité (artefact Design « Commedab — Maquettes MVP ») fixent la structure des écrans ; ce système fixe leur apparence et leur voix. Les spécifications du dépôt restent la source de vérité fonctionnelle.

## Principes

1. **Un geste, visible sous le doigt.** Ajouter et cocher sont les deux actions de l'app. Leur résultat s'affiche à l'endroit même du tap (bouton → stepper, case → coche). Aucune confirmation, aucun toast pour ces gestes ; décocher est l'annulation.
2. **Le moteur explique, il n'impose pas.** Chaque chiffre qu'il avance vient avec sa raison, en une phrase (« Tu en prends 5 par semaine, il doit t'en rester 1 »). Il ne se refuse pas, il revient.
3. **Rien de l'intérieur ne remonte.** Pas de « stock », de « rythme », de « période », de « session », d'identifiant, de pourcentage. Des bouteilles, des packs, des jours de la semaine.
4. **Calme par défaut, franc sur l'action.** Le lin et l'encre occupent 90 % de l'écran ; `action` et `alert` sont réservés à ce qui se tape ou à ce qui manque.
5. **Les deux thèmes sont conçus, pas inversés.** Le sombre est brun chaud, pas gris ; `action` y devient menthe, `alert` y devient saumon, et chaque fond `action`/`alert` prend un texte `on-…` ou le texte de sa teinte.

## Couleur

Quatre rôles, dans cet ordre de fréquence :

- **Fonds** : `ground` pour l'écran, `surface` pour ce qui est posé dessus (cartes, feuilles, barre d'onglets), `surface-2` pour ce qui est mis en avant sans être une action (ligne en surbrillance, pastille « possédé », rail de progression, bandeau hors ligne).
- **Texte** : `ink` pour tout ce qui se lit, `ink-muted` pour ce qui accompagne (sous-titres, justifications, quantités, onglets inactifs). Les deux tiennent ≥ 4,5:1 sur les trois fonds, dans les deux thèmes.
- **Action et « sur la liste »** : `action` pour les boutons, le stepper, la coche, les liens, la pastille recette complète, l'anneau de focus ; `action-soft` pour le fond d'un stepper actif ou d'un choix sélectionné ; `on-action` pour le texte posé sur `action`. Il n'y a pas de couleur « succès » distincte : être sur la liste ou dans le panier, c'est la même teinte.
- **Manquant et irréversible** : `alert` pour les pastilles « manquant », « Il te manque 2 ingrédients », « Supprimer », « Je n'en achète plus », les erreurs ; `alert-soft` pour leur fond. Un seul corail : on ne distingue pas « attention » de « danger », le libellé le fait.

Bordures : `line` pour la décoration (cartes, séparateurs), `line-strong` quand la bordure porte un sens (case vide, champ) — elle tient 3:1. `scrim` sous les feuilles. `skeleton` pour le chargement.

Interdits : une couleur hors tokens (seule exception : le logo Google sur son bouton) ; `action` et `alert` sur la même ligne pour deux actions ; un texte blanc en dur sur `action` (utiliser `on-action`) ; un vert et un rouge qui ne se distingueraient que par la teinte — ici `action` et `alert` diffèrent aussi en luminosité et chaque état porte un mot.

## Typographie

Deux familles, hébergées par Google Fonts (Expo : `@expo-google-fonts/fraunces` et `@expo-google-fonts/manrope`).

- **Fraunces, droit, jamais en italique.** Deux graisses : 600 pour les titres (`title-screen` 28, `title-hero` 32, `title-section` 17, nom de recette sur carte 20) ; 500 pour les phrases en langage courant (`sentence` : l'estimation à 18, « Comme d'hab chef ? » à 24). En dessous de 18 px, Fraunces est interdite.
- **Manrope** pour tout le reste : `body` 16/500 (champs), `body-strong` 16/600 (nom d'un produit), `body-sm` 14/500, `label` 13/600, `caption` 12/600, `tab` 11/600, `button` 15/700, `button-sm` 13/700.

Les tailles sont celles des maquettes ; on ne les augmente pas. Les hauteurs de ligne de `tokens.json` sont des valeurs de base à la taille système par défaut : Dynamic Type iOS est respecté, les composants n'imposent aucune hauteur en pixels et grandissent avec leur texte. Chiffres tabulaires (`tabular-nums`) partout où des quantités s'alignent.

## Espacement, formes, bordures

Grille de 4 : `space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16, `space-6` 24, `space-8` 32. Gouttière d'écran `space-4` des deux côtés, toujours.

La forme dit la nature de l'élément :
- **capsule** (`radius-pill`) = action ou étiquette : bouton contour, stepper, pastilles, champ de recherche, badge, barre de progression ;
- **rectangle 10** (`radius-field`) = on saisit ou on choisit ici : champs de réglage (fond `surface`, jamais `ground`, pour ne pas ressembler à un bouton désactivé), zone d'onglet ;
- **carte 14** (`radius-card`) = conteneur et bouton plein ;
- **feuille 22** (`radius-sheet`) = ce qui monte par-dessus l'écran.

Bordures `border-thin` 1 px décoratives, `border-strong` 1,5 px sur les contrôles d'action, `border-focus` 2 px en `action` décalé de 2 px pour le focus clavier. Pas d'ombre portée sauf sous le toast ; la hiérarchie vient des fonds et des bordures.

## Tailles et zones de tap

`control-sm` 36 (bouton contour, stepper, pastille recette), `control` 44 (champs), `control-lg` 48 (bouton plein), `row` 54 (ligne), `checkbox` 22, `icon` 22, `tab-bar` 84, interrupteur `toggle-w` × `toggle-h` 46 × 28. Tout ce qui est plus petit que 44 px reçoit une zone de tap de 44 px (`hitSlop`). En magasin, on tape avec le pouce et un caddie dans l'autre main.

## États

Chaque composant documente ses états ; les règles communes :

- **Pressé**, en `duration-fast` sur la courbe `ease-out` : un bouton (plein, contour, stepper, pastille) passe à l'échelle 0,97 et à l'opacité 0,85 (`scale-pressed`, `opacity-pressed`) ; une ligne (liste, résultat, réglage, option de feuille) prend le fond `surface-2` sans changer de taille ; un lien ou un titre tapable passe seulement à l'opacité 0,85. Un doigt qui glisse de plus de `space-2` avant de se relever annule l'appui.
- **Désactivé** : opacité 0,45, aucune interaction, jamais de texte « indisponible » à côté.
- **Chargement** : local au composant (spinner dans le bouton, dans le champ) ; pour un écran, des squelettes qui reprennent la silhouette du contenu. Jamais de spinner plein écran, jamais de « Chargement… ».
- **En attente** (`is-pending`) : une ligne écrite en local pas encore synchronisée, opacité 0,55, utilisable.
- **Vide** : un titre en `sentence`, une phrase qui dit quoi faire, une action. Voir `States`.
- **Hors ligne** : un bandeau discret, tout reste utilisable. Voir `States`.
- **Erreur** : un toast `is-error` avec « Réessayer » pour une écriture ; un état vide avec « Réessayer » pour un écran.
- **Focus** (clavier, accessibilité) : anneau `border-focus` en `action`.

## Mouvement

Une seule courbe, `ease-out` `cubic-bezier(0.2, 0, 0, 1)` (jeton `easing`). Trois durées : `duration-fast` 150 (coche, pression, chiffre du stepper), `duration-base` 220 (feuille, panneau, toast, glissement), `duration-slow` 320 (ligne qui part, réordonnancement, base du pulse des squelettes × 4). Haptique légère à la coche et à chaque pas de stepper. `prefers-reduced-motion` : durées à 0, états conservés.

## Retours

Pas de toast pour un geste dont le résultat est visible sous le doigt. Un toast pour ce qui se passe ailleurs : recette ajoutée depuis sa fiche, export lancé, écriture échouée, retour en ligne après un échec. Un seul à la fois, 4 s (8 s avec action), sans icône ni titre. Voir `Toast`.

## Iconographie

**Phosphor** (`phosphor-react-native`), deux graisses seulement : *regular* partout, *fill* pour l'onglet actif. 22 px dans la barre d'onglets et les en-têtes, 16 px dans les pastilles et la barre « Ajouter », 14 px devant un en-tête de rayon. Couleur `currentColor`, jamais une couleur propre.

Où il y a des icônes, et où il n'y en a pas :
- **Onglets** : `ListChecks`, `Basket`, `ChefHat`, `Sliders`.
- **Utilitaires** : `MagnifyingGlass` (recherche), `Check` en *bold* (coche), `CaretLeft` / `CaretRight` (navigation), `Plus`, `X`, `WifiSlash`.
- **Rayons** : un jeu fermé, une icône par rayon par défaut des specs techniques (7.4) plus « À classer », devant chaque en-tête de section de la liste et de l'annuaire (voir le composant Icons). On n'en ajoute pas sans ajouter un rayon.
- **Recette** : `ChefHat` est le seul signe récurrent de la marque ; il marque une recette partout (onglet, pastille, résultat de recherche).
- **États vides** : une icône du jeu ci-dessus à 40 px en `ink-muted` au-dessus du titre, facultative.
- **Jamais** : sur une ligne de produit, dans un titre, sur une carte recette, en décoration. Pas d'emoji, pas d'illustration.
- **Logos de marque** : les boutons « Continuer avec Google / Apple » portent les logos officiels, le G en couleur (exigence de Google), la pomme en `ink`. Ce sont les seules couleurs hors tokens de l'app, et elles ne servent qu'à ça.
- **Apple** : le bouton « Continuer avec Apple » n'est affiché qu'en natif (iOS/Android), jamais sur la PWA.

En magasin on scanne des noms ; les icônes servent au repérage des groupes, pas à décorer les lignes.

## Logo

Pas de logo dessiné à ce stade : le nom en Fraunces 600 fait office de marque (voir la couverture). Le signe d'app sera dérivé de la toque et de `action` sur `ground` ; à décider avec les maquettes haute fidélité.

## Pour le code

`tokens.json` est la source des valeurs : il alimente `tailwind.config` de NativeWind (couleurs par thème, `fontFamily`, `spacing`, `borderRadius`). Dans le dépôt, le design system vit dans `docs/design/` (`design-system.md`, `components.md`, `tokens.json`). Les aperçus de composants sont en HTML/CSS et servent de référence visuelle, pas de code à copier : les composants React Native reprennent les mêmes noms d'états (`pressed`, `disabled`, `loading`, `pending`, `highlight`, `checked`, `complete`, `selected`).


# Voix

Commedab parle comme quelqu'un qui connaît ta cuisine : au tutoiement, en phrases courtes, avec une pointe d'humour quand ça ne gêne pas le geste. Elle ne s'excuse pas, ne s'exclame pas, ne félicite pas.

## Règles

- **Tu, jamais vous.** L'app s'adresse à une personne, pas à un foyer.
- **Je, rarement.** L'app dit « je » uniquement quand elle parle du moteur (« j'apprendrai », « je mets sur la liste ce qui te manque »). Jamais « nous ».
- **Les mots de la cuisine, pas ceux du code.** Bouteilles, packs, paquets, « il t'en reste », « tu en reprends ». Jamais stock, inventaire, rythme, période, fréquence, session, synchronisation, catalogue (sauf dans Réglages, où « catalogue » est le bon mot).
- **Le temps en langage parlé.** « jusqu'à mardi », « il y a 3 semaines », « avant-hier ». Jamais de date numérique hors Historique, jamais de pourcentage.
- **Une phrase par message.** Deux au maximum pour un état vide. Le point final est présent sur une phrase, absent sur un libellé.
- **Les libellés disent ce qui va se passer.** « Ajouter à la liste », « Retirer de la liste », « Je n'en achète plus », « Réessayer ». Jamais « OK », « Valider », « Confirmer », « Oui/Non ».
- **Le moteur justifie, il ne juge pas.** « Tu en prends 5 par semaine » et non « Vous consommez beaucoup de lait ».
- **L'humour reste sur les titres.** « Comme d'hab chef ? » est le seul endroit où l'app se permet un clin d'œil. Les erreurs et les états vides restent sobres.
- **Majuscule initiale, pas de majuscules de titre.** « Ajouter à la liste », pas « Ajouter À La Liste ». Pas de point d'exclamation. Guillemets français « » avec espaces fines.

## Exemples de référence

Ces textes sont ceux de l'app ; un nouveau texte doit pouvoir se glisser parmi eux sans détonner.

| Contexte | Texte |
| --- | --- |
| Titre des suggestions | Comme d'hab chef ? |
| Justification d'une suggestion | Il doit t'en rester 1, de quoi tenir jusqu'à mardi |
| Justification d'une suggestion | D'habitude tu en reprends tous les 12 jours, ça fait 11 |
| Justification d'une suggestion | Le dernier pack date de 9 jours, il doit être fini |
| Estimation, rythme connu | Il t'en reste environ 2 bouteilles, de quoi tenir jusqu'à mardi. |
| Estimation, probablement fini | Probablement fini : le dernier pack date de 3 semaines. |
| Estimation, rien à dire | Je ne sais pas encore : dis-moi quand tu en reprends, j'apprendrai. |
| Produit archivé | Tu n'en achètes plus. |
| Sous une recette, avant ajout | Lardons et crème partiront sur la liste, le reste tu l'as déjà. |
| Carte recette, rien ne manque | Tu as tout ce qu'il faut |
| Carte recette | 5 ingrédients · il te manque 2 |
| Création à la volée | Créer « cacao » |
| Aide sous Créer | Dans « À classer », tu pourras ranger plus tard |
| Badge | NEW |
| Placeholder de recherche | Un produit, une recette… |
| Liste vide | Rien sur ta liste. Ajoute un produit, ou laisse-moi te proposer ce qui manque d'habitude. |
| Recettes vides | Pas encore de recette. Une recette, c'est une liste de courses toute prête : tu l'ajoutes et je mets sur la liste ce qui te manque. |
| Toast, recette ajoutée depuis sa fiche | 2 produits ajoutés à la liste |
| Toast, erreur d'écriture | Pas enregistré — Réessayer |
| Bandeau hors ligne | Hors ligne · tes modifications seront envoyées plus tard |
| Erreur de chargement | Impossible de charger tes produits. Réessaie, et si ça continue, dis-le nous depuis les Réglages. |
| Réglage | Aider à améliorer le catalogue — Noms de produits partagés, anonymes et agrégés |
| Champ de rythme | Tu en prends · appris · 5 / semaine |
| Erreur de champ | Un chiffre |

## À ne pas écrire

- « Votre stock de lait est bas (23 %). »
- « Félicitations, votre liste est terminée ! »
- « Êtes-vous sûr de vouloir supprimer cet élément ? » → un bouton « Supprimer la recette » en `alert` dans une feuille suffit ; le libellé est la question.
- « Chargement en cours… » → un squelette.
- « OK » sur la barre du clavier → « Terminé », le libellé système.
- « Aucun résultat. » → la ligne « Créer « … » » est la réponse.
