const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..', '..');
const srcDir = path.join(repoRoot, 'src');
const indexHtml = path.join(__dirname, '..', 'index.html');
const hasFullRepo = fs.existsSync(path.join(repoRoot, 'scripts'));

describe('Debug framework', () => {
    it('lib/debug.js defines FK_DEBUG as false', { skip: !hasFullRepo && 'skip' }, () => {
        const src = fs.readFileSync(path.join(srcDir, 'js', 'lib', 'debug.js'), 'utf8');
        assert.ok(src.includes('let FK_DEBUG = false'), 'FK_DEBUG must default to false');
    });

    it('lib/debug.js defines fk_log function', { skip: !hasFullRepo && 'skip' }, () => {
        const src = fs.readFileSync(path.join(srcDir, 'js', 'lib', 'debug.js'), 'utf8');
        assert.ok(src.includes('function fk_log('), 'must define fk_log');
    });

    it('lib/debug.js defines fk_safe_buf function', { skip: !hasFullRepo && 'skip' }, () => {
        const src = fs.readFileSync(path.join(srcDir, 'js', 'lib', 'debug.js'), 'utf8');
        assert.ok(src.includes('function fk_safe_buf('), 'must define fk_safe_buf');
    });

    it('worker/debug.js defines FK_DEBUG as false', { skip: !hasFullRepo && 'skip' }, () => {
        const src = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'debug.js'), 'utf8');
        assert.ok(src.includes('let FK_DEBUG = false'), 'worker FK_DEBUG must default to false');
    });

    it('built output contains FK_DEBUG', { skip: !hasFullRepo && 'skip' }, () => {
        const html = fs.readFileSync(indexHtml, 'utf8');
        assert.ok(html.includes('FK_DEBUG'), 'built index.html must contain FK_DEBUG');
    });

    it('fk_safe_buf never returns raw buffer contents', { skip: !hasFullRepo && 'skip' }, () => {
        const src = fs.readFileSync(path.join(srcDir, 'js', 'lib', 'debug.js'), 'utf8');
        // fk_safe_buf should only return {type, byteLength} -- never buffer data
        assert.ok(!src.includes('.buffer'), 'must not access .buffer property');
        assert.ok(!src.includes('Uint8Array(buf)'), 'must not create typed array from buffer');
    });

    it('no raw console.log in main source files (only inside fk_log)', { skip: !hasFullRepo && 'skip' }, () => {
        const mainFiles = [
            'lib/utils.js', 'lib/buffer.js', 'lib/keccak.js',
            'lib/crypto-storage.js', 'lib/webauthn.js', 'lib/workers.js',
            'ui/renderer.js', 'ui/file-ops.js', 'ui/file-import.js', 'ui/menu.js',
            'app/db-handler.js', 'app/crypto-ops.js', 'app/init.js',
        ];
        for (const f of mainFiles) {
            const filePath = path.join(srcDir, 'js', f);
            if (!fs.existsSync(filePath)) continue; // skip until files exist
            const src = fs.readFileSync(filePath, 'utf8');
            const lines = src.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('//')) continue; // skip comments
                assert.ok(!line.match(/\bconsole\.(log|error|warn|info)\b/),
                    `${f}:${i + 1} has raw console call: "${line.substring(0, 80)}". Use fk_log() instead.`);
            }
        }
    });
});
