import type { FileJob } from './ops';

const DB_NAME = 'filekey_temp_db';
const DB_VERSION = 2;
const STORE = 'jobs';
// v1 store from the pre-antd app — dropped on upgrade so existing users' stale
// session caches are cleaned the first time the new app loads.
const OLD_STORE = 'data_store';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(OLD_STORE)) db.deleteObjectStore(OLD_STORE);
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveJob(job: FileJob): Promise<void> {
  await withStore('readwrite', (s) => s.put(job));
}

export async function getJob(id: string): Promise<FileJob | null> {
  const res = await withStore<FileJob | undefined>('readonly', (s) => s.get(id));
  return res ?? null;
}

export async function clearJobs(): Promise<void> {
  await withStore('readwrite', (s) => s.clear());
}

// Parity with the old app's persistent-storage request. Best-effort: browsers may
// deny silently; callers only log the result.
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
