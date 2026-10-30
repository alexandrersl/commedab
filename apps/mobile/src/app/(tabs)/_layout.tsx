import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { TabBar, type TabName } from '../../components/tab-bar';
import { useToast } from '../../components/toast';
import { size } from '../../theme';

/** Quatre onglets, la Liste par défaut (specs techniques 6.3). */
export default function TabsLayout() {
  const toast = useToast();
  useEffect(() => {
    toast.setOffset(size['tab-bar']);
    return () => toast.setOffset(0);
  }, [toast]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          active={(state.routes[state.index]?.name ?? 'index') as TabName}
          onSelect={(name) => {
            const route = state.routes.find((r) => r.name === name);
            if (route !== undefined) navigateToTab(route.key);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Ma liste' }} />
      <Tabs.Screen name="products" options={{ title: 'Produits' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recettes' }} />
      <Tabs.Screen name="settings" options={{ title: 'Réglages' }} />
    </Tabs>
  );
}
