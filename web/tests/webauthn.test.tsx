// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { WebAuthnHandler } from '../src/crypto/webauthn';

type AnyFn = (options: any) => Promise<unknown>;

function stubCredentials(impl: { create?: AnyFn; get?: AnyFn }): void {
  Object.defineProperty(navigator, 'credentials', {
    configurable: true,
    value: {
      create: impl.create ?? (() => Promise.reject(new Error('create not stubbed'))),
      get: impl.get ?? (() => Promise.reject(new Error('get not stubbed'))),
    },
  });
}

describe('WebAuthnHandler (ported from src/js/lib/webauthn.js)', () => {
  const rp = { name: 'Filekey', id: 'filekey.app' };

  it('getCredential passes rpId and PRF eval inputs, returns combined PRF output', async () => {
    const first = new Uint8Array([1, 2]).buffer;
    const second = new Uint8Array([3, 4]).buffer;
    const raw_id = new Uint8Array([9]).buffer;
    let seen: any = null;
    stubCredentials({
      get: async (options) => {
        seen = options;
        return {
          rawId: raw_id,
          getClientExtensionResults: () => ({ prf: { results: { first, second } } }),
        };
      },
    });
    const result = await new WebAuthnHandler(rp).getCredential({ first: new Uint8Array([7]).buffer });
    expect(seen.publicKey.rpId).toBe('filekey.app');
    expect(seen.publicKey.extensions.prf.eval.first).toBeInstanceOf(ArrayBuffer);
    expect(seen.publicKey.allowCredentials).toBeUndefined();
    expect(result).not.toBeNull();
    expect(new Uint8Array(result!.key_mat)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(result!.cred_id).toBe(raw_id);
  });

  it('getCredential sets allowCredentials when an id is given', async () => {
    const cred_id = new Uint8Array([5]).buffer;
    let seen: any = null;
    stubCredentials({
      get: async (options) => {
        seen = options;
        return { rawId: cred_id, getClientExtensionResults: () => ({}) };
      },
    });
    await new WebAuthnHandler(rp).getCredential({ first: new Uint8Array([7]).buffer, id: cred_id });
    expect(seen.publicKey.allowCredentials).toEqual([{ type: 'public-key', id: cred_id }]);
  });

  it('getCredential returns null when PRF results are missing or the call rejects', async () => {
    stubCredentials({ get: async () => ({ rawId: new ArrayBuffer(1), getClientExtensionResults: () => ({}) }) });
    expect(await new WebAuthnHandler(rp).getCredential({ first: new ArrayBuffer(1) })).toBeNull();
    stubCredentials({ get: () => Promise.reject(new Error('user cancelled')) });
    expect(await new WebAuthnHandler(rp).getCredential({ first: new ArrayBuffer(1) })).toBeNull();
  });

  it('createCredential returns rawId only when prf.enabled', async () => {
    const raw_id = new Uint8Array([8]).buffer;
    let seen: any = null;
    stubCredentials({
      create: async (options) => {
        seen = options;
        return { rawId: raw_id, getClientExtensionResults: () => ({ prf: { enabled: true } }) };
      },
    });
    const handler = new WebAuthnHandler(rp);
    expect(await handler.createCredential({ key_name: 'k', username: 'u' })).toBe(raw_id);
    expect(seen.publicKey.rp).toEqual({ name: 'Filekey', id: 'filekey.app' });
    expect(seen.publicKey.authenticatorSelection).toEqual({ residentKey: 'required' });
    expect(seen.publicKey.pubKeyCredParams.map((p: { alg: number }) => p.alg)).toEqual([-7, -8, -257]);

    stubCredentials({
      create: async () => ({ rawId: raw_id, getClientExtensionResults: () => ({ prf: { enabled: false } }) }),
    });
    expect(await handler.createCredential({ key_name: 'k', username: 'u' })).toBeNull();
    stubCredentials({ create: () => Promise.reject(new Error('nope')) });
    expect(await handler.createCredential({ key_name: 'k', username: 'u' })).toBeNull();
  });
});
