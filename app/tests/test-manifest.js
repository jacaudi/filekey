const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const manifest = JSON.parse(fs.readFileSync('/app/manifest.json', 'utf8'));

describe('manifest.json (Issue #12)', () => {
    it('is valid JSON with required fields', () => {
        assert.ok(manifest.name, 'Must have name');
        assert.ok(manifest.short_name, 'Must have short_name');
        assert.ok(manifest.display, 'Must have display');
        assert.ok(manifest.start_url, 'Must have start_url');
    });

    it('has description field', () => {
        assert.ok(typeof manifest.description === 'string' && manifest.description.length > 0,
            'Must have non-empty description');
    });

    it('has categories array', () => {
        assert.ok(Array.isArray(manifest.categories), 'categories must be an array');
        assert.ok(manifest.categories.length > 0, 'categories must not be empty');
    });

    it('has lang field', () => {
        assert.strictEqual(manifest.lang, 'en');
    });

    it('has dir field', () => {
        assert.strictEqual(manifest.dir, 'ltr');
    });

    it('has orientation field', () => {
        assert.strictEqual(manifest.orientation, 'any');
    });

    it('SVG icons use "any" for sizes', () => {
        const svgIcons = manifest.icons.filter(i => i.type === 'image/svg+xml');
        assert.ok(svgIcons.length > 0, 'Must have at least one SVG icon');
        for (const icon of svgIcons) {
            assert.strictEqual(icon.sizes, 'any',
                `SVG icon ${icon.src} should use sizes="any", not pixel values`);
        }
    });

    it('has at least one maskable icon', () => {
        const maskable = manifest.icons.filter(i =>
            i.purpose && i.purpose.includes('maskable'));
        assert.ok(maskable.length > 0, 'Must have at least one icon with purpose "maskable"');
    });
});
