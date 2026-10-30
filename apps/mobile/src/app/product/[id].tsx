import { type RateSource } from '@commedab/core';
import type { PurchaseRecord } from '@commedab/data';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { View } from 'react-native';
import { AddControl } from '../../components/add-control';
import { Estimate } from '../../components/estimate';
import { Divider, RowGroup } from '../../components/list-row';
import { Pressable } from '../../components/pressable';
import { Screen } from '../../components/screen';
import { ScreenHeader } from '../../components/screen-header';
import { OptionSheet, SettingField } from '../../components/setting-field';
import { EmptyState, OfflineBanner, SkeletonRows } from '../../components/states';
import { Text } from '../../components/text';
import { useToast } from '../../components/toast';
import { historyDate } from '../../copy/dates';
import { estimateParts, rateLabel } from '../../copy/estimate';
import {
  addOneLabel,
  capitalize,
  CONTENTS_UNITS,
  displayUnit,
  format,
  packsLabel,
  UNITS,
} from '../../copy/words';
import { useEngine } from '../../data/engine';
import { useData, usePendingIds, useSyncStatus } from '../../data/provider';
import { categoryName, productMeta, purchaseLabel } from '../../screens/products/labels';
import { PurchaseSheet } from '../../screens/products/purchase-sheet';
import { RateSheet } from '../../screens/products/rate-sheet';
import { useWrite } from '../../data/use-write';
import { opacity } from '../../theme';

const RATE_HINTS: Record<RateSource, string> = {
  declared: 'déclaré',
  learned: 'appris',
  catalog: 'habituel',
  none: 'à définir',
};

type OpenSheet = 'category' | 'unit' | 'contents-unit' | 'rate' | null;

/** Quantité saisie : un nombre positif, la virgule acceptée ; null sinon. */
function parseAmount(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Fiche produit (EF-3.2 à EF-3.5) : ce qu'il en reste, le composant d'ajout, les réglages en
 * vrais champs qui s'enregistrent d'eux-mêmes, l'historique des achats.
 */
export default function ProductSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const toast = useToast();
  const pending = usePendingIds();
  const { online } = useSyncStatus();
  const product = engine.productById.get(id ?? '');

  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [name, setName] = useState<string | null>(null);
  const [contents, setContents] = useState<string | null>(null);
  const [contentsError, setContentsError] = useState<string | null>(null);
  const [savingRate, setSavingRate] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseRecord | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/products'));

  if (product === undefined) {
    return (
      <Screen>
        <ScreenHeader form="sheet" title="" onBack={back} />
        {engine.loading ? (
          <SkeletonRows />
        ) : (
          <EmptyState
            title="Ce produit n'existe plus"
            body="Il a peut-être été retiré sur un autre appareil. Retrouve tes produits dans l'onglet Produits."
            action={{ label: 'Voir mes produits', onPress: () => router.navigate('/products') }}
          />
        )}
      </Screen>
    );
  }

  const archived = product.archivedAt !== null;
  const state = engine.states.get(product.id);
  const line = engine.pendingLineOf(product.id);
  const estimate = estimateParts(product, state, engine.now);
  const history = [...engine.purchasesOf(product.id)].reverse();
  const update = (changes: Parameters<typeof data.products.updateProduct>[1]) =>
    write(() => data.products.updateProduct(product.id, changes));

  const commitName = () => {
    if (name === null) return;
    const trimmed = name.trim();
    setName(null);
    if (trimmed !== '' && trimmed !== product.name) void update({ name: trimmed });
  };
  const commitContents = () => {
    if (contents === null) return;
    if (contents.trim() === '') {
      setContents(null);
      setContentsError(null);
      if (product.contentsQty !== null) void update({ contentsQty: null });
      return;
    }
    const value = parseAmount(contents);
    if (value === null) {
      setContentsError('Un chiffre');
      return;
    }
    setContents(null);
    setContentsError(null);
    void update({ contentsQty: value, contentsUnit: product.contentsUnit ?? 'l' });
  };
  const saveRate = (declaredDaysPerUnit: number | null) => {
    setSavingRate(true);
    void update({ declaredDaysPerUnit }).finally(() => setSavingRate(false));
  };
  const deletePurchase = (target: PurchaseRecord) =>
    void write(async () => {
      const deleted = await data.purchases.deletePurchase(target.id);
      if (deleted === null) return;
      toast.show({
        message: 'Achat supprimé',
        action: {
          label: 'Annuler',
          onPress: () => void write(() => data.purchases.restorePurchase(deleted)),
        },
      });
    });

  const control = archived ? null : (
    <View className="gap-2">
      <View
        className="flex-row"
        style={pending.has(line?.id ?? '') ? { opacity: opacity.pending } : undefined}
      >
        <AddControl
          quantity={line?.quantity ?? null}
          addLabel={addOneLabel(product)}
          quantityLabel={(n) => packsLabel(product, n)}
          onChange={(next) =>
            void write(() =>
              line === undefined
                ? data.list.addProduct(product.id, next)
                : data.list.setLineQuantity(line.id, next),
            )
          }
        />
      </View>
      {line !== undefined && (
        <Text variant="caption" tone="muted">
          {product.packSize > 1
            ? `Sur la liste · 1 pack de ${format(product.packSize)}`
            : 'Sur la liste'}
        </Text>
      )}
    </View>
  );

  return (
    <Screen>
      <ScreenHeader
        form="sheet"
        title={product.name}
        meta={productMeta(product, engine.categoryById)}
        onBack={back}
        actions={[
          archived
            ? {
                label: 'Reprendre',
                onPress: () => void write(() => data.products.resumeBuying(product.id)),
              }
            : {
                label: "Je n'en achète plus",
                tone: 'alert',
                onPress: () => void write(() => data.products.stopBuying(product.id)),
              },
        ]}
      />
      {!online && <OfflineBanner text="Hors ligne · tes modifications seront envoyées plus tard" />}

      <View className="gap-3 rounded-card border-thin border-line bg-surface p-4">
        <Estimate parts={estimate.parts} muted={estimate.muted} />
        {control}
      </View>

      <Text variant="title-section" className="pt-3">
        Réglages
      </Text>
      <RowGroup>
        <SettingField
          label="Nom"
          disabled={archived}
          field={{
            kind: 'text',
            value: name ?? product.name,
            onChangeText: setName,
            onCommit: commitName,
          }}
        />
        <Divider />
        <SettingField
          label="Rayon"
          disabled={archived}
          field={{
            kind: 'select',
            value: categoryName(product, engine.categoryById),
            onPress: () => setSheet('category'),
          }}
        />
        <Divider />
        <SettingField
          label="Tu en prends"
          disabled={archived}
          field={{
            kind: 'select',
            hint: RATE_HINTS[state?.rate.source ?? 'none'],
            value: rateLabel(state?.rate.perDay ?? 0),
            loading: savingRate,
            onPress: () => setSheet('rate'),
          }}
        />
        <Divider />
        <SettingField
          label="Unité"
          disabled={archived}
          field={{
            kind: 'select',
            value: capitalize(displayUnit(product.unitLabel)),
            onPress: () => setSheet('unit'),
          }}
        />
        <Divider />
        <SettingField
          label="Contenance"
          disabled={archived}
          error={contentsError}
          field={{
            kind: 'number',
            value: contents ?? (product.contentsQty === null ? '' : format(product.contentsQty)),
            onChangeText: (text) => {
              setContents(text);
              setContentsError(null);
            },
            onCommit: commitContents,
            unit: {
              value: displayUnit(product.contentsUnit ?? 'l'),
              onPress: () => setSheet('contents-unit'),
            },
          }}
        />
        <Divider />
        <SettingField
          label="Acheté par packs de"
          disabled={archived}
          field={{
            kind: 'stepper',
            value: product.packSize,
            min: 1,
            onChange: (packSize) => void update({ packSize }),
          }}
        />
      </RowGroup>

      <Text variant="title-section" className="pt-3">
        Historique
      </Text>
      <RowGroup>
        {history.length === 0 ? (
          <View className="min-h-row items-center justify-center px-4">
            <Text variant="body-sm" tone="muted">
              Aucun achat pour l&apos;instant
            </Text>
          </View>
        ) : (
          history.map((entry, i) => (
            <Fragment key={entry.id}>
              {i > 0 && <Divider />}
              <Pressable
                onPress={() => setPurchase(entry)}
                accessibilityLabel={`${historyDate(entry.occurredAt)}, ${purchaseLabel(product, entry.quantity)}`}
                className="min-h-control flex-row items-center justify-between px-4"
                style={pending.has(entry.id) ? { opacity: opacity.pending } : undefined}
              >
                <Text variant="body-sm" tone="muted">
                  {historyDate(entry.occurredAt)}
                </Text>
                <Text variant="body-strong" style={{ fontVariant: ['tabular-nums'] }}>
                  {purchaseLabel(product, entry.quantity)}
                </Text>
              </Pressable>
            </Fragment>
          ))
        )}
      </RowGroup>

      <OptionSheet
        visible={sheet === 'category'}
        title="Rayon"
        options={[
          { value: '', label: 'À classer' },
          ...engine.categories.map((category) => ({ value: category.id, label: category.name })),
        ]}
        selected={product.categoryId ?? ''}
        onSelect={(categoryId) =>
          void update({ categoryId: categoryId === '' ? null : categoryId })
        }
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'unit'}
        title="Unité"
        options={UNITS.map((unit) => ({ value: unit, label: capitalize(displayUnit(unit)) }))}
        selected={product.unitLabel}
        onSelect={(unitLabel) => void update({ unitLabel })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'contents-unit'}
        title="Unité de la contenance"
        options={CONTENTS_UNITS.map((unit) => ({ value: unit, label: displayUnit(unit) }))}
        selected={product.contentsUnit ?? 'l'}
        onSelect={(contentsUnit) => void update({ contentsUnit })}
        onClose={() => setSheet(null)}
      />
      <RateSheet
        visible={sheet === 'rate'}
        state={state}
        onSave={saveRate}
        onClose={() => setSheet(null)}
      />
      <PurchaseSheet
        product={product}
        purchase={archived ? null : purchase}
        onQuantity={(target, quantity) =>
          void write(() => data.purchases.editPurchase(target.id, { quantity }))
        }
        onDelete={deletePurchase}
        onClose={() => setPurchase(null)}
      />
    </Screen>
  );
}
