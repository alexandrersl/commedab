import { PRIVACY, UPDATED } from '../screens/legal/content';
import { LegalPage } from '../screens/legal/page';

export default function Privacy() {
  return <LegalPage title="Confidentialité" updated={UPDATED} sections={PRIVACY} />;
}
