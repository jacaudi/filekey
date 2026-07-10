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
