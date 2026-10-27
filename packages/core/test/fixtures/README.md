# Fixtures du moteur

Une fixture par scénario de référence (specs techniques 4.8), `T01.json`, `T02.json`…,
toutes listées dans `index.ts`. Elles sont la définition exécutable des formules : toute
modification du moteur commence par une fixture.

Champs d'une fixture :

- `products`, `events` : seuls les champs utiles au scénario sont écrits ; `fixture.ts`
  complète avec les valeurs par défaut du modèle (pièce, famille `rhythm`, stock de
  sécurité 1…). Les quantités sont en unités d'achat (RG-1).
- `household` (taille 1 par défaut), `listLines`, `recipes`, `recipeRequests` : selon le
  scénario.
- `finishedReport` : un « fini » signalé, daté par `resolveFinishedAt` puis ajouté aux
  événements avant les autres vérifications.
- `now` et les dates des événements sont en heure locale sans fuseau
  (`2026-10-26T18:30:00`, specs techniques 4.1).
- `periodDays` : durée de la liste, pour vérifier les suggestions.
- `expected` : seules les valeurs écrites sont vérifiées (`rates`, `intervals`, `states`,
  `finishedAt`, `suggestions`, `recipeLines`). Une quantité s'écrit en nombre ou en
  fraction (`"1/7"`). `invalidInput` nomme le champ que `suggestForPeriod` doit refuser
  par une `InvalidInputError`.

`engine.test.ts` vérifie en plus, sur toutes les fixtures, les propriétés de 4.8 :
idempotence, stock jamais négatif, événements supprimés sans effet, aucune suggestion
quand le stock couvre la période, suggestion « à rythme » dépassant le besoin de moins
d'un pas.
