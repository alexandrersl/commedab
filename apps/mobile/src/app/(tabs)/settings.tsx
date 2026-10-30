import Constants from 'expo-constants';
import { router } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { signOut } from '../../auth/actions';
import { useSession } from '../../auth/session';
import { ConfirmSheet } from '../../components/confirm-sheet';
import { Glyph } from '../../components/icons';
import { Divider, RowGroup } from '../../components/list-row';
import { Pressable } from '../../components/pressable';
import { Screen } from '../../components/screen';
import { ScreenHeader } from '../../components/screen-header';
import { OfflineBanner } from '../../components/states';
import { Text } from '../../components/text';
import { useToast } from '../../components/toast';
import { Toggle } from '../../components/toggle';
import { useData, useSyncStatus } from '../../data/provider';
import { useWatch } from '../../data/use-watch';
import { useWrite } from '../../data/use-write';
import { useTheme, opacity } from '../../theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2 pt-2">
      <Text variant="title-section">{title}</Text>
      <RowGroup>{children}</RowGroup>
    </View>
  );
}

function Row({
  label,
  value,
  action,
  tone = 'ink',
  onPress,
  disabled = false,
  loading = false,
  chevron = false,
}: {
  label: string;
  value?: string;
  action?: string;
  tone?: 'ink' | 'action' | 'alert';
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  chevron?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || onPress === undefined}
      accessibilityLabel={action === undefined ? label : `${action} ${label}`}
      className="min-h-row flex-row items-center justify-between gap-3 px-4"
      style={disabled ? { opacity: opacity.disabled } : undefined}
    >
      <Text variant={tone === 'action' ? 'button' : 'body'} tone={tone}>
        {label}
      </Text>
      <View className="flex-row items-center gap-3">
        {value !== undefined && (
          <Text variant="caption" tone="muted">
            {value}
          </Text>
        )}
        {action !== undefined && (
          <Text variant="button" tone="action">
            {action}
          </Text>
        )}
        {loading && <ActivityIndicator size="small" color={colors.action} />}
        {chevron && <Glyph icon={CaretRight} color="ink-muted" />}
      </View>
    </Pressable>
  );
}

/**
 * Réglages (EF-5.1 à EF-5.7) : rayons, compte, données, version. Hors ligne, le compte et les
 * données attendent le réseau (EF-6.3).
 */
export default function Settings() {
  const { session, beginRecovery } = useSession();
  const data = useData();
  const write = useWrite();
  const toast = useToast();
  const { online } = useSyncStatus();
  const settings = useWatch(data.account.watch);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const offline = !online;

  const exportData = async () => {
    setExporting(true);
    try {
      await data.account.requestExport();
      toast.show({ message: 'Export en cours, tu recevras un e-mail' });
    } catch {
      toast.show({
        message: 'Export impossible',
        error: true,
        action: { label: 'Réessayer', onPress: () => void exportData() },
      });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await data.account.deleteAccount();
      await signOut();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
      toast.show({
        message: 'Compte non supprimé',
        error: true,
        action: { label: 'Réessayer', onPress: () => setConfirmDelete(true) },
      });
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Réglages" />
      {offline && (
        <OfflineBanner text="Hors ligne · le compte et les données attendent le réseau" />
      )}

      <Section title="Rayons">
        <Row
          label="Ordre des rayons en magasin"
          chevron
          onPress={() => router.push('/categories')}
        />
      </Section>

      <Section title="Compte">
        <Row label="E-mail" value={session?.user.email ?? ''} disabled={offline} />
        <Divider />
        <Row
          label="Mot de passe"
          action="Modifier"
          disabled={offline}
          onPress={() => beginRecovery('settings')}
        />
        <Divider />
        <Row
          label="Se déconnecter"
          tone="action"
          disabled={offline}
          onPress={() => void signOut()}
        />
      </Section>

      <Section title="Mes données">
        <Toggle
          label="Aider à améliorer le catalogue"
          caption="Noms de produits partagés, anonymes et agrégés"
          value={settings?.catalogContribution ?? true}
          disabled={offline || settings === undefined || settings === null}
          onChange={(enabled) => write(() => data.account.setCatalogContribution(enabled))}
        />
        <Divider />
        <Row
          label="Exporter mes données"
          value="JSON"
          disabled={offline || exporting}
          loading={exporting}
          onPress={() => void exportData()}
        />
        <Divider />
        <Row
          label="Supprimer mon compte"
          tone="alert"
          disabled={offline}
          onPress={() => setConfirmDelete(true)}
        />
      </Section>

      <Text variant="caption" tone="muted" className="pt-4 text-center">
        {`Commedab ${Constants.expoConfig?.version ?? ''} · AGPL-3.0`}
      </Text>
      {__DEV__ && (
        <Pressable
          onPress={() => router.push('/gallery')}
          className="min-h-control items-center justify-center"
        >
          <Text variant="caption" tone="action">
            Galerie des composants
          </Text>
        </Pressable>
      )}

      <ConfirmSheet
        visible={confirmDelete}
        question="Supprimer ton compte ?"
        consequence="Tes produits, achats, recettes et ta liste seront effacés. Ce qui a déjà été partagé au catalogue reste anonyme et ne peut pas être retrouvé."
        confirmLabel="Supprimer mon compte"
        loading={deleting}
        onConfirm={() => void deleteAccount()}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
