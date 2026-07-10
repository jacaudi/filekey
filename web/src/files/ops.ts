import { rpc } from '../crypto/client';
import { combineArrayBuffers } from '../crypto/buffer';
import { fileKind, outputName, type FileKind } from './registry';

export type FileJob = {
  id: string;
  name: string;
  kind: FileKind;
  status: 'processing' | 'done' | 'error';
  outName?: string;
  data?: ArrayBuffer;
  error?: string;
};

export const ERR_WRONG_KEY = 'wrong passkey/key';
export const ERR_NOT_FILEKEY = 'not a FileKey file';
export const ERR_ENC_FAILED = 'encryption failed';

// Friendly, human-readable status label shared by FileList's status Tag and
// StatusAnnouncer's aria-live text — single source so the two never drift.
const DONE_LABEL: Record<FileKind, string> = {
  plain: 'Encrypted',
  encrypted: 'Decrypted',
  shared: 'Decrypted',
};

export function jobStatusLabel(job: FileJob): string {
  switch (job.status) {
    case 'processing':
      return 'Processing';
    case 'done':
      return DONE_LABEL[job.kind];
    case 'error':
      return 'Failed';
  }
}

// Frozen formats (design §2.2): .filekey = salt(16)‖ct, .shared_filekey = pub(133)‖iv(16)‖ct.
// AES-GCM ciphertext is at least its 16-byte auth tag, so these are the minimum
// lengths any genuine FileKey file can have — anything shorter is "not a FileKey file".
const SALT_LEN = 16;
const PUB_LEN = 133;
const GCM_TAG_LEN = 16;
const MIN_ENCRYPTED = SALT_LEN + GCM_TAG_LEN; // 32
const MIN_SHARED = PUB_LEN + SALT_LEN + GCM_TAG_LEN; // 165

// Map a worker rejection to a user-facing taxonomy error. The taxonomy string
// intentionally hides the underlying crypto error from users, but discarding it
// entirely was the Phase 1 fk_log regression — so preserve the original for dev
// diagnostics under import.meta.env.DEV before rethrowing the safe message.
function failWith(message: string): (err: unknown) => never {
  return (err) => {
    if (import.meta.env.DEV) console.debug('crypto op failed:', message, err);
    throw new Error(message);
  };
}

async function dispatch(kind: FileKind, buf: ArrayBuffer): Promise<ArrayBuffer> {
  switch (kind) {
    case 'plain': {
      const res = await rpc
        .call<{ encrypted_buff: ArrayBuffer; salt: ArrayBuffer }>('new_enc', { msg_buff: buf }, [buf])
        .catch(failWith(ERR_ENC_FAILED));
      return combineArrayBuffers(res.salt, res.encrypted_buff);
    }
    case 'encrypted': {
      if (buf.byteLength < MIN_ENCRYPTED) throw new Error(ERR_NOT_FILEKEY);
      // The worker's new_dec handler splits the 16-byte salt itself — the format
      // knowledge stays with the format owner (parity with src/js/worker/index.js).
      const res = await rpc
        .call<{ decrypted_buff: ArrayBuffer }>('new_dec', { msg_buff: buf }, [buf])
        .catch(failWith(ERR_WRONG_KEY));
      return res.decrypted_buff;
    }
    case 'shared': {
      if (buf.byteLength < MIN_SHARED) throw new Error(ERR_NOT_FILEKEY);
      const pub_buff = buf.slice(0, PUB_LEN);
      const msg_buff = buf.slice(PUB_LEN);
      const res = await rpc
        .call<{ decrypted_buff: ArrayBuffer }>('shared_ecdh_dec', { msg_buff, pub_buff }, [msg_buff, pub_buff])
        .catch(failWith(ERR_WRONG_KEY));
      return res.decrypted_buff;
    }
  }
}

export async function processFiles(files: File[], onJob: (job: FileJob) => void): Promise<void> {
  for (const file of files) {
    const kind = fileKind(file.name);
    const base: FileJob = { id: crypto.randomUUID(), name: file.name, kind, status: 'processing' };
    onJob({ ...base });
    try {
      const buf = await file.arrayBuffer();
      const data = await dispatch(kind, buf);
      onJob({ ...base, status: 'done', outName: outputName(file.name, kind), data });
    } catch (e) {
      onJob({ ...base, status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  }
}
