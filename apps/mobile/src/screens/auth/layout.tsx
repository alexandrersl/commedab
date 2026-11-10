import { router } from 'expo-router';
import { CaretLeft, EnvelopeSimple } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PROVIDERS, signInWithProvider, type AuthFailure, type Provider } from '../../auth/actions';
import { AppleLogo, CommedabMark, GoogleLogo } from '../../components/brand-logos';
import { Glyph } from '../../components/icons';
import { Pressable } from '../../components/pressable';
import { Screen } from '../../components/screen';
import { Text } from '../../components/text';
import { useTheme, size } from '../../theme';

/**
 * Écran du compte (planches Connexion, Inscription, Mot de passe) : titre en Fraunces, phrase
 * d'accompagnement, contenu, et un pied collé en bas. `onBack` ajoute la flèche de retour.
 */
export function AuthLayout({
  title,
  hero = false,
  lead,
  onBack,
  children,
  footer,
}: {
  title: string;
  /** Le nom de l'app, plus grand, à côté de son signe. */
  hero?: boolean;
  lead?: ReactNode;
  onBack?: (() => void) | undefined;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Screen footer={footer} edges={['top', 'bottom']}>
      <View className={`gap-2 ${onBack === undefined ? 'pt-8 mt-8' : 'pt-6'}`}>
        {onBack !== undefined && (
          <Pressable
            small
            onPress={onBack}
            accessibilityLabel="Retour"
            className="min-h-control-sm justify-center self-start pb-4"
          >
            <Glyph icon={CaretLeft} />
          </Pressable>
        )}
        {hero ? (
          <View className="flex-row items-center gap-3">
            <CommedabMark />
            <Text variant="title-hero" accessibilityRole="header">
              {title}
            </Text>
          </View>
        ) : (
          <Text variant="title-screen" accessibilityRole="header">
            {title}
          </Text>
        )}
        {lead !== undefined && (
          <Text variant="sentence" tone="muted">
            {lead}
          </Text>
        )}
      </View>
      <View className="gap-3 pt-4">{children}</View>
    </Screen>
  );
}

/** Mot en gras dans une phrase d'accompagnement : l'adresse e-mail. */
export function Strong({ children }: { children: ReactNode }) {
  return (
    <Text variant="sentence" className="font-Fraunces_600SemiBold">
      {children}
    </Text>
  );
}

/** Enveloppe des écrans qui attendent un e-mail. */
export function MailIcon() {
  return (
    <View className="items-center py-6">
      <Glyph icon={EnvelopeSimple} color="action" size={size['icon-lg']} />
    </View>
  );
}

/**
 * Grand bouton capsule des écrans du compte : fournisseurs (bordure `line-strong`, texte
 * `ink`), renvois et retours (bordure et texte `action`).
 */
export function CapsuleButton({
  label,
  onPress,
  icon,
  tone = 'ink',
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  tone?: 'ink' | 'action';
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      feedback="scale"
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`min-h-control-lg flex-row items-center justify-center gap-2 rounded-pill border-thin bg-surface px-4 ${
        tone === 'action' ? 'border-action' : 'border-line-strong'
      }`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors[tone === 'action' ? 'action' : 'ink']} />
      ) : (
        icon
      )}
      <Text variant="button" tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
}

const PROVIDER_LABELS: Record<Provider, { label: string; icon: ReactNode }> = {
  google: { label: 'Continuer avec Google', icon: <GoogleLogo /> },
  apple: { label: 'Continuer avec Apple', icon: <AppleLogo /> },
};

/**
 * « ou », puis Google et Apple, dans cet ordre ; Apple en natif seulement (EF-5.8).
 * `onBusy` verrouille le reste de l'écran pendant l'aller-retour.
 */
export function ProviderButtons({
  disabled,
  onBusy,
  onFailure,
}: {
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  onFailure: (failure: AuthFailure) => void;
}) {
  const [running, setRunning] = useState<Provider | null>(null);
  const run = async (provider: Provider) => {
    setRunning(provider);
    onBusy(true);
    onFailure(null);
    const failure = await signInWithProvider(provider);
    setRunning(null);
    onBusy(false);
    onFailure(failure);
  };
  return (
    <>
      <Text variant="body-sm" tone="muted" className="text-center">
        ou
      </Text>
      {PROVIDERS.map((provider) => (
        <CapsuleButton
          key={provider}
          label={PROVIDER_LABELS[provider].label}
          icon={PROVIDER_LABELS[provider].icon}
          loading={running === provider}
          disabled={disabled && running !== provider}
          onPress={() => void run(provider)}
        />
      ))}
    </>
  );
}

/** Pied « Pas encore de compte ? Créer un compte ». */
export function FooterLink({
  question,
  label,
  href,
}: {
  question: string;
  label: string;
  href: '/sign-in' | '/sign-up';
}) {
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-2">
      <Text variant="body-sm" tone="muted">
        {question}
      </Text>
      <Pressable
        small
        onPress={() => router.replace(href)}
        className="min-h-control-sm justify-center"
      >
        <Text variant="button-sm" tone="action">
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

/** Lecture d'un paramètre de route qui peut arriver en tableau. */
export function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}
