/**
 * Où la session Supabase est gardée entre deux lancements (specs techniques 5.2). Sur le web,
 * le `localStorage` du navigateur, comme par défaut ; en natif, `session-storage.native.ts`.
 */
export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const sessionStorage: SessionStorage = {
  getItem: async (key) => globalThis.localStorage.getItem(key),
  setItem: async (key, value) => globalThis.localStorage.setItem(key, value),
  removeItem: async (key) => globalThis.localStorage.removeItem(key),
};
