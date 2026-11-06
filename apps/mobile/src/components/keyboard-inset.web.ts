import { useEffect, useState } from 'react';

/** Hauteur de page que cache le clavier : ce qui dépasse la zone visible (`visualViewport`). */
function covered(): number {
  const viewport = window.visualViewport;
  if (viewport === null) return 0;
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

/**
 * Sur le web, le clavier d'iOS se pose sur la page sans la réduire : un champ fixé en bas
 * d'écran reste dessous. Cette hauteur, suivie à chaque mouvement du clavier, remonte le bas
 * de l'écran juste au-dessus de lui.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(covered);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (viewport === null) return;
    const update = () => setInset(covered());
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}
