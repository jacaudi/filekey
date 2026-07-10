import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { handlers } from '../src/crypto/worker/index';
import { bufferToHex } from '../src/crypto/buffer';
import { pinnedPrf } from './helpers';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function readFixture(name: string): ArrayBuffer {
  const b = readFileSync(path.join(fixturesDir, name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

describe('golden-file compatibility: fixtures produced by the OLD worker decrypt with the NEW modules', () => {
  beforeAll(async () => {
    await handlers.clear_keys({});
    await handlers.prf_to_key({ prf_buff: pinnedPrf() });
    await handlers.set_seed({ seed_name: '_0' });
  }, 60000);

  it('derives the IDENTICAL 266-hex Share Key from the pinned PRF', async () => {
    const pub = (await handlers.get_det_public_ecdh({})) as ArrayBuffer;
    const expected = readFileSync(path.join(fixturesDir, 'share-key.hex'), 'utf8').trim();
    expect(bufferToHex(pub)).toBe(expected);
  });

  it('decrypts the committed .filekey (salt ‖ ciphertext)', async () => {
    const { decrypted_buff } = (await handlers.new_dec({
      msg_buff: readFixture('fixture.txt.filekey'),
    })) as { decrypted_buff: ArrayBuffer };
    expect(new Uint8Array(decrypted_buff)).toEqual(new Uint8Array(readFixture('fixture.txt')));
  });

  it('decrypts the committed .shared_filekey (senderPub ‖ iv ‖ ciphertext)', async () => {
    const fixture = readFixture('fixture.txt.shared_filekey');
    const sender_pub = fixture.slice(0, 133);
    const body = fixture.slice(133);
    const { decrypted_buff } = (await handlers.shared_ecdh_dec({
      msg_buff: body,
      pub_buff: sender_pub,
    })) as { decrypted_buff: ArrayBuffer };
    expect(new Uint8Array(decrypted_buff)).toEqual(new Uint8Array(readFixture('fixture.txt')));
  });
});
