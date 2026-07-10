import { describe, expect, it } from 'vitest';
import { str_keccak256, strict_hex_keccak256 } from '../src/crypto/keccak';

describe('keccak-256 (ported from src/js/lib/keccak.js)', () => {
  it('matches the known keccak-256 empty-message vector', () => {
    expect(strict_hex_keccak256('')).toBe(
      '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    );
  });

  it('matches the known keccak-256("abc") vector via both entry points', () => {
    const abc = '0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45';
    expect(str_keccak256('abc')).toBe(abc);
    expect(strict_hex_keccak256('616263')).toBe(abc);
  });

  it('returns null for odd-length hex', () => {
    expect(strict_hex_keccak256('0')).toBeNull();
  });

  it('PINS the load-bearing NaN quirk: a "_0" chunk hashes exactly like a 00 byte', () => {
    // The old worker computes seed salts as strict_hex_keccak256(<64 hex chars> + '_0').
    // parseInt('_0', 16) === NaN, which the bitwise sponge coerces to 0. Changing this
    // changes every existing user's Share Key and file keys. DO NOT "fix" it.
    expect(strict_hex_keccak256('00'.repeat(32) + '_0')).toBe(
      strict_hex_keccak256('00'.repeat(32) + '00'),
    );
  });
});
