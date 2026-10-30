import { Stack } from 'expo-router';
import { Basket } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { AddControl, Stepper } from '../components/add-control';
import { Button } from '../components/button';
import { ConfirmSheet } from '../components/confirm-sheet';
import { Estimate } from '../components/estimate';
import { CategoryIcon } from '../components/icons';
import { LineSheet } from '../components/line-sheet';
import { Divider, ListRow, RowGroup, SectionHeader } from '../components/list-row';
import { Badge, Pill } from '../components/pill';
import { ProgressBar } from '../components/progress-bar';
import { RecipeCard, RecipeCardSkeleton } from '../components/recipe-card';
import { RecipeChip } from '../components/recipe-chip';
import { ScreenHeader } from '../components/screen-header';
import { SearchField } from '../components/search-field';
import { OptionSheet, Segmented, SettingField } from '../components/setting-field';
import { EmptyState, OfflineBanner, SkeletonRows } from '../components/states';
import { SuggestionRow } from '../components/suggestion-row';
import { TabBar, type TabName } from '../components/tab-bar';
import { Text } from '../components/text';
import { TextInput } from '../components/text-input';
import { Toast } from '../components/toast';
import { Toggle } from '../components/toggle';
import { ThemeRoot, type Scheme } from '../theme';

const CATEGORIES = [
  null,
  'hygiene-beaute',
  'bebe-animaux',
  'entretien-maison',
  'fruits-legumes',
  'boulangerie',
  'epicerie-salee',
  'epicerie-sucree',
  'boissons',
  'cremerie',
  'viande-poisson-traiteur',
  'surgeles',
];

function Entry({ name, children }: { name: string; children: ReactNode }) {
  return (
    <View className="gap-3 border-t-thin border-line py-4">
      <Text variant="label" tone="muted" className="uppercase">
        {name}
      </Text>
      {children}
    </View>
  );
}

/** Chaque composant de `components.md` dans ses états, avec les textes de la Voix. */
function Samples({ scheme }: { scheme: Scheme }) {
  const [quantity, setQuantity] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [toggle, setToggle] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [search, setSearch] = useState('');
  const [contents, setContents] = useState('1');
  const [sheet, setSheet] = useState<'confirm' | 'line' | 'options' | null>(null);
  const [unit, setUnit] = useState('bouteille');
  const [tab, setTab] = useState<TabName>('index');

  return (
    <View className="gap-1 px-4 pb-8">
      <ScreenHeader title={scheme === 'light' ? 'Clair' : 'Sombre'} meta="2 sur 12" />

      <Entry name="AddControl">
        <View className="flex-row flex-wrap items-center gap-3">
          <AddControl
            quantity={quantity}
            suggested={2}
            addLabel="Ajouter 2"
            onChange={(n) => setQuantity(n === 0 ? null : n)}
          />
          <AddControl quantity={1} onChange={() => {}} quantityLabel={(n) => `${n} pack`} />
          <AddControl quantity={null} addLabel="Ajouter 1 pack (6)" onChange={() => {}} pending />
          <AddControl quantity={null} onChange={() => {}} disabled />
          <Stepper field value={6} min={1} onChange={() => {}} />
        </View>
      </Entry>

      <Entry name="Button">
        <Button
          label="Ajouter un produit ou une recette"
          badge={3}
          align="start"
          onPress={() => {}}
        />
        <Button label="Se connecter" loading onPress={() => {}} />
        <View className="flex-row flex-wrap items-center gap-4">
          <Button variant="outline" label="Reprendre" onPress={() => {}} />
          <Button variant="text" label="Modifier" onPress={() => {}} />
          <Button variant="text" tone="alert" label="Je n'en achète plus" onPress={() => {}} />
          <Button variant="outline" label="Ajouter" disabled onPress={() => {}} />
        </View>
        <Button variant="alert" label="Supprimer mon compte" onPress={() => {}} />
      </Entry>

      <Entry name="ConfirmSheet · LineSheet · OptionSheet">
        <View className="flex-row flex-wrap gap-3">
          <Button variant="outline" label="Confirmer" onPress={() => setSheet('confirm')} />
          <Button variant="outline" label="Appui long" onPress={() => setSheet('line')} />
          <Button variant="outline" label="Unité" onPress={() => setSheet('options')} />
        </View>
        <ConfirmSheet
          visible={sheet === 'confirm'}
          question="Supprimer Carbonara ?"
          consequence="Les lignes déjà sur ta liste y restent, sans le nom de la recette."
          confirmLabel="Supprimer la recette"
          onConfirm={() => setSheet(null)}
          onCancel={() => setSheet(null)}
        />
        <LineSheet
          visible={sheet === 'line'}
          name="Pâtes"
          subtitle="Carbonara"
          quantity={2}
          onQuantity={() => {}}
          onOpenProduct={() => setSheet(null)}
          onRemove={() => setSheet(null)}
          onClose={() => setSheet(null)}
        />
        <OptionSheet
          visible={sheet === 'options'}
          title="Unité"
          options={['pièce', 'bouteille', 'paquet', 'pot', 'g', 'kg', 'cl', 'L'].map((u) => ({
            value: u,
            label: u,
          }))}
          selected={unit}
          onSelect={setUnit}
          onClose={() => setSheet(null)}
        />
      </Entry>

      <Entry name="Estimate">
        <Estimate
          parts={[
            { text: "Il t'en reste environ " },
            { text: '2 bouteilles', emphasis: 'action' },
            { text: ", de quoi tenir jusqu'à mardi." },
          ]}
        />
        <Estimate
          parts={[
            { text: 'Probablement fini', emphasis: 'alert' },
            { text: ' : le dernier pack date de 3 semaines.' },
          ]}
        />
        <Estimate
          muted
          parts={[{ text: "Je ne sais pas encore : dis-moi quand tu en reprends, j'apprendrai." }]}
        />
        <Estimate short parts={[{ text: 'Plus rien depuis 3 semaines', emphasis: 'alert' }]} />
      </Entry>

      <Entry name="Icons">
        <View className="flex-row flex-wrap gap-3">
          {CATEGORIES.map((key) => (
            <CategoryIcon key={key ?? 'none'} categoryKey={key} color="ink" />
          ))}
        </View>
      </Entry>

      <Entry name="ListRow">
        <RowGroup>
          <SectionHeader name="À classer" categoryKey={null} />
          <ListRow
            name="Cacao"
            quantityLabel="1"
            checked={checked}
            onPress={() => setChecked(!checked)}
            onRemove={() => {}}
          />
          <Divider />
          <ListRow name="Pâtes" subtitle="Carbonara" quantityLabel="2" highlight />
          <Divider />
          <ListRow name="Lait" quantityLabel="1 pack" pending />
          <SectionHeader name="Viande, poisson, traiteur" categoryKey="viande-poisson-traiteur" />
          <ListRow name="Lardons" subtitle="Carbonara · 200 g" quantityLabel="1" checked />
        </RowGroup>
      </Entry>

      <Entry name="Pill · Badge">
        <View className="flex-row flex-wrap gap-2">
          <Pill kind="missing" label="Lardons 200 g" />
          <Pill kind="owned" label="Pâtes" />
          <Pill kind="choice" label="Pièce" selected />
          <Pill kind="choice" label="kg" />
          <Badge value="NEW" tone="alert" />
        </View>
      </Entry>

      <Entry name="ProgressBar">
        <ProgressBar value={2 / 12} />
        <ProgressBar value={1} />
        <ProgressBar value={0} indeterminate />
      </Entry>

      <Entry name="RecipeCard">
        <RecipeCard
          name="Carbonara"
          subtitle="5 ingrédients · il te manque 2"
          ingredients={[
            { label: 'Pâtes', missing: false },
            { label: 'Lardons 200 g', missing: true },
            { label: 'Crème 20 cl', missing: true },
            { label: 'Œufs', missing: false },
          ]}
          control={<AddControl quantity={null} onChange={() => {}} />}
          onPress={() => {}}
        />
        <RecipeCard
          name="Crêpes"
          subtitle="Tu as tout ce qu'il faut"
          complete
          ingredients={[]}
          control={<AddControl quantity={2} onChange={() => {}} />}
          onPress={() => {}}
        />
        <RecipeCardSkeleton />
      </Entry>

      <Entry name="RecipeChip">
        <View className="flex-row flex-wrap gap-2">
          <RecipeChip
            name="Carbonara"
            times={1}
            checked={1}
            total={2}
            complete={false}
            onPress={() => {}}
          />
          <RecipeChip
            name="Chili"
            times={2}
            checked={0}
            total={4}
            complete={false}
            onPress={() => {}}
          />
          <RecipeChip name="Crêpes" times={1} checked={3} total={3} complete onPress={() => {}} />
        </View>
      </Entry>

      <Entry name="ScreenHeader">
        <ScreenHeader
          form="sheet"
          title="Lait"
          meta="Crémerie · bouteille de 1 L"
          onBack={() => {}}
          actions={[{ label: "Je n'en achète plus", tone: 'alert', onPress: () => {} }]}
        />
        <ScreenHeader
          form="centered"
          title="Nouvelle recette"
          leftAction={{ label: 'Annuler', onPress: () => {} }}
          actions={[{ label: 'Enregistrer', onPress: () => {} }]}
        />
      </Entry>

      <Entry name="SearchField">
        <SearchField value={search} onChange={setSearch} onClose={() => setSearch('')} />
        <SearchField value="carb" onChange={() => {}} loading />
      </Entry>

      <Entry name="SettingField">
        <RowGroup>
          <SettingField
            label="Tu en prends"
            field={{ kind: 'select', hint: 'appris', value: '5 / semaine', onPress: () => {} }}
          />
          <Divider />
          <SettingField
            label="Unité"
            field={{ kind: 'select', value: 'Bouteille', onPress: () => setSheet('options') }}
          />
          <Divider />
          <SettingField
            label="Contenance"
            field={{
              kind: 'number',
              value: contents,
              onChangeText: setContents,
              onCommit: () => {},
              unit: { value: 'L', onPress: () => {} },
            }}
          />
          <Divider />
          <SettingField
            label="Contenance"
            error="Un chiffre"
            field={{ kind: 'number', value: 'abc', onChangeText: () => {}, onCommit: () => {} }}
          />
          <Divider />
          <SettingField
            label="Acheté par packs de"
            field={{ kind: 'stepper', value: 6, onChange: () => {} }}
          />
          <Divider />
          <SettingField
            label="Tu en prends"
            field={{
              kind: 'select',
              hint: 'déclaré',
              value: '4 / semaine',
              loading: true,
              onPress: () => {},
            }}
          />
          <Divider />
          <SettingField
            label="Rayon"
            disabled
            field={{ kind: 'select', value: 'Crémerie', onPress: () => {} }}
          />
        </RowGroup>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'day', label: 'par jour' },
            { value: 'week', label: 'par semaine' },
            { value: 'month', label: 'par mois' },
          ]}
        />
      </Entry>

      <Entry name="States">
        <SkeletonRows />
        <EmptyState
          icon={Basket}
          title="Pas encore de produit"
          body="Ils apparaîtront ici au fur et à mesure que tu les ajoutes à ta liste. Je retiendrai tes habitudes."
          action={{ label: 'Ajouter à la liste', onPress: () => {} }}
        />
        <EmptyState
          title="Impossible de charger tes produits"
          body="Ça ne devrait pas arriver. Réessaie, et si ça continue, dis-le nous depuis les Réglages."
          action={{ label: 'Réessayer', onPress: () => {} }}
        />
        <OfflineBanner text="Hors ligne · tes modifications seront envoyées plus tard" />
      </Entry>

      <Entry name="SuggestionRow">
        <RowGroup>
          <SuggestionRow
            name="Lait"
            reason="Il doit t'en rester 1, de quoi tenir jusqu'à mardi"
            suggested={2}
            quantity={null}
            onChange={() => {}}
          />
          <Divider />
          <SuggestionRow
            name="Café"
            reason="D'habitude tu en reprends tous les 12 jours, ça fait 11"
            suggested={1}
            quantity={1}
            onChange={() => {}}
          />
        </RowGroup>
      </Entry>

      <Entry name="TabBar">
        <TabBar active={tab} onSelect={setTab} />
      </Entry>

      <Entry name="TextInput">
        <TextInput label="E-mail" placeholder="ton@adresse.fr" />
        <TextInput
          label="Mot de passe"
          value="••••••••"
          error="E-mail ou mot de passe incorrect"
          help={{ label: 'Mot de passe oublié ?', onPress: () => {} }}
        />
        <TextInput
          label="Notes"
          multiline
          placeholder="Un tour de main, une variante, ce que tu veux…"
        />
      </Entry>

      <Entry name="Toast">
        <Toast message="2 produits ajoutés à la liste" />
        <Toast message="Pas enregistré" error action={{ label: 'Réessayer', onPress: () => {} }} />
      </Entry>

      <Entry name="Toggle">
        <RowGroup>
          <Toggle
            label="Aider à améliorer le catalogue"
            caption="Noms de produits partagés, anonymes et agrégés"
            value={toggle}
            onChange={setToggle}
          />
          <Divider />
          <Toggle
            label="Aider à améliorer le catalogue"
            value={false}
            onChange={() => {}}
            disabled
          />
        </RowGroup>
      </Entry>
    </View>
  );
}

/** Galerie interne des composants, en clair puis en sombre (specs techniques 11.3). */
export default function Gallery() {
  return (
    <ScrollView className="flex-1 bg-ground">
      <Stack.Screen options={{ title: 'Galerie' }} />
      {(['light', 'dark'] as const).map((scheme) => (
        <ThemeRoot key={scheme} scheme={scheme}>
          <Samples scheme={scheme} />
        </ThemeRoot>
      ))}
    </ScrollView>
  );
}
