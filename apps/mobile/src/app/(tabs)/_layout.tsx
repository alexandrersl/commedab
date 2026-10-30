import { Tabs } from 'expo-router/js-tabs';
import { Basket, ChefHat, ListChecks, Sliders, type Icon } from 'phosphor-react-native';
import { useTheme } from '../../theme';

function icon(TabIcon: Icon) {
  return function TabBarIcon({ focused, size }: { focused: boolean; size: number }) {
    const { colors } = useTheme();
    return (
      <TabIcon
        color={focused ? colors.ink : colors['ink-muted']}
        size={size}
        weight={focused ? 'fill' : 'regular'}
      />
    );
  };
}

/** Quatre onglets, la Liste par défaut (specs techniques 6.3). */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors['ink-muted'],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Ma liste', tabBarLabel: 'Liste', tabBarIcon: icon(ListChecks) }}
      />
      <Tabs.Screen name="products" options={{ title: 'Produits', tabBarIcon: icon(Basket) }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recettes', tabBarIcon: icon(ChefHat) }} />
      <Tabs.Screen name="settings" options={{ title: 'Réglages', tabBarIcon: icon(Sliders) }} />
    </Tabs>
  );
}
