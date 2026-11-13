import { router } from 'expo-router';
import { ListChecks } from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/button';
import { CardList, type CardEntry, type CardListRef } from '../../components/card-list';
import { LineSheet } from '../../components/line-sheet';
import { ListRow, SectionHeader } from '../../components/list-row';
import { ProgressBar } from '../../components/progress-bar';
import { RecipeChip } from '../../components/recipe-chip';
import { ScreenHeader } from '../../components/screen-header';
import { EmptyState, OfflineBanner, Skeleton, SkeletonRows } from '../../components/states';
import { stepHaptic } from '../../components/add-control';
import { packsLabel } from '../../copy/words';
import { useEngine } from '../../data/engine';
import { useData, usePendingIds, useSyncStatus } from '../../data/provider';
import { InstallHint } from '../../pwa/install-hint';
import { useWrite } from '../../data/use-write';
import { tokens } from '../../theme';
import { AddPanel } from '../../screens/list/add-panel';
import { groupLines, type LineGroup, type ShownLine } from '../../screens/list/groups';

const SETTLE_MS = Number.parseFloat(tokens.duration.slow) * 8;

type Entry = { kind: 'section'; group: LineGroup } | { kind: 'line'; line: ShownLine };

/**
 * La Liste, écran d'accueil (EF-1.1 à EF-1.12) : une carte par rayon, toujours cochable, sans
 * confirmation ni message après un geste. En bas, le champ qui ouvre le panneau Ajouter.
 */
export default function ListScreen() {
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const pending = usePendingIds();
  const { online, synced, failure } = useSyncStatus();
  const [panel, setPanel] = useState(false);
  const [held, setHeld] = useState<ShownLine | null>(null);
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(new Map());
  const scroll = useRef<CardListRef<Entry>>(null);
  const headerHeight = useRef(0);

  const groups = useMemo(() => groupLines(engine), [engine]);
  const total = groups.reduce((n, g) => n + g.lines.length, 0);
  const checked = groups.reduce((n, g) => n + g.lines.filter((l) => l.checked).length, 0);
  const loading = engine.loading || (!synced && engine.products.length === 0);
  const entries = useMemo(
    () =>
      groups.flatMap((group, index): CardEntry<Entry>[] => [
        {
          key: `section-${group.category?.id ?? 'none'}`,
          type: 'section',
          card: true,
          opens: index > 0,
          item: { kind: 'section', group },
        },
        ...group.lines.map((line, i): CardEntry<Entry> => ({
          key: line.line.id,
          type: 'line',
          card: true,
          item: { kind: 'line', line },
        })),
      ]),
    [groups],
  );

  // La coche répond au tap sans attendre l'écriture : `toggled` porte l'état tapé jusqu'à ce
  // que la base le rende, ou y renonce après `SETTLE_MS` (écriture refusée).
  const isChecked = (item: ShownLine) => toggled.get(item.line.id) ?? item.checked;
  const toggle = (item: ShownLine) => {
    stepHaptic();
    const id = item.line.id;
    const next = !isChecked(item);
    setToggled((map) => new Map(map).set(id, next));
    setTimeout(() => {
      setToggled((map) => {
        if (!map.has(id)) return map;
        const rest = new Map(map);
        rest.delete(id);
        return rest;
      });
    }, SETTLE_MS);
    write(() => (next ? data.list.checkLine(id) : data.list.uncheckLine(id)));
  };
  const openPanel = () => {
    // Le haut de la liste sort de l'écran, ses premières lignes restent sous le voile (EF-2.1).
    scroll.current?.scrollToOffset({ offset: headerHeight.current, animated: true });
    setPanel(true);
  };
  const closePanel = () => {
    setPanel(false);
    scroll.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ground">
      <CardList
        listRef={scroll}
        entries={loading || engine.error !== null ? [] : entries}
        header={
          <View
            className="gap-3"
            onLayout={(event) => {
              headerHeight.current = event.nativeEvent.layout.height;
            }}
          >
            <View>
              <ScreenHeader title="Ma liste" meta={loading ? '…' : `${checked} sur ${total}`} />
              <ProgressBar value={total === 0 ? 0 : checked / total} indeterminate={loading} />
            </View>
            {loading ? (
              <View className="flex-row gap-2">
                <Skeleton width="third" tall />
                <Skeleton width="third" tall />
              </View>
            ) : (
              engine.view.recipes.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2"
                >
                  {engine.view.recipes.map((badge) => {
                    const recipe = engine.recipeById.get(badge.listRecipe.recipeId);
                    if (recipe === undefined) return null;
                    return (
                      <RecipeChip
                        key={badge.listRecipe.id}
                        name={recipe.name}
                        times={badge.listRecipe.times}
                        checked={badge.checked}
                        total={badge.total}
                        complete={badge.full}
                        onPress={() => router.push(`/recipe/${recipe.id}`)}
                      />
                    );
                  })}
                </ScrollView>
              )
            )}
            {!online && (
              <OfflineBanner text="Hors ligne · tes modifications seront envoyées plus tard" />
            )}
            <InstallHint />
          </View>
        }
        footer={
          loading && failure !== null ? (
            // Rien à montrer tant que la base ne s'ouvre pas ou que la première synchro échoue :
            // le message technique dit pourquoi, en l'absence de console sur iPhone. Sur le web,
            // recharger la page repart d'une synchro neuve.
            <EmptyState
              title="Impossible de charger ta liste"
              body={`Tes données ne s'ouvrent pas sur cet appareil. Détail : ${failure}`}
              action={{
                label: 'Réessayer',
                onPress: Platform.OS === 'web' ? () => globalThis.location.reload() : engine.retry,
              }}
            />
          ) : loading ? (
            <SkeletonRows count={5} />
          ) : engine.error !== null ? (
            <EmptyState
              title="Impossible de charger ta liste"
              body="Ça ne devrait pas arriver. Réessaie, et si ça continue, dis-le nous depuis les Réglages."
              action={{ label: 'Réessayer', onPress: engine.retry }}
            />
          ) : total === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Rien sur ta liste"
              body="Ajoute un produit, ou laisse-moi te proposer ce qui manque d'habitude."
            />
          ) : null
        }
        render={(entry) =>
          entry.kind === 'section' ? (
            <SectionHeader
              name={entry.group.category?.name ?? 'À classer'}
              categoryKey={entry.group.category?.key ?? null}
            />
          ) : (
            <>
              <ListRow
                name={entry.line.product.name}
                subtitle={entry.line.subtitle}
                quantityLabel={packsLabel(entry.line.product, entry.line.line.quantity)}
                checked={isChecked(entry.line)}
                highlight={held?.line.id === entry.line.line.id}
                pending={pending.has(entry.line.line.id)}
                onPress={() => toggle(entry.line)}
                onLongPress={() => setHeld(entry.line)}
                onRemove={() => write(() => data.list.removeLine(entry.line.line.id))}
              />
            </>
          )
        }
      />

      <View className="px-4 pb-3 pt-2">
        <Button
          label="Ajouter un produit ou une recette"
          align="start"
          badge={engine.suggestions.length}
          disabled={loading}
          onPress={openPanel}
        />
      </View>

      {panel && <AddPanel onClose={closePanel} />}

      {held !== null && (
        <LineSheet
          visible
          name={held.product.name}
          subtitle={held.subtitle?.split(' · ')[0]}
          quantity={held.line.quantity}
          quantityLabel={packsLabel(held.product, held.line.quantity)}
          onQuantity={(next) => {
            write(() => data.list.setLineQuantity(held.line.id, next));
            if (next === 0) setHeld(null);
            else setHeld({ ...held, line: { ...held.line, quantity: next } });
          }}
          onOpenProduct={() => {
            setHeld(null);
            router.push(`/product/${held.product.id}`);
          }}
          onRemove={() => {
            write(() => data.list.removeLine(held.line.id));
            setHeld(null);
          }}
          onClose={() => setHeld(null)}
        />
      )}
    </SafeAreaView>
  );
}
