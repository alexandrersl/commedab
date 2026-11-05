# Liste de contrôle : PWA sur iPhone

À dérouler sur l'iPhone cible à chaque changement de la couche de stockage, de synchronisation
ou du service worker (specs techniques 9.1), sur https://commedab.app.

1. Dans Safari, ouvrir l'app et se connecter : la liste s'affiche en quelques secondes, sans
   bandeau « Hors ligne » qui reste.
2. Partager → « Sur l'écran d'accueil », puis ouvrir l'app depuis l'icône : elle s'affiche en
   plein écran, sans barre Safari. Se reconnecter si besoin (l'icône a sa propre session).
3. Fermer l'app (balayer vers le haut dans le sélecteur d'apps) et la rouvrir : la liste
   revient sans nouvelle connexion.
4. Se déconnecter puis se reconnecter, avec Google : la liste revient sans attente.
5. Hors ligne : ouvrir l'app une fois en ligne, puis passer en mode avion, fermer l'app et la
   rouvrir depuis l'icône. Elle se lance, la liste s'affiche avec le bandeau « Hors ligne ».
   Cocher une ligne, en ajouter une.
6. Quitter le mode avion : le bandeau disparaît, et les deux modifications apparaissent sur un
   autre appareil connecté au même compte.
7. Après un déploiement : rouvrir l'app en ligne. Elle se recharge d'elle-même une fois pour
   prendre la nouvelle version.

En navigation privée, la base locale (OPFS) n'est pas disponible (specs techniques 2.6) :
l'app doit dire qu'elle ne peut pas charger la liste, sans planter.
