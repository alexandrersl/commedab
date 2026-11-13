import { LEGAL, UPDATED } from '../screens/legal/content';
import { LegalPage } from '../screens/legal/page';

export default function Legal() {
  return <LegalPage title="Mentions légales" updated={UPDATED} sections={LEGAL} />;
}
