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

    it('ecdh.js public key importKey does not use extractable: true', function() {
        assert.ok(
            !html.includes('rawPublicKey.buffer, { name: "ECDH", namedCurve: "P-521" } , true, []'),
            'ECDH public key (ecdh.js convertPublicKeyToRaw) must not use extractable: true'
        );
    });

    it('ecdh.js public key importKey uses extractable: false', function() {
        assert.ok(
            html.includes('rawPublicKey.buffer, { name: "ECDH", namedCurve: "P-521" } , false, []'),
            'ECDH public key (ecdh.js convertPublicKeyToRaw) must use extractable: false'
        );
    });
});
