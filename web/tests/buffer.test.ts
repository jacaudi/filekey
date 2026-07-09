import { describe, expect, it } from 'vitest';
import {
  bufferToHex,
  combineArrayBuffers,
  hexStringToHexNumber,
  hexToArrayBuffer,
  hexToUint8Array,
} from '../src/crypto/buffer';

describe('buffer helpers (ported from src/js/lib/buffer.js)', () => {
  it('bufferToHex pads and lowercases', () => {
    expect(bufferToHex(new Uint8Array([0, 1, 15, 255]))).toBe('00010fff');
    expect(bufferToHex(new Uint8Array([0, 1, 15, 255]).buffer)).toBe('00010fff');
  });

  it('hexStringToHexNumber strips 0x/0X prefix only', () => {
    expect(hexStringToHexNumber('0xAB')).toBe('AB');
    expect(hexStringToHexNumber('0Xab')).toBe('ab');
    expect(hexStringToHexNumber('ab')).toBe('ab');
  });

  it('hexToUint8Array / hexToArrayBuffer round-trip with bufferToHex', () => {
    const hex = '04a1ff00';
    expect(bufferToHex(hexToUint8Array(hex))).toBe(hex);
    expect(bufferToHex(hexToArrayBuffer('0x' + hex))).toBe(hex);
  });

  it('combineArrayBuffers concatenates', () => {
    const combined = combineArrayBuffers(new Uint8Array([1, 2]).buffer, new Uint8Array([3]).buffer);
    expect(new Uint8Array(combined)).toEqual(new Uint8Array([1, 2, 3]));
  });
});
