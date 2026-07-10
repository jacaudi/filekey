import { describe, expect, it } from 'vitest';
import { fileKind, outputName } from './registry';

describe('fileKind', () => {
  it('classifies .filekey as encrypted', () => {
    expect(fileKind('report.pdf.filekey')).toBe('encrypted');
  });

  it('classifies .shared_filekey as shared', () => {
    expect(fileKind('report.pdf.shared_filekey')).toBe('shared');
  });

  it('classifies everything else as plain', () => {
    expect(fileKind('report.pdf')).toBe('plain');
    expect(fileKind('noext')).toBe('plain');
    expect(fileKind('archive.filekey.zip')).toBe('plain');
    // "_filekey" is not ".filekey"
    expect(fileKind('x_filekey')).toBe('plain');
  });
});

describe('outputName', () => {
  it('appends .filekey for plain', () => {
    expect(outputName('photo.png', 'plain')).toBe('photo.png.filekey');
  });

  it('strips .filekey for encrypted', () => {
    expect(outputName('photo.png.filekey', 'encrypted')).toBe('photo.png');
  });

  it('strips .shared_filekey for shared', () => {
    expect(outputName('photo.png.shared_filekey', 'shared')).toBe('photo.png');
  });
});
