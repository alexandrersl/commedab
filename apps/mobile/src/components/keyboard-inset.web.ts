import { useEffect, useState, type ComponentRef, type RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Hauteur du cadre que cache le clavier : ce qui dépasse, sous la zone visible
 * (`visualViewport`), du bas du cadre. Le cadre ne descend pas toujours jusqu'au bas de la
 * page : dans un onglet, il s'arrête à la barre d'onglets, que le clavier recouvre aussi.
 */
function covered(frame: RefObject<ComponentRef<typeof View> | null>): number {
  const viewport = window.visualViewport;
  const node = frame.current as unknown as HTMLElement | null;
  if (viewport === null || node === null) return 0;
  const bottom = node.getBoundingClientRect().bottom;
  return Math.max(0, Math.round(bottom - viewport.height - viewport.offsetTop));
}

/** Style d'une zone d'où un glissement du doigt ne fait pas défiler la page. */
export const NO_PAN = { touchAction: 'none' } as const;

/**
 * Sur le web, le clavier d'iOS se pose sur la page sans la réduire : un champ fixé en bas
 * d'écran reste dessous. Cette hauteur, suivie à chaque mouvement du clavier, remonte le bas
 * du cadre `frame` juste au-dessus de lui ; elle s'applique en marge intérieure basse de ce
 * même cadre. `pinned` : clavier ouvert, iOS laisse glisser toute la page sous le doigt, et la
 * fait défiler de lui-même vers le champ ; un panneau qui tient déjà au-dessus du clavier la
 * ramène à sa place, sans quoi son haut sort de l'écran.
 */
export function useKeyboardInset(
  frame: RefObject<ComponentRef<typeof View> | null>,
  pinned = false,
): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (viewport === null) return undefined;
    const update = () => {
      if (pinned && (viewport.offsetTop > 0 || window.scrollY > 0)) window.scrollTo(0, 0);
      setInset(covered(frame));
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [frame, pinned]);
  return inset;
}
