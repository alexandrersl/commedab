import type { ReactNode } from 'react';
import { Modal, Pressable as RNPressable, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '../theme';
import { SheetHandle, useSheetMotion } from './sheet-motion';
import { Text } from './text';

/**
 * Feuille montant du bas sur un `scrim` (components.md : ConfirmSheet, LineSheet, sélecteurs
 * de SettingField) : poignée, contenu, avec le mouvement commun des feuilles (useSheetMotion).
 * Un tap hors de la feuille la ferme, comme la tirer vers le bas.
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
  const { vars } = useTheme();
  const insets = useSafeAreaInsets();
  const motion = useSheetMotion({ visible, onClose });
  return (
    <Modal
      transparent
      visible={motion.mounted}
      onRequestClose={motion.dismiss}
      animationType="none"
    >
      <GestureHandlerRootView style={[{ flex: 1 }, vars]}>
        <View className="flex-1 justify-end">
          <Animated.View
            className="absolute bottom-0 left-0 right-0 top-0 bg-scrim"
            style={motion.scrim}
          />
          <RNPressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            className="absolute bottom-0 left-0 right-0 top-0"
            onPress={motion.dismiss}
          />
          <GestureDetector gesture={motion.pull}>
            <Animated.View
              className="gap-3 rounded-t-sheet bg-surface px-4"
              style={[{ paddingBottom: insets.bottom + space['6'] }, motion.panel]}
              onLayout={motion.onLayout}
            >
              <SheetHandle />
              {title !== undefined && <Text variant="title-section">{title}</Text>}
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
