# Liste de contrôle : PWA sur iPhone

À dérouler sur l'iPhone cible à chaque changement de la couche de stockage ou de
synchronisation (specs techniques 9.1). La PWA doit être servie en HTTPS : OPFS et
le service worker l'exigent.

1. Dans Safari, ouvrir l'URL de la PWA : l'écran affiche « Base locale : écrite,
   fermée, relue » et le moteur `wa-sqlite, OPFSCoopSyncVFS`.
2. Partager → « Sur l'écran d'accueil », puis ouvrir l'app depuis l'icône : elle
   s'affiche en plein écran, sans barre Safari.
3. Fermer l'app (balayer vers le haut dans le sélecteur d'apps) et la rouvrir :
   « Vérifications précédentes » a augmenté de 1 et « Dernière » montre la date
   du lancement précédent.
4. Redémarrer l'iPhone et rouvrir l'app : le compteur a encore augmenté.
5. En navigation privée, l'échec est attendu (OPFS n'y fonctionne pas, specs
   techniques 2.6) : vérifier seulement que l'app affiche l'erreur sans planter.

Hors ligne : sans service worker (à venir, specs techniques 6.4), l'app ne se
lance pas sans réseau ; ce point n'est pas encore vérifiable.
