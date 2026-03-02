#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'js');
const mainJs = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8').split('\n');

// Extract lines (1-indexed, inclusive)
function extract(start, end) { return mainJs.slice(start - 1, end).join('\n') + '\n'; }
function extractMulti(ranges) { return ranges.map(([s, e]) => extract(s, e)).join('\n'); }

const files = {
    // lib/utils.js: checkForProperty, getRandomInclusive, get_query_strings
    'lib/utils.js':          extract(1771, 1818),
    // lib/buffer.js: buffer_helper constructor
    'lib/buffer.js':         extract(2042, 2094),
    // lib/keccak.js: keccak_handler constructor
    'lib/keccak.js':         extract(2131, 2428),
    // lib/crypto-storage.js: compressor, database, secureOverwriteBuffer, securelyDeleteFromStore
    'lib/crypto-storage.js': extractMulti([[2429, 2557], [2558, 2673]]),
    // lib/webauthn.js: webauthn_handler constructor
    'lib/webauthn.js':       extract(1900, 2011),
    // lib/workers.js: blobWorkersHandler constructor
    'lib/workers.js':        extract(1819, 1899),
    // ui/renderer.js: html_builder, htmlWriter, animations, topbar, font, clipboard
    'ui/renderer.js':        extractMulti([[1390, 1588], [1589, 1770], [2012, 2041], [2095, 2130], [2674, 2785]]),
    // ui/file-ops.js: createDownloadEle, encrypt/decrypt flows, status, download objects
    'ui/file-ops.js':        extractMulti([[436, 610], [735, 946]]),
    // ui/file-import.js: setFileImport, drag/drop, handleNewFiles, displayFiles
    'ui/file-import.js':     extractMulti([[947, 972], [1153, 1389]]),
    // ui/menu.js: initChizMenu, displayPublicKey, clearAll, genNewPasskey
    'ui/menu.js':            extract(190, 360),
    // app/db-handler.js: fk_db_handler constructor
    'app/db-handler.js':     extract(611, 734),
    // app/crypto-ops.js: PRF, seeds, encrypt/decrypt dispatch, ECDH sharing
    'app/crypto-ops.js':     extractMulti([[361, 435], [973, 1055], [1056, 1152]]),
    // app/init.js: global vars, domInit, all init* functions (LAST - line 1 "use strict" is in debug.js)
    'app/init.js':           extract(2, 189),
};

for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(SRC, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    const lineCount = content.split('\n').length - 1;
    console.log(`Created: src/js/${relPath} (${lineCount} lines)`);
}
console.log('\nDone. Now update scripts/build.js and rebuild.');
