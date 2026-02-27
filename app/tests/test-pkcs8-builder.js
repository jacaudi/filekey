// app/tests/test-pkcs8-builder.js
// Structural tests for PKCS#8 unified builder (Issue #3)
// These tests read index.html and assert old fragile code is gone
// and new unified builder exists. Must FAIL before fix, PASS after.

const assert = require('node:assert');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(
    path.join(__dirname, '..', 'index.html'), 'utf-8'
);

describe('PKCS#8 unified builder (Issue #3)', () => {
    it('does not contain findAndReplaceKey function', () => {
        assert.strictEqual(
            indexHtml.includes('function findAndReplaceKey(template, newKey)'),
            false,
            'findAndReplaceKey should be removed -- fragile byte-pattern search'
        );
    });

    it('does not contain findAndReplacePublicKey function', () => {
        assert.strictEqual(
            indexHtml.includes('function findAndReplacePublicKey(template, newKey)'),
            false,
            'findAndReplacePublicKey should be removed'
        );
    });

    it('does not contain convertSafariPKCS8Deterministic function', () => {
        assert.strictEqual(
            indexHtml.includes('convertSafariPKCS8Deterministic'),
            false,
            'Safari template-and-patch path should be removed'
        );
    });

    it('does not contain Safari UA sniffing in key conversion', () => {
        assert.strictEqual(
            indexHtml.includes('Using Safari-specific deterministic implementation'),
            false,
            'Safari-specific log messages should be removed'
        );
    });

    it('does not contain template key generation log', () => {
        assert.strictEqual(
            indexHtml.includes('Template key pair generated successfully'),
            false,
            'Template-based log messages should be removed'
        );
    });

    it('contains buildPKCS8WithPublicKey function', () => {
        assert.strictEqual(
            indexHtml.includes('buildPKCS8WithPublicKey'),
            true,
            'Unified PKCS#8 builder function must exist'
        );
    });

    it('passes publicKey to convertToPKCS8', () => {
        assert.strictEqual(
            indexHtml.includes('convertToPKCS8(privateKey, publicKey,'),
            true,
            'convertToPKCS8 must receive both privateKey and publicKey'
        );
    });

    it('contains round-trip verification logic', () => {
        assert.strictEqual(
            indexHtml.includes('round-trip verification failed'),
            true,
            'Must include round-trip verification after PKCS#8 import'
        );
    });
});
