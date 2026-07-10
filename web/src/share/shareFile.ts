import { rpc } from '../crypto/client';
import { hexToArrayBuffer } from '../crypto/buffer';
import type { FileJob } from '../files/ops';
import { withSharedPubLock } from './sharedPub';

export const SENDER_PUB_LEN = 133;
export const IV_LEN = 16; // the worker's shared_ecdh_enc reply names this `salt`

/**
 * Existing shared_ecdh_enc path (design §8.2). Invariant established here:
 * set_shared_pub for the CHOSEN recipient always immediately precedes
 * shared_ecdh_enc in the same flow — worker shared-pub state is never
 * trusted across flows (see validate.ts for why that makes the validation
 * dry-run safe). The whole set_shared_pub → get_det_public_ecdh →
 * shared_ecdh_enc → assemble sequence runs inside `withSharedPubLock` so it is
 * atomic against any concurrent flow (another encrypt, or a recipient
 * validation dry-run) that also touches the worker's single shared-pub slot —
 * without the lock, two flows could interleave set→set→enc and encrypt to the
 * WRONG recipient. Output format is frozen: senderPub(133) ‖ iv(16) ‖ ct.
 */
export async function encryptForRecipient(
  data: ArrayBuffer,
  recipientPubHex: string,
): Promise<ArrayBuffer> {
  return withSharedPubLock(async () => {
    const pubBuff = hexToArrayBuffer(recipientPubHex.toLowerCase());
    await rpc.call<boolean>('set_shared_pub', { pub_buff: pubBuff }, [pubBuff]);

    const senderPub = await rpc.call<ArrayBuffer | null>('get_det_public_ecdh');
    if (senderPub === null || senderPub.byteLength !== SENDER_PUB_LEN) {
      throw new Error('Share Key unavailable — unlock and try again');
    }

    // Copy before transfer: the job's cached bytes must survive for Save.
    const msgBuff = data.slice(0);
    const { encrypted_buff, salt } = await rpc.call<{
      encrypted_buff: ArrayBuffer;
      salt: ArrayBuffer;
    }>('shared_ecdh_enc', { msg_buff: msgBuff }, [msgBuff]);
    if (salt.byteLength !== IV_LEN) {
      throw new Error(`unexpected IV length from worker: ${salt.byteLength}`);
    }

    const out = new Uint8Array(SENDER_PUB_LEN + IV_LEN + encrypted_buff.byteLength);
    out.set(new Uint8Array(senderPub), 0);
    out.set(new Uint8Array(salt), SENDER_PUB_LEN);
    out.set(new Uint8Array(encrypted_buff), SENDER_PUB_LEN + IV_LEN);
    return out.buffer;
  });
}

export function sharedFileName(job: Pick<FileJob, 'name' | 'outName'>): string {
  return `${job.outName ?? job.name}.shared_filekey`;
}
