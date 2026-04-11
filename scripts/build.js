#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { stripComments } = require('./strip-comments.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUTPUT = process.argv[2] || path.join(ROOT, 'app', 'index.html');

// Read source files
const template = fs.readFileSync(path.join(SRC, 'index.html.tmpl'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'css', 'styles.css'), 'utf8');

// Read main-thread source files in dependency order
const MAIN_FILES = [
    'lib/debug.js', 'lib/utils.js', 'lib/buffer.js', 'lib/keccak.js',
    'lib/crypto-storage.js', 'lib/webauthn.js', 'lib/workers.js',
    'ui/renderer.js', 'ui/file-ops.js', 'ui/file-import.js', 'ui/modal.js', 'ui/menu.js', 'ui/theme.js',
    'app/db-handler.js', 'app/crypto-ops.js', 'app/init.js',
];
const mainParts = MAIN_FILES.map(f =>
    fs.readFileSync(path.join(SRC, 'js', f), 'utf8')
);
const mainJs = mainParts.join('\n');

// Read worker source files in correct order
const WORKER_FILES = ['debug.js', 'index.js', 'encryption.js', 'buffer.js', 'keccak.js', 'ecdh.js'];
const workerParts = WORKER_FILES.map(f =>
    fs.readFileSync(path.join(SRC, 'js', 'worker', f), 'utf8')
);

// Minify worker: strip // and /* */ comments in a string-literal-aware way so
// URL literals and other strings containing `//` are preserved (issues #45, #38).
// Then collapse whitespace for the single-line worker blob.
const workerBlob = stripComments(workerParts.join('\n'))
    .replace(/\s+/g, ' ')
    .trim();

// Indent helper: add prefix to each non-empty line
function indent(text, spaces) {
    const prefix = ' '.repeat(spaces);
    return text.split('\n')
        .map(line => line.length > 0 ? prefix + line : line)
        .join('\n');
}

// Assemble: CSS
let output = template.replace('{{CSS}}', indent(css.trimEnd(), 12));

// Assemble: JS = main.js + worker blob assignment
const workerLine = 'let ww_js_script = ` ' + workerBlob + ' `;';
const fullScript = mainJs.trimEnd() + '\n' + workerLine;
output = output.replace('{{SCRIPT}}', indent(fullScript, 12));

// Write output
fs.writeFileSync(OUTPUT, output);
const label = path.relative(ROOT, OUTPUT);
console.log('Built: %s (%d bytes)', label, Buffer.byteLength(output));
