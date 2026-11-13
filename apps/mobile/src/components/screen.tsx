import { useRef, type ComponentRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardInset } from './keyboard-inset';

/**
 * Cadre d'un écran : fond `ground`, gouttière `space-4` des deux côtés (design-system.md),
 * `scroll` pour un contenu qui défile, `footer` collé en bas. `list` : l'enfant est une
 * `CardList`, qui défile et pose la gouttière elle-même.
 */
export function Screen({
  children,
  scroll = true,
  list = false,
  footer,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  list?: boolean;
  footer?: ReactNode;
  edges?: ('top' | 'bottom')[];
}) {
  const body = list ? (
    children
  ) : scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-3 px-4 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 gap-3 px-4">{children}</View>
  );
  // Un pied collé en bas (lien du compte) remonte au-dessus du clavier.
  const frame = useRef<ComponentRef<typeof View>>(null);
  const keyboard = useKeyboardInset(frame);
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-ground">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          ref={frame}
          className="flex-1"
          style={footer === undefined ? undefined : { paddingBottom: keyboard }}
        >
          {body}
          {footer !== undefined && <View className="px-4 pb-3 pt-2">{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
