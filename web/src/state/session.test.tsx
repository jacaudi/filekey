import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SessionProvider, useSession, rpId } from './session';
import { rpc } from '../crypto/client';
import { WebAuthnHandler } from '../crypto/webauthn';

vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn() } }));
// The webauthn module exports a class; share one getCredential/createCredential pair
// across every constructed instance so tests can configure and assert them.
const { getCredential, createCredential } = vi.hoisted(() => ({
  getCredential: vi.fn(),
  createCredential: vi.fn(),
}));
// vi.fn's implementation must be a real `function` (or `class`), not an arrow
// function, so that `new WebAuthnHandler(...)` can construct it — arrow functions
// have no [[Construct]] and vitest's mock invoker throws "is not a constructor"
// otherwise (see https://vitest.dev/api/vi#vi-spyon).
vi.mock('../crypto/webauthn', () => ({
  WebAuthnHandler: vi.fn(function () {
    return { getCredential, createCredential };
  }),
}));

const call = vi.mocked(rpc.call);
const getCred = vi.mocked(getCredential);
const WebAuthnHandlerMock = vi.mocked(WebAuthnHandler);

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

beforeEach(() => {
  call.mockReset();
  getCred.mockReset();
  WebAuthnHandlerMock.mockClear();
});

describe('rpId', () => {
  it('keeps localhost and IPs, strips subdomains to the registrable domain', () => {
    expect(rpId('localhost')).toBe('localhost');
    expect(rpId('127.0.0.1')).toBe('127.0.0.1');
    expect(rpId('filekey.app')).toBe('filekey.app');
    expect(rpId('www.filekey.app')).toBe('filekey.app');
  });
});

describe('useSession', () => {
  it('starts locked', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.locked).toBe(true);
  });

  it('unlock() drives getCredential → prf_to_key → set_seed("_0") and unlocks', async () => {
    const prf = new Uint8Array(64).fill(1).buffer;
    getCred.mockResolvedValueOnce({ key_mat: prf, cred_id: new Uint8Array(16).buffer });
    call.mockResolvedValue(null);
    const { result } = renderHook(() => useSession(), { wrapper });

    let ok = false;
    await act(async () => {
      ok = await result.current.unlock();
    });

    expect(ok).toBe(true);
    expect(result.current.locked).toBe(false);
    // The RP name/id go to the WebAuthnHandler constructor; getCredential takes the
    // PRF-eval object directly.
    expect(WebAuthnHandlerMock).toHaveBeenCalledWith({ name: 'Filekey', id: expect.any(String) });
    const [prfObj] = getCred.mock.calls[0];
    expect(prfObj.first).toBeInstanceOf(ArrayBuffer);
    expect(prfObj.second).toBeInstanceOf(ArrayBuffer);
    expect(call.mock.calls[0][0]).toBe('prf_to_key');
    expect(call.mock.calls[0][1]).toMatchObject({ prf_buff: prf });
    expect(call.mock.calls[1][0]).toBe('set_seed');
    expect(call.mock.calls[1][1]).toMatchObject({ seed_name: '_0' });
  });

  it('unlock() returns false and stays locked when the passkey prompt fails', async () => {
    getCred.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useSession(), { wrapper });

    let ok = true;
    await act(async () => {
      ok = await result.current.unlock();
    });

    expect(ok).toBe(false);
    expect(result.current.locked).toBe(true);
    expect(call).not.toHaveBeenCalled();
  });

  it('lock() sends clear_keys and relocks', async () => {
    getCred.mockResolvedValueOnce({ key_mat: new Uint8Array(64).buffer, cred_id: new Uint8Array(16).buffer });
    call.mockResolvedValue(null);
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {
      await result.current.unlock();
    });

    await act(async () => {
      await result.current.lock();
    });

    expect(call).toHaveBeenLastCalledWith('clear_keys');
    expect(result.current.locked).toBe(true);
  });

  it('getSharePubHex() hex-encodes get_det_public_ecdh and passes null through', async () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    call.mockResolvedValueOnce(new Uint8Array([0x04, 0xa1]).buffer);
    expect(await result.current.getSharePubHex()).toBe('04a1');
    call.mockResolvedValueOnce(null);
    expect(await result.current.getSharePubHex()).toBeNull();
    expect(call.mock.calls.every(([t]) => t === 'get_det_public_ecdh')).toBe(true);
  });
});
