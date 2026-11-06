import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { space, useTheme } from '../theme';
import { Pressable } from './pressable';
import { Text } from './text';

/** Glissement horizontal qui fait d'un appui une traction de la ligne, comme pour un tap. */
const DRAG_SLOP = space['2'];
/** Au-delà de cette part de la largeur, relâcher retire la ligne sans toucher le bouton. */
const FULL_SWIPE = 0.5;

/** La ligne ouverte, refermée dès qu'une autre s'ouvre ou que la liste défile. */
const openRow: { close: (() => void) | null } = { close: null };

/** Referme la ligne ouverte, s'il y en a une : la liste qui défile l'appelle. */
export function closeSwipedRow(): void {
  openRow.close?.();
  openRow.close = null;
}

function claimRow(close: () => void): void {
  if (openRow.close !== null && openRow.close !== close) closeSwipedRow();
}

function holdRow(close: () => void): void {
  openRow.close = close;
}

function releaseRow(close: () => void): void {
  if (openRow.close === close) openRow.close = null;
}

function cran() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Ligne qu'on glisse vers la gauche pour la retirer, comme sur iOS (components.md, ListRow) :
 * un glissement court découvre « Retirer » et la laisse ouverte ; au-delà de la moitié, le
 * rouge prend la ligne, le libellé passe contre son bord avec un cran, et relâcher retire la
 * ligne, qui part à gauche puis se referme. Revenir en deçà avant de relâcher annule. Une
 * seule ligne ouverte à la fois ; un tap sur la ligne ouverte la referme.
 */
export function SwipeRow({
  children,
  label,
  onRemove,
  resetKey,
}: {
  children: ReactNode;
  /** Ce que lit un lecteur d'écran sur le bouton : « Retirer Lait ». */
  label: string;
  onRemove: () => void;
  /** Change avec la ligne affichée : une liste recycle ses vues d'une ligne à l'autre. */
  resetKey: string;
}) {
  const { duration } = useTheme();
  const offset = useSharedValue(0);
  const start = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const rest = useSharedValue(0);
  const armed = useSharedValue(false);
  const armProgress = useSharedValue(0);
  const removing = useSharedValue(false);
  const [open, setOpen] = useState(false);

  const [close] = useState(() => () => {
    offset.set(withTiming(0, { duration: duration.base }));
    setOpen(false);
  });
  // Une liste recycle ses vues : une autre ligne affichée repart fermée.
  const [shownKey, setShownKey] = useState(resetKey);
  if (shownKey !== resetKey) {
    setShownKey(resetKey);
    setOpen(false);
  }

  useEffect(() => {
    offset.set(0);
    armed.set(false);
    armProgress.set(0);
    removing.set(false);
  }, [resetKey, offset, armed, armProgress, removing]);

  const claim = () => claimRow(close);
  const settleOpen = () => {
    holdRow(close);
    setOpen(true);
  };
  const settleClosed = () => {
    releaseRow(close);
    setOpen(false);
  };
  const removed = () => {
    releaseRow(close);
    setOpen(false);
    onRemove();
    // Retirée, la ligne quitte la liste avant ce délai ; encore là (écriture refusée), elle
    // revient en place au lieu de rester repliée.
    setTimeout(() => {
      removing.set(false);
      offset.set(withTiming(0, { duration: duration.base }));
    }, duration.slow * 4);
  };

  /** La ligne part à gauche, puis sa hauteur se referme ; la liste la retire ensuite. */
  const leave = () => {
    'worklet';
    removing.set(true);
    offset.set(
      withTiming(-width.get(), { duration: duration.base }, (done) => {
        if (done !== true) return;
        height.set(
          withTiming(0, { duration: duration.slow }, (collapsed) => {
            if (collapsed === true) scheduleOnRN(removed);
          }),
        );
      }),
    );
  };

  useAnimatedReaction(
    () => armed.get(),
    (now, before) => {
      if (before === null || now === before) return;
      armProgress.set(withTiming(now ? 1 : 0, { duration: duration.fast }));
      if (now) scheduleOnRN(cran);
    },
  );

  const drag = Gesture.Pan()
    .activeOffsetX([-DRAG_SLOP, DRAG_SLOP])
    .failOffsetY([-DRAG_SLOP, DRAG_SLOP])
    .onStart(() => {
      start.set(offset.get());
      scheduleOnRN(claim);
    })
    .onUpdate((event) => {
      const next = Math.max(-width.get(), Math.min(0, start.get() + event.translationX));
      offset.set(next);
      armed.set(-next > width.get() * FULL_SWIPE);
    })
    .onEnd(() => {
      if (armed.get()) {
        leave();
      } else if (-offset.get() > rest.get() / 2) {
        offset.set(withTiming(-rest.get(), { duration: duration.base }));
        scheduleOnRN(settleOpen);
      } else {
        offset.set(withTiming(0, { duration: duration.base }));
        scheduleOnRN(settleClosed);
      }
    });

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  const red = useAnimatedStyle(() => ({ width: Math.max(0, -offset.get()) }));
  // Au repos, le libellé est centré dans la largeur du bouton, à droite ; armé, il suit le bord
  // de la ligne qui part.
  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -armProgress.get() * Math.max(0, -offset.get() - rest.get()) }],
  }));
  // Le style animé n'efface pas une propriété qu'il ne renvoie plus : la hauteur revient à
  // `auto` explicitement quand la ligne reste.
  const collapsing = useAnimatedStyle(() =>
    removing.get()
      ? { height: height.get(), overflow: 'hidden' as const }
      : { height: 'auto' as const, overflow: 'visible' as const },
  );

  return (
    <Animated.View
      style={collapsing}
      onLayout={(event) => {
        width.set(event.nativeEvent.layout.width);
        if (!removing.get()) height.set(event.nativeEvent.layout.height);
      }}
    >
      <Animated.View
        className="absolute bottom-0 right-0 top-0 overflow-hidden bg-alert"
        style={red}
      >
        <Pressable
          onPress={() => leave()}
          accessibilityLabel={label}
          className="absolute bottom-0 right-0 top-0 justify-center px-6"
          onLayout={(event) => {
            rest.set(event.nativeEvent.layout.width);
          }}
        >
          <Animated.View style={labelStyle}>
            <Text variant="button-sm" tone="on-action">
              Retirer
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={drag} touchAction="pan-y">
        <Animated.View style={row}>
          {children}
          {open && (
            <Pressable
              accessibilityLabel="Refermer"
              onPress={() => {
                close();
                settleClosed();
              }}
              className="absolute bottom-0 left-0 right-0 top-0"
            />
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
