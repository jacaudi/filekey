#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const INPUT = path.join(ROOT, 'app', 'index.html');
const SRC = path.join(ROOT, 'src');

const html = fs.readFileSync(INPUT, 'utf8');
const lines = html.split('\n');

// Actual line structure (1-indexed):
//   Line 19: <style>
//   Lines 20-708: CSS content (689 lines) — indices 19-707
//   Line 709: </style>
//   Lines 710-756: </head>, <body>, body HTML — indices 709-755
//   Line 757: <script> — index 756
//   Lines 758-3541: main JS (2784 lines) — indices 757-3540
//   Line 3542: let ww_js_script = ... — index 3541
//   Lines 3543-3545: </script>, </body>, </html> — indices 3542-3544

// --- Extract CSS (lines 20-708, indices 19-707) ---
const cssLines = lines.slice(19, 708); // between <style> and </style>
const css = cssLines.map(l => l.replace(/^            /, '')).join('\n') + '\n';
fs.mkdirSync(path.join(SRC, 'css'), { recursive: true });
fs.writeFileSync(path.join(SRC, 'css', 'styles.css'), css);
console.log('Extracted: src/css/styles.css (%d lines)', cssLines.length);

// --- Extract HTML template ---
const tmplLines = [
    ...lines.slice(0, 19),          // lines 1-19 (head + <style>)
    '{{CSS}}',
    ...lines.slice(708, 756),       // lines 709-756 (</style> through last body div)
    '        <script>',
    '{{SCRIPT}}',
    ...lines.slice(3542),           // lines 3543-3545 (</script>, </body>, </html>)
];
fs.mkdirSync(SRC, { recursive: true });
fs.writeFileSync(path.join(SRC, 'index.html.tmpl'), tmplLines.join('\n') + '\n');
console.log('Extracted: src/index.html.tmpl');

// --- Extract main JS (lines 758-3541, indices 757-3540) ---
const jsLines = lines.slice(757, 3541); // "use strict" through last function
const mainJs = jsLines.map(l => l.replace(/^            /, '')).join('\n') + '\n';
fs.mkdirSync(path.join(SRC, 'js'), { recursive: true });
fs.writeFileSync(path.join(SRC, 'js', 'main.js'), mainJs);
console.log('Extracted: src/js/main.js (%d lines)', jsLines.length);

// --- Extract and split worker blob (line 3542, index 3541) ---
const blobLine = lines[3541]; // 0-indexed = line 3542
const blobMatch = blobLine.match(/let ww_js_script = `([\s\S]+)`;$/);
if (!blobMatch) throw new Error('Could not find ww_js_script blob on line 3542');
const blob = blobMatch[1].trim();

// Split by top-level function boundaries using brace matching
function splitTopLevelFunction(code, funcName) {
    const marker = 'function ' + funcName + '(';
    const idx = code.indexOf(marker);
    if (idx === -1) throw new Error('Not found: ' + funcName);
    let depth = 0;
    let start = code.indexOf('{', idx);
    for (let i = start; i < code.length; i++) {
        if (code[i] === '{') depth++;
        if (code[i] === '}') depth--;
        if (depth === 0) {
            return {
                before: code.substring(0, idx).trimEnd(),
                func: code.substring(idx, i + 1),
                after: code.substring(i + 1).trimStart()
            };
        }
    }
    throw new Error('Unmatched braces: ' + funcName);
}

// Format minified code: add newlines at semicolons and braces for readability
function format(code) {
    return code
        .replace(/;\s*/g, ';\n')
        .replace(/\{\s*/g, '{\n')
        .replace(/\}\s*/g, '}\n')
        .replace(/^\s+/gm, '')  // strip leading whitespace per line
        .trim() + '\n';
}

const WORKER_DIR = path.join(SRC, 'js', 'worker');
fs.mkdirSync(WORKER_DIR, { recursive: true });

let remaining = blob;

// Extract classes from the end to preserve relative order of remaining code
const classes = ['determineEcdh', 'keccak_handler', 'buffer_helper', 'ww_encryption_handler'];
const extracted = {};
for (const cls of classes) {
    const parts = splitTopLevelFunction(remaining, cls);
    extracted[cls] = parts.func;
    remaining = parts.before + ' ' + parts.after;
}

// remaining = index.js content (entry point + handleMessage + helpers)
fs.writeFileSync(path.join(WORKER_DIR, 'index.js'), format(remaining.trim()));
console.log('Extracted: src/js/worker/index.js');

fs.writeFileSync(path.join(WORKER_DIR, 'encryption.js'), format(extracted.ww_encryption_handler));
console.log('Extracted: src/js/worker/encryption.js');

fs.writeFileSync(path.join(WORKER_DIR, 'buffer.js'), format(extracted.buffer_helper));
console.log('Extracted: src/js/worker/buffer.js');

fs.writeFileSync(path.join(WORKER_DIR, 'keccak.js'), format(extracted.keccak_handler));
console.log('Extracted: src/js/worker/keccak.js');

fs.writeFileSync(path.join(WORKER_DIR, 'ecdh.js'), format(extracted.determineEcdh));
console.log('Extracted: src/js/worker/ecdh.js');

console.log('\nDone. Run "node scripts/build.js" to reassemble.');
