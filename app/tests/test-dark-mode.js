const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const style_start = html.indexOf('<style>');
const style_end = html.indexOf('</style>');
const css = html.slice(style_start, style_end);
const script_start = html.indexOf('<script>');
const script_end = html.lastIndexOf('</script>');
const script = html.slice(script_start, script_end);

describe('dark mode CSS', function() {
    it('defines --bg variable', function() {
        assert.ok(css.includes('--bg:'), 'missing --bg');
    });
    it('defines --surface variable', function() {
        assert.ok(css.includes('--surface:'), 'missing --surface');
    });
    it('defines --text variable', function() {
        assert.ok(css.includes('--text:'), 'missing --text');
    });
    it('defines --blue variable', function() {
        assert.ok(css.includes('--blue:'), 'missing --blue');
    });
    it('has dark prefers-color-scheme media query', function() {
        assert.ok(css.includes('prefers-color-scheme: dark'), 'missing dark media query');
    });
    it('has data-theme="dark" selector', function() {
        assert.ok(css.includes('[data-theme="dark"]'), 'missing dark selector');
    });
    it('has data-theme="light" selector', function() {
        assert.ok(css.includes('[data-theme="light"]'), 'missing light selector');
    });
    it('uses var(--bg) not hardcoded #fff for backgrounds', function() {
        assert.ok(!css.includes('background-color: #fff'), 'hardcoded background-color: #fff found');
    });
});

describe('dark mode icons', function() {
    it('has moon_icon in getSvg', function() {
        assert.ok(script.includes('"moon_icon"'), 'missing moon_icon');
    });
    it('has sun_icon in getSvg', function() {
        assert.ok(script.includes('"sun_icon"'), 'missing sun_icon');
    });
});

describe('dark mode toggle button', function() {
    it('has theme_toggle button in HTML', function() {
        assert.ok(html.includes('id=theme_toggle'), 'missing #theme_toggle button');
    });
});

describe('dark mode JS', function() {
    it('defines initTheme function', function() {
        assert.ok(script.includes('function initTheme('), 'missing initTheme');
    });
    it('defines toggleTheme function', function() {
        assert.ok(script.includes('function toggleTheme('), 'missing toggleTheme');
    });
    it('calls initTheme in domInit', function() {
        assert.ok(script.includes('initTheme()'), 'initTheme not called');
    });
});
