import type { ReactNode } from 'react';
import { Modal, Pressable as RNPressable, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '../theme';
import { Text } from './text';

/**
 * Feuille montant du bas sur un `scrim` (components.md : ConfirmSheet, LineSheet, sélecteurs
 * de SettingField) : poignée, contenu ; un tap hors de la feuille la ferme.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string | undefined;
  children: ReactNode;
}) {
  const { duration, vars } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <View style={[{ flex: 1 }, vars]}>
        <Animated.View
          entering={FadeIn.duration(duration.base)}
          className="flex-1 justify-end bg-scrim"
        >
          <RNPressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            className="absolute bottom-0 left-0 right-0 top-0"
            onPress={onClose}
          />
          <Animated.View
            entering={SlideInDown.duration(duration.base)}
            className="gap-3 rounded-t-sheet bg-surface px-4 pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, space['4']) }}
          >
            <View className="items-center pb-1">
              <View className="h-1 w-8 rounded-pill bg-line-strong" />
            </View>
            {title !== undefined && <Text variant="title-section">{title}</Text>}
            {children}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
