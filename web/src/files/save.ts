import type { FileJob } from './ops';

// Parity with src/js/lib/utils.js sanitizeFilename.
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\]/g, '').replace(/\x00/g, '').slice(0, 255);
}

// <a download> save path (design §8.2 note: Web Share for files is Phase 4).
export function saveJob(job: FileJob): void {
  if (!job.data || !job.outName) return;
  const blob = new Blob([job.data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(job.outName);
  a.click();
  URL.revokeObjectURL(url);
}
