/**
 * Forme de comparaison d'un nom (specs techniques 7.5) : minuscules, sans accents ni
 * ponctuation, mots séparés d'une espace. Sert aussi `product.name_normalized`.
 */
export function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
