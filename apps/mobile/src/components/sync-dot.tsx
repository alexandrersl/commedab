import type { SyncState } from '@commedab/data';
import { View } from 'react-native';
import { useSyncState } from '../data/provider';

const COLORS: Record<SyncState, string> = {
  synced: '#2f9e44',
  pending: '#f08c00',
  error: '#e03131',
};

const LABELS: Record<SyncState, string> = {
  synced: 'Synchronisé',
  pending: 'Synchronisation en attente',
  error: 'Erreur de synchronisation',
};

/** Point de l'en-tête (specs techniques 6.5) : jamais de bandeau, jamais bloquant. */
export function SyncDot() {
  const state = useSyncState();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={LABELS[state]}
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 16,
        backgroundColor: COLORS[state],
      }}
    />
  );
}
