import { Text as RNText, type TextProps } from 'react-native';
import type { TextStyleName } from '../theme';

export type Tone = 'ink' | 'muted' | 'action' | 'alert' | 'on-action' | 'ground';

const TONES: Record<Tone, string> = {
  ink: 'text-ink',
  muted: 'text-ink-muted',
  action: 'text-action',
  alert: 'text-alert',
  'on-action': 'text-on-action',
  ground: 'text-ground',
};

/** Texte dans un style de `tokens.json` ; la taille suit le réglage de l'appareil (ENF-9). */
export function Text({
  variant = 'body',
  tone = 'ink',
  className = '',
  ...props
}: TextProps & { variant?: TextStyleName; tone?: Tone; className?: string }) {
  return <RNText className={`type-${variant} ${TONES[tone]} ${className}`} {...props} />;
}
