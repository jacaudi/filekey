import type { FileJob } from './ops';

const DB_NAME = 'filekey_temp_db';
const DB_VERSION = 3;
const STORE = 'jobs';
// v1 store from the pre-antd app — dropped on upgrade so existing users' stale
// session caches are cleaned the first time the new app loads.
const OLD_STORE = 'data_store';
const RECIPIENTS_STORE = 'recipients';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(OLD_STORE)) db.deleteObjectStore(OLD_STORE);
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(RECIPIENTS_STORE)) {
        db.createObjectStore(RECIPIENTS_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Single source of truth for open → transaction → close. Every store access
// (jobs and recipients) routes through here so the connection is always closed
// in the finally block — a leaked connection with no onversionchange handler
// could otherwise block a future onupgradeneeded (DB_VERSION bump).
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const req = run(t.objectStore(storeName));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveJob(job: FileJob): Promise<void> {
  await withStore(STORE, 'readwrite', (s) => s.put(job));
}

export async function getJob(id: string): Promise<FileJob | null> {
  const res = await withStore<FileJob | undefined>(STORE, 'readonly', (s) => s.get(id));
  return res ?? null;
}

export async function clearJobs(): Promise<void> {
  await withStore(STORE, 'readwrite', (s) => s.clear());
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

// --- Recipients (Phase 4, design §8.1) -------------------------------------
// Stored only on this device. Lock keeps recipients; Reset wipes them.

export type Recipient = {
  id: string;
  name: string;
  pubHex: string; // normalized lowercase 266-hex
  createdTs: number;
};

export async function listRecipients(): Promise<Recipient[]> {
  const all = await withStore<Recipient[]>(RECIPIENTS_STORE, 'readonly', (s) => s.getAll());
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addRecipient(name: string, pubHex: string): Promise<Recipient> {
  const recipient: Recipient = {
    id: crypto.randomUUID(),
    name,
    pubHex: pubHex.toLowerCase(),
    createdTs: Date.now(),
  };
  await withStore(RECIPIENTS_STORE, 'readwrite', (s) => s.add(recipient));
  return recipient;
}

export async function renameRecipient(id: string, name: string): Promise<void> {
  const existing = await withStore<Recipient | undefined>(
    RECIPIENTS_STORE,
    'readonly',
    (s) => s.get(id),
  );
  if (existing === undefined) throw new Error(`recipient not found: ${id}`);
  await withStore(RECIPIENTS_STORE, 'readwrite', (s) => s.put({ ...existing, name }));
}

export async function deleteRecipient(id: string): Promise<void> {
  await withStore(RECIPIENTS_STORE, 'readwrite', (s) => s.delete(id));
}

export async function clearRecipients(): Promise<void> {
  await withStore(RECIPIENTS_STORE, 'readwrite', (s) => s.clear());
}
