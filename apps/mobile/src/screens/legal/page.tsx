import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Pressable } from '../../components/pressable';
import { Screen } from '../../components/screen';
import { ScreenHeader } from '../../components/screen-header';
import { Text } from '../../components/text';

export interface LegalLink {
  label: string;
  url: string;
}

export interface LegalSection {
  title: string;
  /** Un paragraphe par chaîne ; une liste de chaînes devient une liste à puces. */
  body: readonly (string | readonly string[])[];
  links?: readonly LegalLink[];
}

/**
 * Page de texte légal (specs techniques 8.4) : politique de confidentialité, mentions légales.
 * Hors des gardes de session : elle s'ouvre connecté ou non, et par son adresse.
 */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: readonly LegalSection[];
}) {
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader form="sheet" title={title} meta={`Mise à jour le ${updated}`} onBack={back} />
      {sections.map((section) => (
        <View key={section.title} className="gap-2 pt-3">
          <Text variant="title-section" accessibilityRole="header">
            {section.title}
          </Text>
          {section.body.map((block, index) =>
            typeof block === 'string' ? (
              <Text key={index}>{block}</Text>
            ) : (
              <View key={index} className="gap-2">
                {block.map((item) => (
                  <View key={item} className="flex-row gap-2">
                    <Text tone="muted">•</Text>
                    <Text className="flex-1">{item}</Text>
                  </View>
                ))}
              </View>
            ),
          )}
          {section.links?.map((link) => (
            <Pressable
              key={link.url}
              small
              accessibilityRole="link"
              onPress={() => void Linking.openURL(link.url)}
              className="min-h-control-sm justify-center self-start"
            >
              <Text variant="button-sm" tone="action">
                {link.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </Screen>
  );
}

/** Liens vers les deux pages, sous les Réglages et sous l'inscription. */
export function LegalLinks() {
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-4">
      <Pressable
        small
        accessibilityRole="link"
        onPress={() => router.push('/privacy')}
        className="min-h-control-sm justify-center"
      >
        <Text variant="caption" tone="action">
          Confidentialité
        </Text>
      </Pressable>
      <Pressable
        small
        accessibilityRole="link"
        onPress={() => router.push('/legal')}
        className="min-h-control-sm justify-center"
      >
        <Text variant="caption" tone="action">
          Mentions légales
        </Text>
      </Pressable>
    </View>
  );
}
