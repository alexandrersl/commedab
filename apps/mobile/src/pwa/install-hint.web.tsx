import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../components/button';
import { Text } from '../components/text';

const SEEN = 'commedab.install-hint';

/** Safari sur iPhone ou iPad (un iPad se présente comme un Mac tactile), hors de l'app installée. */
function inSafariOnIos(): boolean {
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const installed =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  return ios && !installed;
}

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN) !== null;
  } catch {
    return false;
  }
}

/**
 * iOS n'invite pas à installer une PWA : dans Safari, la Liste explique une fois comment
 * l'ajouter à l'écran d'accueil (specs techniques 6.4), jusqu'à « Compris ».
 */
export function InstallHint() {
  const [visible, setVisible] = useState(() => inSafariOnIos() && !seen());
  if (!visible) return null;
  return (
    <View className="flex-row items-center gap-3 rounded-card border-thin border-line bg-surface px-3 py-2">
      <Text variant="body-sm" className="flex-1">
        Pour l&apos;avoir sous la main en magasin : Partager, puis « Sur l&apos;écran d&apos;accueil
        ».
      </Text>
      <Button
        variant="text"
        label="Compris"
        onPress={() => {
          try {
            localStorage.setItem(SEEN, '1');
          } catch {
            // Sans stockage, l'aide reviendra à la prochaine ouverture.
          }
          setVisible(false);
        }}
      />
    </View>
  );
}
