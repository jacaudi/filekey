"use strict";

let FK_DEBUG = false;

function fk_log(level, tag, msg, meta) {
    var prefix = '[FK:' + tag + ']';
    if (level === 'error')
        console.error(prefix, msg, meta !== undefined ? meta : '');
    else if (level === 'warn')
        console.warn(prefix, msg, meta !== undefined ? meta : '');
    else if (FK_DEBUG)
        console.log(prefix, msg, meta !== undefined ? meta : '');
}

function fk_safe_buf(buf) {
    if (buf === null || buf === undefined) return { type: String(buf) };
    if (buf instanceof ArrayBuffer) return { type: 'ArrayBuffer', byteLength: buf.byteLength };
    if (ArrayBuffer.isView(buf)) return { type: buf.constructor.name, byteLength: buf.byteLength };
    if (typeof buf === 'object' && buf.type) return { type: 'CryptoKey(' + buf.type + ')' };
    return { type: typeof buf };
}
