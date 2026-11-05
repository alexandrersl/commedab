/**
 * Une base dont les membres du foyer sont connus mais n'incluent pas `userId` appartient à un
 * autre compte. Une base vide n'appartient à personne.
 */
export function ownedByAnotherAccount(memberIds: readonly string[], userId: string): boolean {
  return memberIds.length > 0 && !memberIds.includes(userId);
}
