import { v5, v7 } from 'uuid';

/** Espace de noms de l'achat créé à la coche ; ne change jamais (specs techniques 5.5). */
const PURCHASE_NAMESPACE = '23413ee3-7a41-418c-a1b0-0f22dda93851';

export function newId(): string {
  return v7();
}

/** Identifiant de l'achat de la ligne `lineId` : deux appareils qui la cochent créent le même. */
export function purchaseIdOf(lineId: string): string {
  return v5(lineId, PURCHASE_NAMESPACE);
}
