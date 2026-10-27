/** Entrée hors du domaine attendu par le moteur ; `field` nomme la valeur fautive. */
export class InvalidInputError extends Error {
  override readonly name = 'InvalidInputError';
  readonly field: string;
  readonly value: unknown;

  constructor(field: string, value: unknown, reason: string) {
    super(`${field} ${reason} : ${String(value)}`);
    this.field = field;
    this.value = value;
  }
}
