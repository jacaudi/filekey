const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const swJs = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

describe('Version placeholder (Issue #10)', () => {
    it('index.html contains __APP_VERSION__ placeholder', () => {
        assert.ok(indexHtml.includes('__APP_VERSION__'),
            'Must contain __APP_VERSION__ placeholder');
    });

    it('does not contain hardcoded version "v 1.05"', () => {
        assert.strictEqual(indexHtml.includes('"v 1.05"'), false,
            'Must not have hardcoded version string');
    });

    it('does not contain changeVersionIfChanged function', () => {
        assert.strictEqual(indexHtml.includes('changeVersionIfChanged'), false,
            'Version composition function must be removed');
    });

    it('does not contain checkSwVersion function', () => {
        assert.strictEqual(indexHtml.includes('checkSwVersion'), false,
            'SW version check function must be removed');
    });

    it('sw.js does not contain change_variable', () => {
        assert.strictEqual(swJs.includes('change_variable'), false,
            'change_variable must be removed from sw.js');
    });

    it('sw.js does not have check_change_variable handler', () => {
        assert.strictEqual(swJs.includes('check_change_variable'), false,
            'check_change_variable message handler must be removed');
    });
});
