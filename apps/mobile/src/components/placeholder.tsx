import { StyleSheet, Text, View } from 'react-native';

/** Onglet dont l'écran n'est pas encore construit. */
export function Placeholder({ text }: { text: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { fontSize: 16, color: '#868e96', textAlign: 'center' },
});
