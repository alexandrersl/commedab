import * as SecureStore from 'expo-secure-store';
import type { SessionStorage } from './session-storage';

// Le trousseau limite la taille d'une valeur (2 Ko sur certains Android) et une session, jetons
// compris, la dépasse : elle est découpée en morceaux, `<clé>.n` en donnant le nombre.
const CHUNK = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function chunkCount(key: string): Promise<number> {
  return Number((await SecureStore.getItemAsync(`${key}.n`, OPTIONS)) ?? 0);
}

async function remove(key: string): Promise<void> {
  const count = await chunkCount(key);
  for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
  await SecureStore.deleteItemAsync(`${key}.n`, OPTIONS);
}

/** Session dans le trousseau de l'appareil (Keychain, Keystore), jamais en clair sur le disque. */
export const sessionStorage: SessionStorage = {
  async getItem(key) {
    const count = await chunkCount(key);
    if (count === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`, OPTIONS);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key, value) {
    await remove(key);
    const count = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK, (i + 1) * CHUNK),
        OPTIONS,
      );
    }
    await SecureStore.setItemAsync(`${key}.n`, String(count), OPTIONS);
  },
  removeItem: remove,
};
