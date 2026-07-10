import type { FileJob } from './ops';

// Parity with src/js/lib/utils.js sanitizeFilename.
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\]/g, '').replace(/\x00/g, '').slice(0, 255);
}

// <a download> save path (design §8.2 note: Web Share for files is Phase 4).
// Single source for the <a download> dance — every download path (Save, Share
// Save) routes through here so the download attribute is always sanitized
// (defense-in-depth: filenames can be attacker-influenceable, e.g. a name
// embedded in a decrypted .filekey).
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(filename);
  a.click();
  URL.revokeObjectURL(url);
}

export function saveJob(job: FileJob): void {
  if (!job.data || !job.outName) return;
  const blob = new Blob([job.data], { type: 'application/octet-stream' });
  downloadBlob(blob, job.outName);
}
