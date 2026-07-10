import { describe, expect, it } from 'vitest';
import { getPrfObject } from './prf';
import { str_keccak256 } from './keccak';
import { hexToArrayBuffer } from './buffer';

describe('getPrfObject', () => {
  // Port of src/js/app/crypto-ops.js:121-129 — the two static PRF eval inputs.
  it('derives first/second from the fixed keccak inputs', () => {
    const obj = getPrfObject();
    const expectedFirst = new Uint8Array(
      hexToArrayBuffer(str_keccak256('filekey_security_key_wallet_first')),
    );
    const expectedSecond = new Uint8Array(
      hexToArrayBuffer(str_keccak256('filekey_security_key_wallet_second')),
    );
    expect(new Uint8Array(obj.first)).toEqual(expectedFirst);
    expect(new Uint8Array(obj.second)).toEqual(expectedSecond);
    expect(obj.first.byteLength).toBe(32);
    expect(obj.second.byteLength).toBe(32);
  });

  it('defaults id to null and passes a provided id through', () => {
    expect(getPrfObject().id).toBeNull();
    const id = new Uint8Array([1, 2, 3]).buffer;
    expect(getPrfObject(id).id).toBe(id);
  });
});
