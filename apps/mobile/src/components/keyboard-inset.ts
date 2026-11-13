import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';

/** Hors du web, `KeyboardAvoidingView` laisse déjà la place du clavier. */
export function useKeyboardInset(
  _frame: RefObject<ComponentRef<typeof View> | null>,
  _pinned = false,
): number {
  return 0;
}

/** Sans objet hors du web. */
export const NO_PAN = {};
