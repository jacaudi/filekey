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

// Main-thread source files in dependency order (matches MAIN_FILES in scripts/build.js)
const MAIN_FILES = [
    'lib/debug.js', 'lib/utils.js', 'lib/buffer.js', 'lib/keccak.js',
    'lib/crypto-storage.js', 'lib/webauthn.js', 'lib/workers.js',
    'ui/renderer.js', 'ui/file-ops.js', 'ui/file-import.js', 'ui/menu.js',
    'app/db-handler.js', 'app/crypto-ops.js', 'app/init.js',
];

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

    it('all main source files exist', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        for (const f of MAIN_FILES) {
            assert.ok(fs.existsSync(path.join(srcDir, 'js', f)),
                `src/js/${f} must exist`);
        }
    });

    it('no main source file exceeds 600 lines', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        for (const f of MAIN_FILES) {
            const content = fs.readFileSync(path.join(srcDir, 'js', f), 'utf8');
            const lineCount = content.split('\n').length;
            assert.ok(lineCount <= 600,
                `src/js/${f} has ${lineCount} lines (max 600)`);
        }
    });

    it('first source file starts with use strict', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        const debug = fs.readFileSync(path.join(srcDir, 'js', 'lib', 'debug.js'), 'utf8');
        assert.ok(debug.startsWith('"use strict"'), 'lib/debug.js must start with use strict');
    });

    it('worker debug.js exists', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        assert.ok(fs.existsSync(path.join(srcDir, 'js', 'worker', 'debug.js')),
            'src/js/worker/debug.js must exist');
    });

    it('all 6 worker source files exist', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        for (const f of ['debug.js', 'index.js', 'encryption.js', 'buffer.js', 'keccak.js', 'ecdh.js']) {
            assert.ok(fs.existsSync(path.join(srcDir, 'js', 'worker', f)),
                `src/js/worker/${f} must exist`);
        }
    });

    it('build script produces valid output', { skip: !hasFullRepo && 'requires full repo access' }, () => {
        // Build to a temp file — avoids overwriting the on-disk app/index.html
        const tmp = path.join(os.tmpdir(), `index-build-test-${process.pid}.html`);
        try {
            execSync(`node scripts/build.js ${tmp}`, { cwd: repoRoot });
            const built = fs.readFileSync(tmp, 'utf8');
            const onDisk = fs.readFileSync(outputFile, 'utf8');
            assert.strictEqual(built, onDisk, 'Build output must match on-disk app/index.html');
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
