import { AddControl } from './add-control';
import { ListRow } from './list-row';

/**
 * Une suggestion du moteur (components.md, SuggestionRow ; EF-2.2, EF-2.5) : nom, raison en
 * une phrase, « Ajouter N » ; une fois ajoutée, le stepper, à sa place jusqu'à la fermeture.
 */
export function SuggestionRow({
  name,
  reason,
  suggested,
  quantity,
  quantityLabel,
  onChange,
  pending = false,
}: {
  name: string;
  reason: string;
  /** Packs proposés. */
  suggested: number;
  /** Packs sur la liste ; nul tant que la suggestion n'est pas ajoutée. */
  quantity: number | null;
  quantityLabel?: ((quantity: number) => string) | undefined;
  onChange: (next: number) => void;
  pending?: boolean;
}) {
  return (
    <ListRow
      card={false}
      checkbox={false}
      name={name}
      subtitle={reason}
      accessory={
        <AddControl
          quantity={quantity}
          suggested={suggested}
          addLabel={suggested > 1 ? `Ajouter ${suggested}` : 'Ajouter'}
          quantityLabel={quantityLabel}
          onChange={onChange}
          pending={pending}
        />
      }
    />
  );
}
