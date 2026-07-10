export type FileKind = 'plain' | 'encrypted' | 'shared';

const ENCRYPTED_EXT = '.filekey';
const SHARED_EXT = '.shared_filekey';

export function fileKind(name: string): FileKind {
  if (name.endsWith(SHARED_EXT)) return 'shared';
  if (name.endsWith(ENCRYPTED_EXT)) return 'encrypted';
  return 'plain';
}

export function outputName(name: string, kind: FileKind): string {
  switch (kind) {
    case 'plain':
      return name + ENCRYPTED_EXT;
    case 'encrypted':
      return name.slice(0, -ENCRYPTED_EXT.length);
    case 'shared':
      return name.slice(0, -SHARED_EXT.length);
  }
}
