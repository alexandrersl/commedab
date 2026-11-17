/**
 * Mot de passe d'un compte qui attend la confirmation de son adresse, gardé en mémoire le temps
 * de l'écran « Vérifie ta boîte mail ». Sur iPhone, le lien de l'e-mail s'ouvre dans Safari,
 * dont le stockage n'est pas celui de la PWA installée : la session ouverte là-bas n'arrive
 * jamais ici, et c'est une connexion par mot de passe qui ouvre le compte au retour.
 */
let pending: { email: string; password: string } | null = null;

export function holdPassword(email: string, password: string): void {
  pending = { email: email.trim(), password };
}

export function heldPassword(email: string): string | null {
  return pending !== null && pending.email === email.trim() ? pending.password : null;
}

export function dropPassword(): void {
  pending = null;
}
