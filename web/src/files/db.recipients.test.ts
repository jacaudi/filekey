import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

const VALID_HEX = '04' + 'a1b2'.repeat(66);

type DbModule = typeof import('./db');
let db: DbModule;

beforeEach(async () => {
  vi.resetModules(); // drop any cached IDB connection inside db.ts
  globalThis.indexedDB = new IDBFactory();
  db = await import('./db');
});

describe('recipients store', () => {
  it('addRecipient returns a complete Recipient with normalized hex', async () => {
    const before = Date.now();
    const r = await db.addRecipient('Alice', VALID_HEX.toUpperCase());
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.name).toBe('Alice');
    expect(r.pubHex).toBe(VALID_HEX.toLowerCase());
    expect(r.createdTs).toBeGreaterThanOrEqual(before);
  });

  it('listRecipients returns saved recipients sorted by name', async () => {
    await db.addRecipient('Zoe', VALID_HEX);
    await db.addRecipient('Alice', VALID_HEX);
    const names = (await db.listRecipients()).map((r) => r.name);
    expect(names).toEqual(['Alice', 'Zoe']);
  });

  it('renameRecipient updates the name and keeps other fields', async () => {
    const r = await db.addRecipient('Alice', VALID_HEX);
    await db.renameRecipient(r.id, 'Alice Work');
    const [got] = await db.listRecipients();
    expect(got.name).toBe('Alice Work');
    expect(got.pubHex).toBe(r.pubHex);
    expect(got.createdTs).toBe(r.createdTs);
  });

  it('renameRecipient rejects for an unknown id', async () => {
    await expect(db.renameRecipient('nope', 'x')).rejects.toThrow(/not found/);
  });

  it('deleteRecipient removes exactly one recipient', async () => {
    const a = await db.addRecipient('Alice', VALID_HEX);
    await db.addRecipient('Bob', VALID_HEX);
    await db.deleteRecipient(a.id);
    const names = (await db.listRecipients()).map((r) => r.name);
    expect(names).toEqual(['Bob']);
  });

  it('clearRecipients empties the store (Reset semantics)', async () => {
    await db.addRecipient('Alice', VALID_HEX);
    await db.clearRecipients();
    expect(await db.listRecipients()).toEqual([]);
  });
});
