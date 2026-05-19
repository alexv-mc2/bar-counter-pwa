const DB_NAME = "rolling-badger-bar-counter";
const DB_VERSION = 1;

export const STORES = {
  events: "events",
  tapLogs: "tapLogs",
  buttonTemplate: "buttonTemplate",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.events)) {
        db.createObjectStore(STORES.events, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.tapLogs)) {
        const tapStore = db.createObjectStore(STORES.tapLogs, { keyPath: "id" });
        tapStore.createIndex("eventId", "eventId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.buttonTemplate)) {
        db.createObjectStore(STORES.buttonTemplate, { keyPath: "id" });
      }
    };
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);
    tx.oncomplete = () => {
      if (request) {
        resolve((request as IDBRequest<T>).result);
      } else {
        resolve(undefined);
      }
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    if (request) {
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    }
  });
}

export async function idbGet<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return (await withStore<T>(storeName, "readonly", (store) => store.get(key))) as T | undefined;
}

export async function idbPut<T extends { id: string }>(
  storeName: StoreName,
  value: T,
): Promise<void> {
  await withStore(storeName, "readwrite", (store) => store.put(value));
}

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  return (await withStore<T[]>(storeName, "readonly", (store) => store.getAll())) as T[];
}

export async function idbGetAllByIndex<T>(
  storeName: StoreName,
  indexName: string,
  query: IDBValidKey,
): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(query);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB index read failed"));
  });
}

export async function idbDelete(storeName: StoreName, key: IDBValidKey): Promise<void> {
  await withStore(storeName, "readwrite", (store) => store.delete(key));
}
