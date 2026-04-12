const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = path.join(__dirname, '..', 'index.html');

describe('Worker bundle buffer helpers', () => {
    it('built index.html contains bufferToHex in worker blob', () => {
        const html = fs.readFileSync(indexHtml, 'utf8');
        const match = html.match(/let ww_js_script = `([^`]*)`/);
        assert.ok(match, 'must contain ww_js_script template literal');
        const workerBlob = match[1];
        assert.ok(
            workerBlob.includes('function bufferToHex'),
            'worker blob must define bufferToHex'
        );
        assert.ok(
            workerBlob.includes('function hexToArrayBuffer'),
            'worker blob must define hexToArrayBuffer'
        );
    });
});
