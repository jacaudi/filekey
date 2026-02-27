// app/tests/test-pkcs8-der-structure.js
// Standalone DER structure validation for buildPKCS8WithPublicKey (Issue #3)
// Implements the reference builder locally and validates every byte offset.
// These tests define the spec and should PASS immediately (and after the fix).

const assert = require('node:assert');
const { describe, it } = require('node:test');

// DER length encoder
function calcLen(len) {
    if (len < 128) return new Uint8Array([len]);
    if (len < 256) return new Uint8Array([0x81, len]);
    return new Uint8Array([0x82, (len >> 8) & 0xFF, len & 0xFF]);
}

// Reference implementation of the unified PKCS#8 builder for P-521
function buildPKCS8WithPublicKey(privateKeyBytes, publicKeyBytes) {
    // OIDs
    const ecPublicKeyOid = new Uint8Array([0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01]);
    const secp521r1Oid   = new Uint8Array([0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x23]);

    // AlgorithmIdentifier SEQUENCE { ecPublicKeyOid, secp521r1Oid }
    const algoContent = new Uint8Array([...ecPublicKeyOid, ...secp521r1Oid]);
    const algoId = new Uint8Array([0x30, ...calcLen(algoContent.length), ...algoContent]);

    // privateKeyBytes: OCTET STRING 04 42 + 66 bytes
    const privOctet = new Uint8Array([0x04, 0x42, ...privateKeyBytes]);

    // [0] parameters { secp521r1Oid }
    const params0 = new Uint8Array([0xA0, 0x07, ...secp521r1Oid]);

    // BIT STRING: 00 + uncompressed public key (133 bytes) = 134 bytes
    const bitStringContent = new Uint8Array([0x00, ...publicKeyBytes]);
    const bitString = new Uint8Array([0x03, ...calcLen(bitStringContent.length), ...bitStringContent]);

    // [1] { BIT STRING }
    const params1 = new Uint8Array([0xA1, ...calcLen(bitString.length), ...bitString]);

    // ECPrivateKey SEQUENCE { version=1, privOctet, [0], [1] }
    const ecPrivContent = new Uint8Array([0x02, 0x01, 0x01, ...privOctet, ...params0, ...params1]);
    const ecPriv = new Uint8Array([0x30, ...calcLen(ecPrivContent.length), ...ecPrivContent]);

    // Outer OCTET STRING wrapping ECPrivateKey
    const outerOctet = new Uint8Array([0x04, ...calcLen(ecPriv.length), ...ecPriv]);

    // version INTEGER 0
    const version = new Uint8Array([0x02, 0x01, 0x00]);

    // Outer SEQUENCE
    const outerContent = new Uint8Array([...version, ...algoId, ...outerOctet]);
    const pkcs8 = new Uint8Array([0x30, ...calcLen(outerContent.length), ...outerContent]);

    return pkcs8;
}

// Generate deterministic test key bytes
const privBytes = new Uint8Array(66);
const pubBytes  = new Uint8Array(133);
privBytes.fill(0xAB);
pubBytes[0] = 0x04;
pubBytes.fill(0xCD, 1, 67);
pubBytes.fill(0xEF, 67);

const pkcs8 = buildPKCS8WithPublicKey(privBytes, pubBytes);

describe('PKCS#8 P-521 DER structure (reference spec)', () => {
    it('total output is exactly 250 bytes', () => {
        assert.strictEqual(pkcs8.length, 250,
            `Expected 250 bytes, got ${pkcs8.length}`);
    });

    it('outer SEQUENCE tag is 0x30', () => {
        assert.strictEqual(pkcs8[0], 0x30, 'Outer tag must be SEQUENCE (0x30)');
    });

    it('outer SEQUENCE length is 0x81 0xF7 (247 bytes)', () => {
        assert.strictEqual(pkcs8[1], 0x81, 'Length prefix byte must be 0x81');
        assert.strictEqual(pkcs8[2], 0xF7, 'Length value must be 0xF7 (247)');
    });

    it('version INTEGER 0 at offset 3', () => {
        assert.strictEqual(pkcs8[3], 0x02, 'Version tag must be INTEGER (0x02)');
        assert.strictEqual(pkcs8[4], 0x01, 'Version length must be 1');
        assert.strictEqual(pkcs8[5], 0x00, 'Version value must be 0');
    });

    it('AlgorithmIdentifier SEQUENCE at offset 6', () => {
        assert.strictEqual(pkcs8[6], 0x30, 'AlgorithmIdentifier must be SEQUENCE');
        assert.strictEqual(pkcs8[7], 0x10, 'AlgorithmIdentifier length must be 16');
    });

    it('ecPublicKey OID at offset 8', () => {
        const oid = [0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01];
        for (let i = 0; i < oid.length; i++) {
            assert.strictEqual(pkcs8[8 + i], oid[i],
                `ecPublicKey OID byte ${i} mismatch at offset ${8 + i}`);
        }
    });

    it('secp521r1 OID at offset 17', () => {
        const oid = [0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x23];
        for (let i = 0; i < oid.length; i++) {
            assert.strictEqual(pkcs8[17 + i], oid[i],
                `secp521r1 OID byte ${i} mismatch at offset ${17 + i}`);
        }
    });

    it('OCTET STRING wrapper at offset 24', () => {
        assert.strictEqual(pkcs8[24], 0x04, 'OCTET STRING tag at offset 24');
        assert.strictEqual(pkcs8[25], 0x81, 'OCTET STRING multi-byte length prefix');
        assert.strictEqual(pkcs8[26], 0xDF, 'OCTET STRING length 223');
    });

    it('ECPrivateKey SEQUENCE at offset 27 with length 0x81 0xDC (220)', () => {
        assert.strictEqual(pkcs8[27], 0x30, 'ECPrivateKey tag must be SEQUENCE');
        assert.strictEqual(pkcs8[28], 0x81, 'ECPrivateKey multi-byte length prefix');
        assert.strictEqual(pkcs8[29], 0xDC, 'ECPrivateKey length must be 220');
    });

    it('ECPrivateKey version INTEGER 1 at offset 30', () => {
        assert.strictEqual(pkcs8[30], 0x02, 'ECPrivateKey version tag INTEGER');
        assert.strictEqual(pkcs8[31], 0x01, 'ECPrivateKey version length 1');
        assert.strictEqual(pkcs8[32], 0x01, 'ECPrivateKey version value 1');
    });

    it('private key OCTET STRING 04 42 at offset 33', () => {
        assert.strictEqual(pkcs8[33], 0x04, 'Private key OCTET STRING tag');
        assert.strictEqual(pkcs8[34], 0x42, 'Private key length 66 (0x42)');
    });

    it('private key bytes embedded correctly at offset 35', () => {
        for (let i = 0; i < 66; i++) {
            assert.strictEqual(pkcs8[35 + i], privBytes[i],
                `Private key byte ${i} mismatch at offset ${35 + i}`);
        }
    });

    it('[0] parameters with secp521r1 OID at offset 101', () => {
        assert.strictEqual(pkcs8[101], 0xA0, '[0] tag at offset 101');
        assert.strictEqual(pkcs8[102], 0x07, '[0] length 7');
        const oid = [0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x23];
        for (let i = 0; i < oid.length; i++) {
            assert.strictEqual(pkcs8[103 + i], oid[i],
                `[0] OID byte ${i} mismatch at offset ${103 + i}`);
        }
    });

    it('[1] public key field at offset 110', () => {
        assert.strictEqual(pkcs8[110], 0xA1, '[1] tag at offset 110');
        assert.strictEqual(pkcs8[111], 0x81, '[1] multi-byte length prefix');
        assert.strictEqual(pkcs8[112], 0x89, '[1] length 137');
    });

    it('BIT STRING at offset 113', () => {
        assert.strictEqual(pkcs8[113], 0x03, 'BIT STRING tag');
        assert.strictEqual(pkcs8[114], 0x81, 'BIT STRING multi-byte length prefix');
        assert.strictEqual(pkcs8[115], 0x86, 'BIT STRING length 134');
        assert.strictEqual(pkcs8[116], 0x00, 'BIT STRING unused bits = 0');
    });

    it('public key bytes embedded correctly at offset 117', () => {
        for (let i = 0; i < 133; i++) {
            assert.strictEqual(pkcs8[117 + i], pubBytes[i],
                `Public key byte ${i} mismatch at offset ${117 + i}`);
        }
    });
});
