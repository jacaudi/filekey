#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { stripComments } = require('./strip-comments.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUTPUT = process.argv[2] || path.join(ROOT, 'app', 'index.html');

const template = fs.readFileSync(path.join(SRC, 'index.html.tmpl'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'css', 'styles.css'), 'utf8');

const MAIN_FILES = [
    'lib/debug.js', 'lib/utils.js', 'lib/buffer.js', 'lib/keccak.js',
    'lib/crypto-storage.js', 'lib/webauthn.js', 'lib/workers.js',
    'ui/renderer.js', 'ui/file-ops.js', 'ui/file-import.js', 'ui/modal.js', 'ui/menu.js', 'ui/theme.js',
    'app/db-handler.js', 'app/crypto-ops.js', 'app/init.js',
];
const mainJs = MAIN_FILES
    .map(f => fs.readFileSync(path.join(SRC, 'js', f), 'utf8'))
    .join('\n');

const WORKER_FILES = [
    'worker/debug.js', 'worker/index.js', 'worker/encryption.js',
    'lib/buffer.js', 'worker/keccak.js', 'worker/ecdh.js',
];
const workerBlob = stripComments(
    WORKER_FILES
        .map(f => fs.readFileSync(path.join(SRC, 'js', f), 'utf8'))
        .join('\n')
)
    .replace(/\s+/g, ' ')
    .trim();

function indent(text, spaces) {
    const prefix = ' '.repeat(spaces);
    return text.split('\n')
        .map(line => line.length > 0 ? prefix + line : line)
        .join('\n');
}

let output = template.replace('{{CSS}}', indent(css.trimEnd(), 12));
const workerLine = 'let ww_js_script = ` ' + workerBlob + ' `;';
const fullScript = mainJs.trimEnd() + '\n' + workerLine;
output = output.replace('{{SCRIPT}}', indent(fullScript, 12));

fs.writeFileSync(OUTPUT, output);
const label = path.relative(ROOT, OUTPUT);
console.log('Built: %s (%d bytes)', label, Buffer.byteLength(output));
