const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = path.join(__dirname, '..', 'index.html');

describe('file-ops public entry points', () => {
    it('built index.html declares doStuff as a top-level function', () => {
        const html = fs.readFileSync(indexHtml, 'utf8');
        assert.ok(
            /function\s+doStuff\s*\(/.test(html),
            'must contain function doStuff(...)'
        );
    });

    it('built index.html declares undoStuff as a top-level function', () => {
        const html = fs.readFileSync(indexHtml, 'utf8');
        assert.ok(
            /function\s+undoStuff\s*\(/.test(html),
            'must contain function undoStuff(...)'
        );
    });
});
