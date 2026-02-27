// app/tests/test-ecdh-fallback.js
// Tests for Safari ECDH fallback removal (Issue #1)

const assert = require('node:assert');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(
    path.join(__dirname, '..', 'index.html'),
    'utf-8'
);

describe('Safari ECDH fallback removal', () => {
    it('does not contain fallback template key code', () => {
        assert.strictEqual(
            indexHtml.includes('Fallback: Using template key'),
            false,
            'Found dangerous fallback code — "Fallback: Using template key" should be removed'
        );
    });

    it('does not contain "Using template key (non-deterministic)" warning', () => {
        assert.strictEqual(
            indexHtml.includes('Using template key (non-deterministic)'),
            false,
            'Found non-deterministic warning — fallback should be completely removed'
        );
    });

    it('does not contain "Template key imported as fallback" log', () => {
        assert.strictEqual(
            indexHtml.includes('Template key imported as fallback'),
            false,
            'Found fallback log message — should be removed'
        );
    });

    it('contains error handling that calls inner_cb with success: false', () => {
        assert.strictEqual(
            indexHtml.includes('PKCS#8 import failed:'),
            true,
            'Missing error log for PKCS#8 import failure in unified builder'
        );
    });

    it('genDetEcdh checks result.privateKey.success before assigning keys', () => {
        assert.strictEqual(
            indexHtml.includes('if(!result.privateKey.success)'),
            true,
            'genDetEcdh should check privateKey.success before assigning keys'
        );
    });
});

describe('Share file null guard', () => {
    it('handleShare checks for null pub key before combining buffers', () => {
        assert.strictEqual(
            indexHtml.includes('Share Key is unavailable'),
            true,
            'handleShare should show error when pub key is null'
        );
    });

    it('handleShare calls getDetEcdhPublicKey before shareEnc to avoid wasted worker calls', () => {
        const handleShareStart = indexHtml.indexOf('function handleShare(ps_data)');
        assert.notStrictEqual(handleShareStart, -1, 'handleShare function not found');
        const getDetEcdhIdx = indexHtml.indexOf('getDetEcdhPublicKey', handleShareStart);
        const shareEncIdx = indexHtml.indexOf('shareEnc(', handleShareStart);
        assert.ok(
            getDetEcdhIdx < shareEncIdx,
            `getDetEcdhPublicKey (pos ${getDetEcdhIdx}) must appear before shareEnc (pos ${shareEncIdx}) in handleShare`
        );
    });
});
