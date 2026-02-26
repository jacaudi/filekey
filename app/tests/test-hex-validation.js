// app/tests/test-hex-validation.js
// Tests for ?pub= hex validation (Issue #2)

const assert = require('node:assert');
const { describe, it } = require('node:test');

// Extract the validation logic we're adding
function isValidShareKey(hex_pub) {
    return hex_pub.length === 266 && /^[0-9a-fA-F]+$/.test(hex_pub);
}

describe('Share key hex validation', () => {
    it('accepts valid 266-char hex string', () => {
        const validHex = 'a'.repeat(266);
        assert.strictEqual(isValidShareKey(validHex), true);
    });

    it('accepts mixed-case hex characters', () => {
        const validHex = 'aAbBcCdDeEfF00112233'.padEnd(266, '0');
        assert.strictEqual(isValidShareKey(validHex), true);
    });

    it('rejects non-hex characters', () => {
        const invalidHex = 'g'.repeat(266);
        assert.strictEqual(isValidShareKey(invalidHex), false);
    });

    it('rejects string with spaces', () => {
        const withSpaces = ' '.repeat(266);
        assert.strictEqual(isValidShareKey(withSpaces), false);
    });

    it('rejects string with special characters', () => {
        const special = '0'.repeat(265) + '!';
        assert.strictEqual(isValidShareKey(special), false);
    });

    it('rejects wrong length', () => {
        const tooShort = 'a'.repeat(265);
        assert.strictEqual(isValidShareKey(tooShort), false);
    });

    it('rejects empty string', () => {
        assert.strictEqual(isValidShareKey(''), false);
    });
});
