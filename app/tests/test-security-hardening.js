'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

describe('ECDH key non-extractable (#36)', function() {
    it('private key importKey does not use extractable: true', function() {
        assert.ok(
            !html.includes(', true, ["deriveKey"'),
            'ECDH private key must not use extractable: true'
        );
    });

    it('private key importKey uses extractable: false', function() {
        assert.ok(
            html.includes(', false, ["deriveKey"'),
            'ECDH private key must use extractable: false'
        );
    });

    it('no ECDH importKey call uses extractable: true', function() {
        assert.ok(
            !html.includes('namedCurve: "P-521" } , true,'),
            'No ECDH importKey call may use extractable: true'
        );
    });

    it('all ECDH importKey calls use extractable: false', function() {
        // Verify no remaining true patterns
        const trueMatches = (html.match(/namedCurve: "P-521" } , true,/g) || []).length;
        assert.strictEqual(trueMatches, 0, 'No ECDH importKey should use extractable: true');
    });
});

describe('Filename sanitization (#37)', function() {
    it('sanitizeFilename function is present in built output', function() {
        assert.ok(
            html.includes('function sanitizeFilename('),
            'sanitizeFilename must be defined in built output'
        );
    });

    it('sanitizeFilename truncates to 255 characters', function() {
        const idx = html.indexOf('function sanitizeFilename(');
        assert.ok(idx !== -1, 'sanitizeFilename must exist');
        const body = html.slice(idx, idx + 300);
        assert.ok(
            body.includes('.slice(0,255)') || body.includes('.slice(0, 255)'),
            'sanitizeFilename must truncate to 255 chars'
        );
    });

    it('download_ab calls sanitizeFilename', function() {
        const idx = html.indexOf('function download_ab(');
        assert.ok(idx !== -1, 'download_ab must exist');
        const body = html.slice(idx, idx + 500);
        assert.ok(
            body.includes('sanitizeFilename('),
            'download_ab must call sanitizeFilename'
        );
    });

    it('sanitizeFilename strips path separators and null bytes', function() {
        const idx = html.indexOf('function sanitizeFilename(');
        assert.ok(idx !== -1, 'sanitizeFilename must exist');
        const body = html.slice(idx, idx + 300);
        assert.ok(
            body.includes("replace(/[/\\\\]/g,'')") || body.includes("replace(/[/\\\\]/g, '')"),
            'must strip slashes'
        );
        assert.ok(
            body.includes("replace(/\\x00/g,'')") || body.includes("replace(/\\x00/g, '')"),
            'must strip null bytes'
        );
    });
});
