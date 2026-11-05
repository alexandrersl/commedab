/**
 * Enregistre le service worker du build web (`dist/sw.js`, specs techniques 6.4), pas en
 * développement où il n'existe pas. Quand une nouvelle version prend la main, la page se
 * recharge pour charger ses fichiers : les anciens ne sont plus en cache ni sur le serveur.
 */
export function registerServiceWorker(): void {
  if (__DEV__ || !('serviceWorker' in navigator)) return;
  const updating = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) window.location.reload();
  });
  navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    console.warn('Service worker non enregistré', error);
  });
}
