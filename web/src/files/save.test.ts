import { describe, expect, it, vi } from 'vitest';
import { downloadBlob, sanitizeFilename, saveJob } from './save';
import type { FileJob } from './ops';

describe('sanitizeFilename', () => {
  // Parity with src/js/lib/utils.js sanitizeFilename
  it('strips path separators and NULs and caps at 255 chars', () => {
    expect(sanitizeFilename('a/b\\c\x00d.txt')).toBe('abcd.txt');
    expect(sanitizeFilename('x'.repeat(300)).length).toBe(255);
  });
});

describe('saveJob', () => {
  it('clicks a temporary <a download> with the sanitized output name', () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('outname.txt');
      expect(this.href).toContain('blob:fake');
    });

    const job: FileJob = {
      id: 'j',
      name: 'out/name.txt.filekey',
      kind: 'encrypted',
      status: 'done',
      outName: 'out/name.txt',
      data: new Uint8Array([1]).buffer,
    };
    saveJob(job);

    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith('blob:fake');
    createUrl.mockRestore();
    revokeUrl.mockRestore();
    click.mockRestore();
  });
});

describe('downloadBlob', () => {
  it('sanitizes the filename before setting a.download (defense-in-depth for attacker-influenceable names)', () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('abcd.txt');
      expect(this.href).toContain('blob:fake');
    });

    const blob = new Blob([new Uint8Array([1])], { type: 'application/octet-stream' });
    downloadBlob(blob, 'a/b\\c\x00d.txt');

    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith('blob:fake');
    createUrl.mockRestore();
    revokeUrl.mockRestore();
    click.mockRestore();
  });
});
