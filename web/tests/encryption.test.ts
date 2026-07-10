import { describe, expect, it } from 'vitest';
import { encrypt, importEcdhPub, noDecodeDecrypt } from '../src/crypto/encryption';

async function aesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

describe('AES-GCM wrappers (ported from src/js/worker/encryption.js)', () => {
  it('encrypt → noDecodeDecrypt round trips', async () => {
    const key = await aesKey();
    const iv = crypto.getRandomValues(new Uint8Array(16)).buffer;
    const ct = await encrypt(key, new TextEncoder().encode('secret').buffer, iv);
    expect(new TextDecoder().decode(await noDecodeDecrypt(key, ct, iv))).toBe('secret');
  });

  it('decrypt failures reject (typed errors replace the old bare null)', async () => {
    const key = await aesKey();
    const iv = crypto.getRandomValues(new Uint8Array(16)).buffer;
    await expect(noDecodeDecrypt(key, new Uint8Array(32).buffer, iv)).rejects.toThrow();
  });

  it('importEcdhPub rejects off-curve garbage', async () => {
    const garbage = new Uint8Array(133);
    garbage[0] = 0x04;
    await expect(importEcdhPub(garbage.buffer)).rejects.toThrow();
  });
});
