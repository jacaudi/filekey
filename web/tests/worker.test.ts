// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { handleRequest, handlers } from '../src/crypto/worker/index';
import { bufferToHex, combineArrayBuffers } from '../src/crypto/buffer';
import { pinnedPrf } from './helpers';

const text = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe('worker handlers (ported from src/js/worker/index.js)', () => {
  it('runs a full session: prf_to_key → set_seed → share key → enc/dec → self-share → clear', async () => {
    expect(await handlers.prf_to_key({ prf_buff: pinnedPrf() })).toBeNull();
    expect(await handlers.set_seed({ seed_name: '_0' })).toBeNull();

    const pub = (await handlers.get_det_public_ecdh({})) as ArrayBuffer;
    expect(pub.byteLength).toBe(133);
    expect(bufferToHex(pub).slice(0, 2)).toBe('04');
    expect(bufferToHex(pub).length).toBe(266);

    // .filekey round trip: salt(16) ‖ ciphertext
    const enc = (await handlers.new_enc({ msg_buff: text('hello worker') })) as {
      encrypted_buff: ArrayBuffer;
      salt: ArrayBuffer;
    };
    expect(enc.salt.byteLength).toBe(16);
    const filekey = combineArrayBuffers(enc.salt, enc.encrypted_buff);
    const dec = (await handlers.new_dec({ msg_buff: filekey })) as { decrypted_buff: ArrayBuffer };
    expect(new TextDecoder().decode(dec.decrypted_buff)).toBe('hello worker');

    // self-share round trip: recipient = own key
    expect(await handlers.set_shared_pub({ pub_buff: pub.slice(0) })).toBe(true);
    const senc = (await handlers.shared_ecdh_enc({ msg_buff: text('shared secret') })) as {
      encrypted_buff: ArrayBuffer;
      salt: ArrayBuffer;
    };
    expect(senc.salt.byteLength).toBe(16);
    const body = combineArrayBuffers(senc.salt, senc.encrypted_buff); // iv(16) ‖ ciphertext
    const sdec = (await handlers.shared_ecdh_dec({ msg_buff: body, pub_buff: pub.slice(0) })) as {
      decrypted_buff: ArrayBuffer;
    };
    expect(new TextDecoder().decode(sdec.decrypted_buff)).toBe('shared secret');

    // clear_keys wipes everything
    expect(await handlers.clear_keys({})).toBeNull();
    expect(await handlers.get_det_public_ecdh({})).toBeNull();
    await expect(handlers.new_enc({ msg_buff: text('x') })).rejects.toThrow('no active key');
  }, 60000);

  it('set_seed without prf_to_key rejects with a typed error', async () => {
    await handlers.clear_keys({});
    await expect(handlers.set_seed({ seed_name: '_0' })).rejects.toThrow('prf_to_key');
  });
});

describe('worker reply envelope (id echoed on EVERY reply)', () => {
  it('echoes the request id on success', async () => {
    const posts: unknown[] = [];
    await handleRequest({ id: 42, msg_type: 'clear_keys' }, (m) => posts.push(m));
    expect(posts).toEqual([{ id: 42, ok: true, result: null }]);
  });

  it('echoes the request id on failure with a typed error string', async () => {
    await handleRequest({ id: 0, msg_type: 'clear_keys' }, () => {});
    const posts: Array<{ id: number; ok: boolean; error?: string }> = [];
    await handleRequest({ id: 7, msg_type: 'new_enc', msg_buff: text('x') }, (m) => posts.push(m as never));
    expect(posts[0].id).toBe(7);
    expect(posts[0].ok).toBe(false);
    expect(typeof posts[0].error).toBe('string');
  });

  it('rejects unknown msg_type with the id echoed', async () => {
    const posts: Array<{ id: number; ok: boolean; error?: string }> = [];
    await handleRequest({ id: 3, msg_type: 'bogus' }, (m) => posts.push(m as never));
    expect(posts[0]).toEqual({ id: 3, ok: false, error: 'unknown msg_type: bogus' });
  });

  it('transfers fresh result buffers for enc/dec replies only', async () => {
    await handlers.prf_to_key({ prf_buff: pinnedPrf() });
    await handlers.set_seed({ seed_name: '_0' });
    let encTransfer: Transferable[] | undefined;
    await handleRequest({ id: 1, msg_type: 'new_enc', msg_buff: text('t') }, (_m, transfer) => {
      encTransfer = transfer;
    });
    expect(encTransfer!.length).toBe(2); // encrypted_buff + salt
    let pubTransfer: Transferable[] | undefined;
    await handleRequest({ id: 2, msg_type: 'get_det_public_ecdh' }, (_m, transfer) => {
      pubTransfer = transfer;
    });
    // The stored public key buffer must NOT be transferred (it would neuter worker state).
    expect(pubTransfer ?? []).toEqual([]);
  }, 60000);
});
