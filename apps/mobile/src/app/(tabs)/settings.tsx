import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { signOut } from '../../auth/actions';
import { useSession } from '../../auth/session';
import { Button } from '../../components/form';
import { useData } from '../../data/provider';
import { useWatch } from '../../data/use-watch';

/** Rayons dans leur ordre, compte et version (EF-5.1, EF-5.2, EF-5.7). */
export default function Settings() {
  const { session } = useSession();
  const data = useData();
  const categories = useWatch(data.categories.watch);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Rayons</Text>
      <View style={styles.card}>
        {categories === undefined || categories.length === 0 ? (
          <Text style={styles.muted}>En attente de la première synchronisation…</Text>
        ) : (
          categories.map((category) => (
            <Text key={category.id} style={styles.row}>
              {category.name}
            </Text>
          ))
        )}
      </View>

      <Text style={styles.heading}>Compte</Text>
      <View style={styles.card}>
        <Text style={styles.row}>{session?.user.email}</Text>
        <Button label="Me déconnecter" variant="secondary" onPress={signOut} />
      </View>

      <Text style={styles.footer}>Commedab {Constants.expoConfig?.version} · AGPL-3.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 8, maxWidth: 600, width: '100%', alignSelf: 'center' },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#868e96',
    marginTop: 16,
    textTransform: 'uppercase',
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12 },
  row: { fontSize: 16, color: '#212529' },
  muted: { fontSize: 16, color: '#868e96' },
  footer: { fontSize: 13, color: '#868e96', textAlign: 'center', marginTop: 24 },
});
