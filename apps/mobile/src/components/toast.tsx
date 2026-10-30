import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '../theme';
import { Pressable } from './pressable';
import { Text } from './text';

export interface ToastMessage {
  message: string;
  /** Erreur d'écriture : fond `alert-soft`, action « Réessayer » obligatoire. */
  error?: boolean;
  action?: { label: string; onPress: () => void } | undefined;
}

const SHORT_MS = 4000;
const WITH_ACTION_MS = 8000;

/**
 * Message bref en bas d'écran (components.md, Toast ; EF-6.5), pour ce qui se passe hors de la
 * vue. Sans icône ni titre.
 */
export function Toast({ message, error = false, action }: ToastMessage) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className={`min-h-control-lg flex-row items-center justify-between gap-3 rounded-card px-4 ${
        error ? 'border-thin border-alert bg-alert-soft' : 'bg-ink'
      }`}
    >
      <Text variant="body-sm" tone={error ? 'alert' : 'ground'} className="flex-1">
        {message}
      </Text>
      {action !== undefined && (
        <Pressable small onPress={action.onPress} className="min-h-control-sm justify-center">
          <Text variant="button-sm" tone={error ? 'alert' : 'ground'}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface ToastApi {
  show(toast: ToastMessage): void;
  /** Distance au bas de l'écran : la barre d'onglets la règle tant qu'elle est affichée. */
  setOffset(offset: number): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) throw new Error('useToast hors de ToastProvider');
  return api;
}

/** Un seul message à la fois, le nouveau remplace l'ancien ; 4 s, 8 s avec une action. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { duration } = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<(ToastMessage & { key: number }) | null>(null);
  const [offset, setOffset] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const show = useCallback((toast: ToastMessage) => {
    if (timer.current !== null) clearTimeout(timer.current);
    counter.current += 1;
    const action =
      toast.action === undefined
        ? undefined
        : {
            label: toast.action.label,
            onPress: () => {
              setCurrent(null);
              toast.action?.onPress();
            },
          };
    setCurrent({ ...toast, action, key: counter.current });
    timer.current = setTimeout(
      () => setCurrent(null),
      toast.action === undefined ? SHORT_MS : WITH_ACTION_MS,
    );
  }, []);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const api = useMemo(() => ({ show, setOffset }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {current !== null && (
        <Animated.View
          key={current.key}
          entering={SlideInDown.duration(duration.base)}
          exiting={SlideOutDown.duration(duration.base)}
          pointerEvents="box-none"
          className="absolute left-0 right-0 px-4"
          style={{ bottom: Math.max(offset, insets.bottom) + space['2'] }}
        >
          <Toast message={current.message} error={current.error ?? false} action={current.action} />
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}
