export type SystemKey = 'fresh' | 'frozen';

export interface DefaultCategory {
  /** Clé stable, référencée par `category_key` dans le catalogue et par `category.key` en base. */
  key: string;
  name: string;
  systemKey: SystemKey | null;
}

/**
 * Rayons créés pour chaque nouveau compte, dans l'ordre de parcours (specs techniques 7.4). Le
 * trigger d'inscription (`supabase/migrations`) en garde une copie, qui doit rester identique.
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { key: 'hygiene-beaute', name: 'Hygiène et beauté', systemKey: null },
  { key: 'bebe-animaux', name: 'Bébé et animaux', systemKey: null },
  { key: 'entretien-maison', name: 'Entretien et maison', systemKey: null },
  { key: 'fruits-legumes', name: 'Fruits et légumes', systemKey: null },
  { key: 'boulangerie', name: 'Boulangerie', systemKey: null },
  { key: 'epicerie-salee', name: 'Épicerie salée', systemKey: null },
  { key: 'epicerie-sucree', name: 'Épicerie sucrée', systemKey: null },
  { key: 'boissons', name: 'Boissons', systemKey: null },
  { key: 'cremerie', name: 'Crémerie', systemKey: 'fresh' },
  { key: 'viande-poisson-traiteur', name: 'Viande, poisson, traiteur', systemKey: 'fresh' },
  { key: 'surgeles', name: 'Surgelés', systemKey: 'frozen' },
];
