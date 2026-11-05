import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { TabBar, type TabName } from '../../components/tab-bar';
import { useToast } from '../../components/toast';
import { size } from '../../theme';

/** L'onglet allumé sous une fiche : celui de l'annuaire d'où elle vient. */
const TAB_OF: Record<string, TabName> = { 'product/[id]': 'products', 'recipe/[id]': 'recipes' };

/**
 * Quatre onglets, la Liste par défaut (specs techniques 6.3). Les fiches produit et recette
 * s'ouvrent dans les onglets, la barre restant visible ; « retour » suit l'historique.
 */
export default function TabsLayout() {
  const toast = useToast();
  useEffect(() => {
    toast.setOffset(size['tab-bar']);
    return () => toast.setOffset(0);
  }, [toast]);

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          active={(() => {
            const name = state.routes[state.index]?.name ?? 'index';
            return TAB_OF[name] ?? (name as TabName);
          })()}
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
      <Tabs.Screen name="product/[id]" />
      <Tabs.Screen name="recipe/[id]" />
    </Tabs>
  );
}
