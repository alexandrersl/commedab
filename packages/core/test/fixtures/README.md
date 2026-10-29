# Fixtures du moteur

Une fixture par scénario de référence (specs techniques 4.8), `T01.json`, `T02.json`…,
toutes listées dans `index.ts`. Les numéros des fixtures supprimées ne sont pas réattribués.
`schema.ts` en donne le type et le vérifie au chargement : une clé inconnue ou mal typée fait
échouer les tests. Elles sont la définition exécutable des formules : toute modification du
moteur commence par une fixture.

Champs d'une fixture :

- `products`, `purchases`, `listLines`, `listRecipes`, `recipes` : seuls les champs utiles au
  scénario sont écrits ; `fixture.ts` complète avec les valeurs par défaut du modèle (unité
  « pièce », pack de 1, ligne d'origine `suggestion` d'un pack créée à `now`, recette de la
  liste comptée une fois…). Les achats sont en unités, les lignes en packs (RG-1).
- `recipeRequests` : recettes et nombre de fois demandés à `missingIngredients` ;
  `recipeChanges` : passages de `from` à `to` fois par `applyRecipe`, appliqués aux lignes
  non cochées de la fixture.
- `now`, `openedAt` (ouverture de l'application, `now` par défaut) et toutes les dates sont en
  heure locale sans fuseau (`2026-10-26T18:30:00`, specs techniques 4.1). Les achats forment
  les sessions de courses (4.7).
- `periodDays` : durée de la liste, pour vérifier les suggestions.
- `expected` : seules les valeurs écrites sont vérifiées (`rates`, `intervals`, `states`,
  `suggestions`, `sessions`, `lineStates`, `openings`, `period`, `missing`, `recipeChanges`).
  `openings` vérifie les états des lignes et les pastilles des recettes à plusieurs ouvertures
  de l'application ; `missing` et `recipeChanges` suivent l'ordre de `recipeRequests` et de
  `recipeChanges`. Une quantité s'écrit en nombre ou en fraction (`"1/7"`). `invalidInput`
  nomme le champ que `suggestForPeriod` doit refuser par une `InvalidInputError`.

`engine.test.ts` vérifie en plus, sur toutes les fixtures, les propriétés de 4.8 :
idempotence, stock jamais négatif, ligne retirée sans effet sur le stock, aucune suggestion
quand le stock couvre la période, suggestion dépassant le besoin de moins d'un pack.
