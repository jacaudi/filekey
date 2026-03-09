const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..', '..');
const srcDir = path.join(repoRoot, 'src');
const hasFullRepo = fs.existsSync(path.join(repoRoot, 'scripts'));

function getCaseBlock(src, caseName) {
    const start = src.indexOf('"' + caseName + '"');
    if (start === -1) return '';
    const end = src.indexOf('break;', start);
    return src.substring(start, end);
}

describe('Worker .catch() handlers (issue #35)', () => {
    describe('encryption.js .catch() handlers', () => {
        it('encrypt has .catch with error logging', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'encryption.js'), 'utf8');
            assert.ok(src.includes('encrypt failed:'), 'encrypt .catch must log error');
        });

        it('deriveEcdhKey has .catch with error logging', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'encryption.js'), 'utf8');
            assert.ok(src.includes('deriveEcdhKey failed:'), 'deriveEcdhKey .catch must log error');
        });

        it('importEcdhPub has .catch with error logging', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'encryption.js'), 'utf8');
            assert.ok(src.includes('importEcdhPub failed:'), 'importEcdhPub .catch must log error');
        });
    });

    describe('index.js .catch() handlers', () => {
        it('keyToSeed has .catch with error logging', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            assert.ok(src.includes('keyToSeed deriveBits failed:'), 'keyToSeed .catch must log error');
        });

        it('generateAesFromHkdf has .catch with error logging', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            assert.ok(src.includes('generateAesFromHkdf deriveKey failed:'), 'generateAesFromHkdf .catch must log error');
        });

        it('unhandledrejection uses uncaught tag', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            const urStart = src.indexOf('unhandledrejection');
            const urEnd = src.indexOf('});', urStart);
            const urBlock = src.substring(urStart, urEnd);
            assert.ok(urBlock.includes("'uncaught'"), 'unhandledrejection must use uncaught tag');
        });

        it('unhandledrejection calls postMessage(null)', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            const urStart = src.indexOf('unhandledrejection');
            const urEnd = src.indexOf('});', urStart);
            const urBlock = src.substring(urStart, urEnd);
            assert.ok(urBlock.includes('postMessage(null)'), 'unhandledrejection must call postMessage(null)');
        });
    });

    describe('Null-propagation guards in handleMessage', () => {
        it('set_seed guards seed and hkdf callbacks', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            const block = getCaseBlock(src, 'set_seed');
            assert.ok(block.includes('seed===null'), 'must guard seed callback');
            assert.ok(block.includes('hkdf===null'), 'must guard hkdf callback');
        });

        it('new_enc guards ret and encrypted_buff callbacks', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            const block = getCaseBlock(src, 'new_enc');
            assert.ok(block.includes('ret===null'), 'must guard ret callback');
            assert.ok(block.includes('encrypted_buff===null'), 'must guard encrypted_buff callback');
        });

        it('new_dec guards ret callback', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            const block = getCaseBlock(src, 'new_dec');
            assert.ok(block.includes('ret===null'), 'must guard ret callback');
        });

        it('set_shared_pub guards key callback', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            const block = getCaseBlock(src, 'set_shared_pub');
            assert.ok(block.includes('key===null'), 'must guard key callback');
        });

        it('shared_ecdh_enc guards derived_key and encrypted_buff callbacks', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            const block = getCaseBlock(src, 'shared_ecdh_enc');
            assert.ok(block.includes('derived_key===null'), 'must guard derived_key callback');
            assert.ok(block.includes('encrypted_buff===null'), 'must guard encrypted_buff callback');
        });

        it('shared_ecdh_dec guards shared_pub and derived_key callbacks', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
            const block = getCaseBlock(src, 'shared_ecdh_dec');
            assert.ok(block.includes('shared_pub===null'), 'must guard shared_pub callback');
            assert.ok(block.includes('derived_key===null'), 'must guard derived_key callback');
        });
    });

    describe('Main thread error display', () => {
        it('doStuff shows encryption failure message', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'ui', 'file-ops.js'), 'utf8');
            assert.ok(src.includes('Failed to encrypt file'), 'doStuff must show encrypt failure');
        });

        it('handleShare shows sharing failure message', { skip: !hasFullRepo && 'skip' }, () => {
            const src = fs.readFileSync(path.join(srcDir, 'js', 'ui', 'file-ops.js'), 'utf8');
            assert.ok(src.includes('Failed to encrypt file for sharing'), 'handleShare must show share failure');
        });
    });
});
