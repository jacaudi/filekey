const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

describe('fk_modal_handler', function() {
    it('constructor is present in built output', function() {
        assert.ok(html.includes('function fk_modal_handler()'), 'fk_modal_handler constructor not found');
    });

    it('modal is initialized at module level', function() {
        assert.ok(html.includes('new fk_modal_handler()'), 'fk_modal_handler instantiation not found');
    });

    it('dialog element has aria-modal attribute', function() {
        assert.ok(html.includes('"aria-modal"'), 'aria-modal attribute not set');
    });

    it('dialog element has aria-labelledby pointing to fk_modal_title', function() {
        assert.ok(html.includes('"aria-labelledby", "fk_modal_title"'), 'aria-labelledby not set correctly');
    });

    it('base modal CSS is present in built output', function() {
        assert.ok(html.includes('dialog.fk_modal'), 'dialog.fk_modal CSS not found');
    });

    it('close() guards against already-closed dialog', function() {
        assert.ok(html.includes('if (dialog_ele.open) dialog_ele.close()'), 'close() guard not found');
    });

    it('open() guards against already-open dialog', function() {
        assert.ok(html.includes('if (dialog_ele.open) return'), 'open() guard not found');
    });
});
