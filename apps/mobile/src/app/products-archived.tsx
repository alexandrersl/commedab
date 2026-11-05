import { router } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';
import { Button } from '../components/button';
import { Divider, ListRow, RowGroup } from '../components/list-row';
import { Screen } from '../components/screen';
import { ScreenHeader } from '../components/screen-header';
import { Text } from '../components/text';
import { since } from '../copy/dates';
import { useEngine } from '../data/engine';
import { useData, usePendingIds } from '../data/provider';
import { useWrite } from '../data/use-write';

/** « Tu n'achètes plus » (EF-3.8) : les produits archivés, et « Reprendre » pour chacun. */
export default function ProductsArchived() {
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const pending = usePendingIds();
  const archived = engine.products.filter((product) => product.archivedAt !== null);

  return (
    <Screen>
      <ScreenHeader
        form="modal"
        title="Tu n'achètes plus"
        onBack={() => (router.canGoBack() ? router.back() : router.navigate('/products'))}
      />
      <Text variant="body-sm" tone="muted">
        Ces produits ne sont plus suggérés. Reprends-en un pour qu&apos;il revienne dans tes
        habitudes.
      </Text>
      {archived.length > 0 && (
        <RowGroup>
          {archived.map((product, i) => {
            const last = engine.states.get(product.id)?.lastPurchaseAt ?? null;
            return (
              <Fragment key={product.id}>
                {i > 0 && <Divider />}
                <ListRow
                  checkbox={false}
                  name={product.name}
                  subtitle={
                    last === null ? 'Jamais acheté' : `Dernier achat ${since(last, engine.now)}`
                  }
                  pending={pending.has(product.id)}
                  onPress={() => router.navigate(`/product/${product.id}`)}
                  accessory={
                    <View>
                      <Button
                        variant="outline"
                        label="Reprendre"
                        onPress={() => write(() => data.products.resumeBuying(product.id))}
                      />
                    </View>
                  }
                />
              </Fragment>
            );
          })}
        </RowGroup>
      )}
    </Screen>
  );
}
