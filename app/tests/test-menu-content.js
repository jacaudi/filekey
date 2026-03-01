const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const indexHtml = fs.readFileSync('/app/index.html', 'utf8');

describe('Menu content cleanup (Issues #7, #8)', () => {
    it('has no reference to /source.txt', () => {
        assert.strictEqual(indexHtml.includes('/source.txt'), false,
            'Must remove broken /source.txt link');
    });

    it('has no PayPal donate link', () => {
        assert.strictEqual(indexHtml.includes('HCN6NHN39KA44'), false,
            'Must remove upstream PayPal hosted_button_id');
    });

    it('has no Signal group link', () => {
        assert.strictEqual(indexHtml.includes('signal.group'), false,
            'Must remove upstream Signal group link');
    });

    it('has no Substack link', () => {
        assert.strictEqual(indexHtml.includes('filekey.substack.com'), false,
            'Must remove upstream Substack link');
    });

    it('has no upstream email reference', () => {
        assert.strictEqual(indexHtml.includes('contact@filekey.app'), false,
            'Must remove upstream contact email');
    });

    it('GitHub link points to jacaudi/filekey', () => {
        assert.ok(indexHtml.includes('github.com/jacaudi/filekey'),
            'GitHub link must point to jacaudi/filekey');
    });

    it('has no reference to RockwellShah/filekey', () => {
        assert.strictEqual(indexHtml.includes('RockwellShah/filekey'), false,
            'Must not reference upstream RockwellShah repo');
    });

    it('source code menu links to GitHub', () => {
        assert.ok(indexHtml.includes('github.com/jacaudi/filekey'),
            'Source code should link to GitHub repo');
    });
});
