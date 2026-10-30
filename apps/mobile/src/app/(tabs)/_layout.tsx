import { Tabs } from 'expo-router/js-tabs';
import { CookingPot, ListChecks, Package, Settings, type LucideIcon } from 'lucide-react-native';
import { SyncDot } from '../../components/sync-dot';

const ACTIVE = '#212529';
const INACTIVE = '#868e96';

function icon(Icon: LucideIcon) {
  return function TabIcon({ focused, size }: { focused: boolean; size: number }) {
    return <Icon color={focused ? ACTIVE : INACTIVE} size={size} />;
  };
}

/** Quatre onglets, la Liste par défaut (specs techniques 6.3). */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <SyncDot />,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Ma liste', tabBarLabel: 'Liste', tabBarIcon: icon(ListChecks) }}
      />
      <Tabs.Screen name="products" options={{ title: 'Produits', tabBarIcon: icon(Package) }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recettes', tabBarIcon: icon(CookingPot) }} />
      <Tabs.Screen name="settings" options={{ title: 'Réglages', tabBarIcon: icon(Settings) }} />
    </Tabs>
  );
}
