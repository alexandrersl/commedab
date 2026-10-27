import { runStorageCheck, type StorageCheckResult } from '@commedab/data';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Écran provisoire de la première tâche (specs techniques 6.4) : vérifie la base locale. */
export default function Home() {
  const [result, setResult] = useState<StorageCheckResult | null>(null);

  useEffect(() => {
    runStorageCheck(new Date()).then(setResult);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Commedab</Text>
      {result === null && <Text>Vérification de la base locale…</Text>}
      {result?.ok === true && (
        <>
          <Text style={styles.ok}>Base locale : écrite, fermée, relue.</Text>
          <Text>Vérifications précédentes : {result.previousChecks}</Text>
          <Text>Dernière : {result.lastCheckAt ?? 'aucune'}</Text>
        </>
      )}
      {result?.ok === false && <Text style={styles.error}>Échec : {result.error}</Text>}
      {result !== null && <Text style={styles.engine}>{result.engine}</Text>}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  title: { fontSize: 24, fontWeight: '600' },
  ok: { color: '#1a7f37' },
  error: { color: '#cf222e' },
  engine: { color: '#666', fontSize: 12 },
});
