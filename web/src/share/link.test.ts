import { describe, expect, it } from 'vitest';
import { parseShareInput, RAW_KEY_RE, shareLink, truncateKey } from './link';

const VALID_HEX = '04' + 'a1b2'.repeat(66); // 2 + 264 = 266 chars
const VALID_UPPER = VALID_HEX.toUpperCase();

describe('RAW_KEY_RE', () => {
  it('matches a valid 266-hex share key', () => {
    expect(RAW_KEY_RE.test(VALID_HEX)).toBe(true);
  });
  it('rejects a key not starting with 04', () => {
    expect(RAW_KEY_RE.test('05' + 'a1b2'.repeat(66))).toBe(false);
  });
  it('rejects wrong lengths and non-hex', () => {
    expect(RAW_KEY_RE.test(VALID_HEX.slice(0, 265))).toBe(false);
    expect(RAW_KEY_RE.test(VALID_HEX + 'a')).toBe(false);
    expect(RAW_KEY_RE.test('04' + 'zz'.repeat(132))).toBe(false);
  });
});

describe('shareLink', () => {
  it('builds the ?pub= deep link on the current origin', () => {
    expect(shareLink(VALID_HEX)).toBe(`${location.origin}/?pub=${VALID_HEX}`);
  });
});

describe('parseShareInput', () => {
  it('accepts a raw valid key and normalizes to lowercase', () => {
    expect(parseShareInput(VALID_HEX)).toBe(VALID_HEX);
    expect(parseShareInput(VALID_UPPER)).toBe(VALID_HEX.toLowerCase());
  });
  it('trims surrounding whitespace', () => {
    expect(parseShareInput(`  ${VALID_HEX}\n`)).toBe(VALID_HEX);
  });
  it('accepts a URL containing ?pub=<valid hex>', () => {
    expect(parseShareInput(`https://filekey.example/?pub=${VALID_HEX}`)).toBe(VALID_HEX);
    expect(parseShareInput(`https://filekey.example/?theme=dark&pub=${VALID_UPPER}`)).toBe(
      VALID_HEX.toLowerCase(),
    );
  });
  it('rejects a URL without pub or with an invalid pub', () => {
    expect(parseShareInput('https://filekey.example/')).toBeNull();
    expect(parseShareInput('https://filekey.example/?pub=04deadbeef')).toBeNull();
  });
  it('rejects garbage, empty, and near-miss keys', () => {
    expect(parseShareInput('')).toBeNull();
    expect(parseShareInput('not a key')).toBeNull();
    expect(parseShareInput('05' + 'a1b2'.repeat(66))).toBeNull();
  });
});

describe('truncateKey', () => {
  it('formats first-4…last-4', () => {
    expect(truncateKey(VALID_HEX)).toBe('04a1…a1b2');
  });
});
