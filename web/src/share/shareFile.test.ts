import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bufferToHex } from '../crypto/buffer';

const call = vi.fn();
vi.mock('../crypto/client', () => ({
  rpc: { call: (...args: unknown[]) => call(...args) },
}));

import { encryptForRecipient, IV_LEN, SENDER_PUB_LEN, sharedFileName } from './shareFile';

const RECIPIENT_HEX = '04' + 'a1b2'.repeat(66);
const senderPub = new Uint8Array(133).fill(0x42);
const iv = new Uint8Array(16).fill(0x07);
const ct = new Uint8Array([9, 8, 7, 6]);

beforeEach(() => {
  call.mockReset();
  call.mockImplementation(async (msgType: string) => {
    if (msgType === 'set_shared_pub') return true;
    if (msgType === 'get_det_public_ecdh') return senderPub.slice().buffer;
    if (msgType === 'shared_ecdh_enc') {
      return { encrypted_buff: ct.slice().buffer, salt: iv.slice().buffer };
    }
    throw new Error(`unexpected msg_type: ${msgType}`);
  });
});

describe('encryptForRecipient', () => {
  it('calls set_shared_pub, get_det_public_ecdh, shared_ecdh_enc in order', async () => {
    const data = new Uint8Array([1, 2, 3]).buffer;
    await encryptForRecipient(data, RECIPIENT_HEX);
    expect(call.mock.calls.map((c) => c[0])).toEqual([
      'set_shared_pub',
      'get_det_public_ecdh',
      'shared_ecdh_enc',
    ]);
    const setPubPayload = call.mock.calls[0][1] as { pub_buff: ArrayBuffer };
    expect(bufferToHex(setPubPayload.pub_buff)).toBe(RECIPIENT_HEX.toLowerCase());
  });

  it('assembles senderPub(133) ‖ iv(16) ‖ ct (frozen format, design §14)', async () => {
    const out = new Uint8Array(
      await encryptForRecipient(new Uint8Array([1, 2, 3]).buffer, RECIPIENT_HEX),
    );
    expect(out.byteLength).toBe(SENDER_PUB_LEN + IV_LEN + ct.byteLength);
    expect(Array.from(out.slice(0, SENDER_PUB_LEN))).toEqual(Array.from(senderPub));
    expect(Array.from(out.slice(SENDER_PUB_LEN, SENDER_PUB_LEN + IV_LEN))).toEqual(
      Array.from(iv),
    );
    expect(Array.from(out.slice(SENDER_PUB_LEN + IV_LEN))).toEqual(Array.from(ct));
  });

  it('does not consume the caller\'s data buffer (Save must keep working)', async () => {
    const data = new Uint8Array([1, 2, 3]).buffer;
    await encryptForRecipient(data, RECIPIENT_HEX);
    expect(data.byteLength).toBe(3); // not detached by the transfer
  });

  it('rejects when the sender key is unavailable (locked worker)', async () => {
    call.mockImplementation(async (msgType: string) =>
      msgType === 'get_det_public_ecdh' ? null : true,
    );
    await expect(
      encryptForRecipient(new Uint8Array([1]).buffer, RECIPIENT_HEX),
    ).rejects.toThrow(/Share Key unavailable/);
  });
});

describe('sharedFileName', () => {
  it('uses outName when present, else name', () => {
    expect(sharedFileName({ name: 'a.txt.filekey', outName: 'a.txt' })).toBe(
      'a.txt.shared_filekey',
    );
    expect(sharedFileName({ name: 'photo.jpg' })).toBe('photo.jpg.shared_filekey');
  });
});

describe('concurrency: withSharedPubLock serializes the shared-pub critical section', () => {
  const RECIP_A = '04' + 'a1b2'.repeat(66);
  const RECIP_B = '04' + 'c3d4'.repeat(66);

  it('does not interleave two concurrent encrypts (never set→set→enc)', async () => {
    // Make set_shared_pub yield (real await boundary) so an unlocked impl WOULD
    // interleave; the lock must still keep each recipient's triple contiguous.
    call.mockReset();
    call.mockImplementation(async (msgType: string) => {
      if (msgType === 'set_shared_pub') {
        await Promise.resolve();
        return true;
      }
      if (msgType === 'get_det_public_ecdh') return senderPub.slice().buffer;
      if (msgType === 'shared_ecdh_enc') {
        return { encrypted_buff: ct.slice().buffer, salt: iv.slice().buffer };
      }
      throw new Error(`unexpected msg_type: ${msgType}`);
    });

    await Promise.all([
      encryptForRecipient(new Uint8Array([1]).buffer, RECIP_A),
      encryptForRecipient(new Uint8Array([2]).buffer, RECIP_B),
    ]);

    const seq = call.mock.calls.map((c) => c[0]);
    const oneTriple = ['set_shared_pub', 'get_det_public_ecdh', 'shared_ecdh_enc'];
    // The recorded sequence must be one recipient's full triple followed by the
    // other's — one of the two fully-grouped orderings, never an interleaving.
    expect(seq).toEqual([...oneTriple, ...oneTriple]);
    // And the first set_shared_pub's key must still own the first shared_ecdh_enc:
    // no second set_shared_pub appears between index 0 (set) and index 2 (enc).
    expect(seq.slice(0, 3)).toEqual(oneTriple);
  });
});
