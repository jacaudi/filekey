// app/tests/test-sw-offline.js
// Structural tests for service worker offline fallback (Issue #4)
// Must FAIL on current sw.js, PASS after rewrite.

const assert = require('node:assert');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const swJs = fs.readFileSync(
    path.join(__dirname, '..', 'sw.js'), 'utf-8'
);

describe('Service worker structure (Issue #4)', () => {
    it('has exactly one install event listener', () => {
        const matches = swJs.match(/addEventListener\(\s*['"]install['"]/g);
        assert.strictEqual(matches ? matches.length : 0, 1,
            `Expected 1 install listener, found ${matches ? matches.length : 0}`);
    });

    it('has exactly one activate event listener', () => {
        const matches = swJs.match(/addEventListener\(\s*['"]activate['"]/g);
        assert.strictEqual(matches ? matches.length : 0, 1,
            `Expected 1 activate listener, found ${matches ? matches.length : 0}`);
    });

    it('pre-caches manifest.json', () => {
        assert.ok(swJs.includes('/manifest.json'),
            'sw.js must pre-cache /manifest.json');
    });

    it('pre-caches logo.svg', () => {
        assert.ok(swJs.includes('/logo.svg'),
            'sw.js must pre-cache /logo.svg');
    });

    it('has a .catch() on the fetch handler', () => {
        assert.ok(swJs.includes('.catch('),
            'fetch handler must have a .catch() for offline fallback');
    });

    it('returns a synthetic Response in the catch handler', () => {
        assert.ok(swJs.includes('new Response('),
            'catch handler must return a synthetic Response');
    });

    it('distinguishes navigation requests for offline fallback', () => {
        assert.ok(swJs.includes('navigate'),
            'fetch handler should check request.mode for navigation');
    });

    it('uses 503 status for non-navigation offline responses', () => {
        assert.ok(swJs.includes('503'),
            'Non-navigation offline fallback should use 503 status');
    });

    it('filters for same-origin requests only', () => {
        assert.ok(swJs.includes('origin'),
            'fetch handler must filter for same-origin requests');
    });

    it('calls skipWaiting chained with precache (not in separate listener)', () => {
        assert.ok(swJs.includes('skipWaiting()'),
            'sw.js must call skipWaiting()');
        const standalone = swJs.match(
            /addEventListener\(['"]install['"],\s*(?:event|e)\s*=>\s*\{\s*self\.skipWaiting\(\)/
        );
        assert.strictEqual(standalone, null,
            'skipWaiting should not be in its own separate install listener');
    });

    it('calls clients.claim() in the activate handler', () => {
        assert.ok(swJs.includes('clients.claim()'),
            'activate handler must call clients.claim()');
    });
});
