// Directory-recursive drop collection, ported from src/js/ui/file-import.js
// (handleDrop/handleDirectory), with one fix: readEntries is drained in a loop —
// the spec returns entries in batches (~100), and a single call drops the rest.
export async function collectFiles(dt: DataTransfer): Promise<File[]> {
  const items = dt.items ? Array.from(dt.items) : [];
  const entries = items.map((i) =>
    typeof i.webkitGetAsEntry === 'function' ? i.webkitGetAsEntry() : null,
  );
  if (!entries.some(Boolean)) return Array.from(dt.files ?? []);

  const out: File[] = [];
  await Promise.all(entries.map((e) => (e ? walk(e, out) : Promise.resolve())));
  return out;
}

async function walk(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    out.push(file);
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (batch.length === 0) break;
      await Promise.all(batch.map((e) => walk(e, out)));
    }
  }
}
