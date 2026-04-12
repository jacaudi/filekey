const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'js', 'lib', 'crypto-storage.js'),
    'utf8'
);

function loadSecureOverwrite() {
    const fn = new Function(src + '; return secureOverwriteBuffer;');
    return fn();
}

describe('secureOverwriteBuffer', () => {
    it('fills buffer with FF-00-FF-00 pattern', (t, done) => {
        const secureOverwriteBuffer = loadSecureOverwrite();
        secureOverwriteBuffer(16, (buf) => {
            const view = new Uint8Array(buf);
            assert.strictEqual(view.length, 16);
            assert.deepStrictEqual(
                Array.from(view),
                [0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00,
                 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00]
            );
            done();
        });
    });

    it('handles zero length', (t, done) => {
        const secureOverwriteBuffer = loadSecureOverwrite();
        secureOverwriteBuffer(0, (buf) => {
            assert.strictEqual(buf.byteLength, 0);
            done();
        });
    });

    it('handles length not divisible by 4', (t, done) => {
        const secureOverwriteBuffer = loadSecureOverwrite();
        secureOverwriteBuffer(5, (buf) => {
            const view = new Uint8Array(buf);
            assert.strictEqual(view.length, 5);
            assert.deepStrictEqual(
                Array.from(view),
                [0xFF, 0x00, 0xFF, 0x00, 0xFF]
            );
            done();
        });
    });
});
