"use strict";

// Debug mode -- activated by ?debug=true URL parameter.
// When false, fk_log('debug', ...) calls return immediately.
// 'error' and 'warn' levels always log regardless of FK_DEBUG.
let FK_DEBUG = false;

// Structured logging with level filtering and category tags.
// Levels: 'error' (always), 'warn' (always), 'debug' (FK_DEBUG only)
// Tags: 'init', 'worker', 'crypto', 'db', 'ui', 'sw', 'file', 'menu'
function fk_log(level, tag, msg, meta) {
    var prefix = '[FK:' + tag + ']';
    if (level === 'error')
        console.error(prefix, msg, meta !== undefined ? meta : '');
    else if (level === 'warn')
        console.warn(prefix, msg, meta !== undefined ? meta : '');
    else if (FK_DEBUG)
        console.log(prefix, msg, meta !== undefined ? meta : '');
}

// Return safe metadata about a buffer without exposing contents.
// NEVER logs raw bytes -- only type and byte length.
function fk_safe_buf(buf) {
    if (buf === null || buf === undefined) return { type: String(buf) };
    if (buf instanceof ArrayBuffer) return { type: 'ArrayBuffer', byteLength: buf.byteLength };
    if (ArrayBuffer.isView(buf)) return { type: buf.constructor.name, byteLength: buf.byteLength };
    if (typeof buf === 'object' && buf.type) return { type: 'CryptoKey(' + buf.type + ')' };
    return { type: typeof buf };
}
