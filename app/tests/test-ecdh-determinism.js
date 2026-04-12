const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const EXPECTED_PRIV = '42424242424242424242424242424242424242424242424242424242424242424242424242424242424242424242424242424242424242424242424242424243';
const EXPECTED_PUB_X = '19ec40c2353c0b74fd67a85fa829a9a52efa29d461851068e0afb7d8e09bb2f7c58fb0f6630b33f22601a405c964a476b6615d793fcd47c31317a1e9d16e5376daa';
const EXPECTED_PUB_Y = '1445000d4d380221199d2dbc5e1338487c7f7c1803fc1f2a4aba6486bb8ca0adf70f121af64f7f4df7f9a09130bbf1d72a8fd1152afc6ec4948f19e1a4f4b206fab';

function loadEcdhInSandbox() {
    const ecdhSrc = fs.readFileSync(
        path.join(__dirname, '..', '..', 'src', 'js', 'worker', 'ecdh.js'),
        'utf8'
    );
    const sandbox = {
        crypto: { subtle: {} },
        fk_log: function() {},
        console,
    };
    vm.createContext(sandbox);
    vm.runInContext(ecdhSrc, sandbox);
    vm.runInContext('var det = new determineEcdh();', sandbox);
    return sandbox;
}

describe('ECDH determinism (P-521 fixed-seed keypair)', () => {
    let sandbox;

    before(() => {
        sandbox = loadEcdhInSandbox();
    });

    it('generateKeyPair produces identical private/public from a fixed seed', () => {
        const seed = vm.runInContext(`
            (function () {
                const s = new ArrayBuffer(64);
                new Uint8Array(s).fill(0x42);
                return s;
            })()
        `, sandbox);
        const result = vm.runInContext(
            '(function(s) { return det.generateKeyPair(s); })',
            sandbox
        )(seed);

        assert.strictEqual(
            result.privateKey.toString(16),
            EXPECTED_PRIV,
            'private key drifted'
        );
        assert.strictEqual(
            result.publicKey.x.toString(16),
            EXPECTED_PUB_X,
            'public key X drifted'
        );
        assert.strictEqual(
            result.publicKey.y.toString(16),
            EXPECTED_PUB_Y,
            'public key Y drifted'
        );
    });

    it('generateKeyPair rejects a seed of wrong length', () => {
        const bad = vm.runInContext('new ArrayBuffer(32)', sandbox);
        assert.throws(() => {
            vm.runInContext(
                '(function(s) { return det.generateKeyPair(s); })',
                sandbox
            )(bad);
        }, /64-byte/);
    });
});
