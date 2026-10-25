// Le petit coffre du navigateur (IndexedDB) : les missions, leurs fichiers et leur enregistrement.
// Rien ne part sur un serveur. Si IndexedDB est indisponible (navigation privée), tout reste en mémoire.
const DB = 'openspace';
const STORE = 'kv';
const mem = new Map<string, unknown>();
let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (!opening) {
    opening = new Promise((resolve) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  return opening;
}

function req<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return open().then((db) => new Promise((resolve) => {
    if (!db) { resolve(undefined); return; }
    try {
      const r = fn(db.transaction(STORE, mode).objectStore(STORE));
      r.onsuccess = () => resolve(r.result as T);
      r.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  }));
}

export async function dbGet<T>(key: string): Promise<T | undefined> {
  const db = await open();
  if (!db) return mem.get(key) as T | undefined;
  return req<T>('readonly', (s) => s.get(key));
}

export async function dbSet(key: string, value: unknown): Promise<void> {
  const db = await open();
  if (!db) { mem.set(key, value); return; }
  await req('readwrite', (s) => s.put(value, key));
}

export async function dbDel(key: string): Promise<void> {
  mem.delete(key);
  await req('readwrite', (s) => s.delete(key));
}

export async function dbClear(): Promise<void> {
  mem.clear();
  await req('readwrite', (s) => s.clear());
}

/** Lecture et écriture sûres dans localStorage (pour les petites choses : réglages, tiroir, skills). */
export function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem('openspace:' + key); return v === null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
}
export function lsSet(key: string, value: unknown) {
  try { localStorage.setItem('openspace:' + key, JSON.stringify(value)); } catch { /* stockage plein ou bloqué */ }
}
export function lsClear() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('openspace:') || k.startsWith('bureau:')) localStorage.removeItem(k);
  } catch { /* rien à effacer */ }
}
