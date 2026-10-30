import { Text } from './text';

/** Morceau de la phrase d'estimation ; `emphasis` pour le chiffre clé ou « Probablement fini ». */
export interface EstimatePart {
  text: string;
  emphasis?: 'action' | 'alert';
}

/**
 * La voix du moteur (components.md, Estimate) : une phrase en langage courant, le chiffre clé
 * en `action` (ou `alert` quand c'est probablement fini). `short` : la version d'un ingrédient.
 * `muted` quand le moteur ne sait rien, ou que le produit est archivé.
 */
export function Estimate({
  parts,
  short = false,
  muted = false,
}: {
  parts: readonly EstimatePart[];
  short?: boolean;
  muted?: boolean;
}) {
  return (
    <Text variant={short ? 'caption' : 'sentence'} tone={muted ? 'muted' : 'ink'}>
      {parts.map((part, i) =>
        part.emphasis === undefined ? (
          part.text
        ) : (
          <Text
            key={i}
            variant={short ? 'caption' : 'sentence'}
            tone={part.emphasis}
            className={short ? '' : 'font-Fraunces_600SemiBold'}
          >
            {part.text}
          </Text>
        ),
      )}
    </Text>
  );
}
