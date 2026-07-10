import { describe, expect, it } from 'vitest';
import { collectFiles } from './collect';

type FakeEntry = {
  isFile: boolean;
  isDirectory: boolean;
  file?: (ok: (f: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (e: FakeEntry[]) => void, err: (e: unknown) => void) => void };
};

function fileEntry(name: string): FakeEntry {
  return {
    isFile: true,
    isDirectory: false,
    file: (ok) => ok(new File([new Uint8Array([1])], name)),
  };
}

function dirEntry(batches: FakeEntry[][]): FakeEntry {
  let i = 0;
  return {
    isFile: false,
    isDirectory: true,
    createReader: () => ({
      readEntries: (ok) => ok(i < batches.length ? batches[i++] : []),
    }),
  };
}

function fakeDataTransfer(entries: (FakeEntry | null)[], files: File[] = []): DataTransfer {
  return {
    items: entries.map((e) => ({ webkitGetAsEntry: () => e })),
    files,
  } as unknown as DataTransfer;
}

describe('collectFiles', () => {
  it('collects plain dropped files', async () => {
    const out = await collectFiles(fakeDataTransfer([fileEntry('a.txt'), fileEntry('b.txt')]));
    expect(out.map((f) => f.name).sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('recurses into directories', async () => {
    const nested = dirEntry([[fileEntry('deep.txt')]]);
    const dir = dirEntry([[fileEntry('top.txt'), nested]]);
    const out = await collectFiles(fakeDataTransfer([dir]));
    expect(out.map((f) => f.name).sort()).toEqual(['deep.txt', 'top.txt']);
  });

  it('drains readEntries batches until empty (directories with >100 entries)', async () => {
    const dir = dirEntry([[fileEntry('one.txt')], [fileEntry('two.txt')]]);
    const out = await collectFiles(fakeDataTransfer([dir]));
    expect(out.map((f) => f.name).sort()).toEqual(['one.txt', 'two.txt']);
  });

  it('falls back to dt.files when entries are unavailable', async () => {
    const f = new File([new Uint8Array([1])], 'fallback.txt');
    const out = await collectFiles(fakeDataTransfer([null], [f]));
    expect(out).toEqual([f]);
  });
});
