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
