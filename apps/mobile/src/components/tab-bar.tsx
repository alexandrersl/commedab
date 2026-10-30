import { Basket, ChefHat, ListChecks, Sliders, type Icon } from 'phosphor-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from './icons';
import { Pressable } from './pressable';
import { Text } from './text';

export type TabName = 'index' | 'products' | 'recipes' | 'settings';

const TABS: readonly { name: TabName; label: string; icon: Icon }[] = [
  { name: 'index', label: 'Liste', icon: ListChecks },
  { name: 'products', label: 'Produits', icon: Basket },
  { name: 'recipes', label: 'Recettes', icon: ChefHat },
  { name: 'settings', label: 'Réglages', icon: Sliders },
];

/**
 * Les quatre onglets, toujours dans cet ordre (components.md, TabBar) : *fill* pour l'onglet
 * actif, jamais de badge.
 */
export function TabBar({
  active,
  onSelect,
}: {
  active: TabName;
  onSelect: (tab: TabName) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      className="min-h-tab-bar flex-row border-t-thin border-line bg-surface pt-2"
      style={{ paddingBottom: insets.bottom }}
    >
      {TABS.map((tab) => {
        const focused = tab.name === active;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => onSelect(tab.name)}
            className="flex-1 items-center gap-1"
          >
            <Glyph
              icon={tab.icon}
              color={focused ? 'ink' : 'ink-muted'}
              weight={focused ? 'fill' : 'regular'}
            />
            <Text
              variant="tab"
              tone={focused ? 'ink' : 'muted'}
              className={focused ? 'font-Manrope_700Bold' : ''}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
