import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bufferToHex } from '../crypto/buffer';

const call = vi.fn();
vi.mock('../crypto/client', () => ({
  rpc: { call: (...args: unknown[]) => call(...args) },
}));

import { validateRecipientKey } from './validate';

const CANDIDATE = '04' + 'a1b2'.repeat(66);
const ACTIVE = '04' + 'c3d4'.repeat(66);

beforeEach(() => {
  call.mockReset();
  call.mockResolvedValue(true);
});

describe('validateRecipientKey', () => {
  it('rejects on regex fast path without touching the worker', async () => {
    expect(await validateRecipientKey('garbage', null)).toBe(false);
    expect(await validateRecipientKey('05' + 'a1b2'.repeat(66), null)).toBe(false);
    expect(call).not.toHaveBeenCalled();
  });

  it('dry-runs set_shared_pub with the 133-byte key buffer, transferred', async () => {
    expect(await validateRecipientKey(CANDIDATE, null)).toBe(true);
    expect(call).toHaveBeenCalledTimes(1);
    const [msgType, payload, transfer] = call.mock.calls[0] as [
      string,
      { pub_buff: ArrayBuffer },
      Transferable[],
    ];
    expect(msgType).toBe('set_shared_pub');
    expect(payload.pub_buff.byteLength).toBe(133);
    expect(bufferToHex(payload.pub_buff)).toBe(CANDIDATE.toLowerCase());
    expect(transfer).toEqual([payload.pub_buff]);
  });

  it('returns false when the worker rejects (off-curve point)', async () => {
    call.mockRejectedValueOnce(new Error('importKey failed'));
    expect(await validateRecipientKey(CANDIDATE, null)).toBe(false);
  });

  it('re-sets the active recipient after validating a different candidate', async () => {
    expect(await validateRecipientKey(CANDIDATE, ACTIVE)).toBe(true);
    expect(call).toHaveBeenCalledTimes(2);
    const [, restorePayload] = call.mock.calls[1] as [string, { pub_buff: ArrayBuffer }];
    expect(call.mock.calls[1][0]).toBe('set_shared_pub');
    expect(bufferToHex(restorePayload.pub_buff)).toBe(ACTIVE.toLowerCase());
  });

  it('re-sets the active recipient even when the candidate was invalid', async () => {
    call.mockRejectedValueOnce(new Error('importKey failed'));
    expect(await validateRecipientKey(CANDIDATE, ACTIVE)).toBe(false);
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[1][0]).toBe('set_shared_pub');
  });

  it('does not re-set when the candidate IS the active recipient (case-insensitive)', async () => {
    expect(await validateRecipientKey(CANDIDATE, CANDIDATE.toUpperCase())).toBe(true);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('does not re-set when there is no active recipient', async () => {
    expect(await validateRecipientKey(CANDIDATE, null)).toBe(true);
    expect(call).toHaveBeenCalledTimes(1);
  });
});
