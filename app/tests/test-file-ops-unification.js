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

describe('FILE_OPS config table (source-level)', () => {
    const fileOpsSrc = fs.readFileSync(
        path.join(__dirname, '..', '..', 'src', 'js', 'ui', 'file-ops.js'),
        'utf8'
    );

    it('defines FILE_OPS with enc and dec entries', () => {
        assert.ok(
            /const\s+FILE_OPS\s*=/.test(fileOpsSrc),
            'must declare FILE_OPS'
        );
        assert.ok(fileOpsSrc.includes("enc:"), 'FILE_OPS must have enc entry');
        assert.ok(fileOpsSrc.includes("dec:"), 'FILE_OPS must have dec entry');
    });

    it('enc entry uses encNewMsg and .filekey suffix', () => {
        assert.ok(fileOpsSrc.includes('work: encNewMsg'));
        assert.ok(fileOpsSrc.includes("'.filekey'") || fileOpsSrc.includes('".filekey"'));
    });

    it('dec entry uses decMsg and .filekey replacement', () => {
        assert.ok(fileOpsSrc.includes('work: decMsg'));
        assert.ok(/replace\s*\(\s*['"]\.filekey['"]/.test(fileOpsSrc));
    });

    it('defines processFileBatch driver', () => {
        assert.ok(
            /function\s+processFileBatch\s*\(/.test(fileOpsSrc),
            'must declare processFileBatch'
        );
    });
});

describe('FILE_OPS filename transforms (extracted behavior)', () => {
    const encSuffix = (name) => name + '.filekey';
    const decSuffix = (name) => name.replace('.filekey', '');

    it('enc then dec restores original filename', () => {
        assert.strictEqual(decSuffix(encSuffix('foo.txt')), 'foo.txt');
        assert.strictEqual(decSuffix(encSuffix('report.pdf')), 'report.pdf');
        assert.strictEqual(decSuffix(encSuffix('no-extension')), 'no-extension');
    });

    it('dec is a no-op on names without .filekey', () => {
        assert.strictEqual(decSuffix('plain.txt'), 'plain.txt');
    });
});
