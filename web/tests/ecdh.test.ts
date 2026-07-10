// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { convertKeys, generateKeyPair } from '../src/crypto/ecdh';
import { deriveEcdhKey, encrypt, importEcdhPub, noDecodeDecrypt } from '../src/crypto/encryption';
import { bufferToHex } from '../src/crypto/buffer';

function seed(fill: number): ArrayBuffer {
  return new Uint8Array(64).fill(fill).buffer;
}

describe('deterministic P-521 ECDH (ported from src/js/worker/ecdh.js)', () => {
  it('rejects seeds that are not 64-byte ArrayBuffers', () => {
    expect(() => generateKeyPair(new Uint8Array(63).buffer)).toThrow();
  });

  it('is deterministic: same seed, same keypair', () => {
    const a = generateKeyPair(seed(7));
    const b = generateKeyPair(seed(7));
    expect(a.privateKey).toBe(b.privateKey);
    expect(a.publicKey.x).toBe(b.publicKey.x);
    expect(a.publicKey.y).toBe(b.publicKey.y);
    const c = generateKeyPair(seed(8));
    expect(c.privateKey).not.toBe(a.privateKey);
  });

  it('produces a 133-byte 04-prefixed raw public key SubtleCrypto accepts', async () => {
    const pair = generateKeyPair(seed(7));
    const converted = await convertKeys(pair.privateKey, pair.publicKey);
    expect(converted.publicKeyRaw.byteLength).toBe(133);
    expect(bufferToHex(converted.publicKeyRaw).slice(0, 2)).toBe('04');
    expect(bufferToHex(converted.publicKeyRaw).length).toBe(266);
  });

  it('two parties derive the same AES-GCM key (full ECDH round trip)', async () => {
    const pairA = generateKeyPair(seed(1));
    const pairB = generateKeyPair(seed(2));
    const alice = await convertKeys(pairA.privateKey, pairA.publicKey);
    const bob = await convertKeys(pairB.privateKey, pairB.publicKey);
    const bobPub = await importEcdhPub(bob.publicKeyRaw);
    const alicePub = await importEcdhPub(alice.publicKeyRaw);
    const kAlice = await deriveEcdhKey(alice.privateKey, bobPub);
    const kBob = await deriveEcdhKey(bob.privateKey, alicePub);
    const iv = crypto.getRandomValues(new Uint8Array(16)).buffer;
    const plaintext = new TextEncoder().encode('ecdh agreement').buffer;
    const ct = await encrypt(kAlice, plaintext, iv);
    const pt = await noDecodeDecrypt(kBob, ct, iv);
    expect(new TextDecoder().decode(pt)).toBe('ecdh agreement');
  });
});
