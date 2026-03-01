const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..', '..');
const buildScript = path.join(repoRoot, 'scripts', 'build.js');
const srcDir = path.join(repoRoot, 'src');
const outputFile = path.join(__dirname, '..', 'index.html');

// Tests that require full repo access skip gracefully in Docker (app-only mount).
// Check for scripts/ directory (exists after Task 1 extraction, but before Task 3 build.js).
const hasFullRepo = fs.existsSync(path.join(repoRoot, 'scripts'));

describe('Build system (Issue #27)', () => {
    it('build script exists', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        assert.ok(fs.existsSync(buildScript), 'scripts/build.js must exist');
    });

    it('source template exists', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        assert.ok(fs.existsSync(path.join(srcDir, 'index.html.tmpl')));
    });

    it('source CSS exists', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        const css = fs.readFileSync(path.join(srcDir, 'css', 'styles.css'), 'utf8');
        assert.ok(css.length > 100, 'CSS file must have content');
    });

    it('source main.js exists', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        const js = fs.readFileSync(path.join(srcDir, 'js', 'main.js'), 'utf8');
        assert.ok(js.includes('"use strict"'), 'main.js must start with use strict');
    });

    it('all 5 worker source files exist', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        for (const f of ['index.js', 'encryption.js', 'buffer.js', 'keccak.js', 'ecdh.js']) {
            assert.ok(fs.existsSync(path.join(srcDir, 'js', 'worker', f)),
                `src/js/worker/${f} must exist`);
        }
    });

    it('build script produces valid output', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        // Build to a temp file — avoids mutating the committed app/index.html
        const tmp = path.join(os.tmpdir(), `index-build-test-${process.pid}.html`);
        try {
            execSync(`node scripts/build.js ${tmp}`, { cwd: repoRoot });
            const built = fs.readFileSync(tmp, 'utf8');
            const committed = fs.readFileSync(outputFile, 'utf8');
            assert.strictEqual(built, committed, 'Build output must match committed file');
        } finally {
            if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        }
    });

    it('worker files contain expected classes', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        const enc = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'encryption.js'), 'utf8');
        assert.ok(enc.includes('ww_encryption_handler'), 'encryption.js must contain ww_encryption_handler');

        const buf = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'buffer.js'), 'utf8');
        assert.ok(buf.includes('buffer_helper'), 'buffer.js must contain buffer_helper');

        const kec = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'keccak.js'), 'utf8');
        assert.ok(kec.includes('keccak_handler'), 'keccak.js must contain keccak_handler');

        const ecdh = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'ecdh.js'), 'utf8');
        assert.ok(ecdh.includes('determineEcdh'), 'ecdh.js must contain determineEcdh');
    });

    it('worker index.js has handleMessage entry point', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        const idx = fs.readFileSync(path.join(srcDir, 'js', 'worker', 'index.js'), 'utf8');
        assert.ok(idx.includes('handleMessage'), 'index.js must contain handleMessage');
        assert.ok(idx.includes('addEventListener'), 'index.js must register message listener');
    });
});
