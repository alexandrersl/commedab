import { router } from 'expo-router';
import { Button } from '../components/button';
import { AuthLayout } from '../screens/auth/layout';

/** Lien d'e-mail expiré ou déjà utilisé (EF-5.10). */
export default function LinkExpired() {
  return (
    <AuthLayout
      title="Lien expiré"
      lead="Ce lien n'est plus valable. Demande-en un nouveau, ça prend dix secondes."
    >
      <Button label="Demander un nouveau lien" onPress={() => router.replace('/forgot-password')} />
      <Button
        variant="text"
        label="Retour à la connexion"
        onPress={() => router.replace('/sign-in')}
      />
    </AuthLayout>
  );
}
