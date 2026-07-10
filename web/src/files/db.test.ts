import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearJobs, getJob, saveJob } from './db';
import type { FileJob } from './ops';

const job = (id: string): FileJob => ({
  id,
  name: 'a.png',
  kind: 'plain',
  status: 'done',
  outName: 'a.png.filekey',
  data: new Uint8Array([1, 2, 3]).buffer,
});

describe('files/db', () => {
  beforeEach(async () => {
    await clearJobs();
  });

  it('saves and retrieves a job by id, including its ArrayBuffer', async () => {
    await saveJob(job('j1'));
    const got = await getJob('j1');
    expect(got?.outName).toBe('a.png.filekey');
    expect(new Uint8Array(got!.data!)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('returns null for a missing id', async () => {
    expect(await getJob('missing')).toBeNull();
  });

  it('clearJobs wipes the store', async () => {
    await saveJob(job('j2'));
    await clearJobs();
    expect(await getJob('j2')).toBeNull();
  });

  it('saveJob overwrites an existing id', async () => {
    await saveJob(job('j3'));
    await saveJob({ ...job('j3'), status: 'error', error: 'x', data: undefined });
    const got = await getJob('j3');
    expect(got?.status).toBe('error');
  });

  it('requestPersistence returns the persist() result and never throws', async () => {
    const { requestPersistence } = await import('./db');
    vi.stubGlobal('navigator', {
      storage: { persisted: async () => false, persist: async () => true },
    });
    expect(await requestPersistence()).toBe(true);
    vi.stubGlobal('navigator', {}); // no storage API at all
    expect(await requestPersistence()).toBe(false);
    vi.unstubAllGlobals();
  });
});
