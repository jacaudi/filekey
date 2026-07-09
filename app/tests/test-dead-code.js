const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..', '..');
const srcDir = path.join(repoRoot, 'src');
const hasFullRepo = fs.existsSync(path.join(repoRoot, 'scripts'));

function read(rel) {
    return fs.readFileSync(path.join(srcDir, rel), 'utf8');
}

describe('Dead code stays deleted (antd conversion phase 1, design §10.1)', () => {
    it('topbar notification framework is gone', { skip: !hasFullRepo && 'skip' }, () => {
        assert.ok(!read('js/ui/renderer.js').includes('topbar_ns_handler'),
            'renderer.js must not define topbar_ns_handler');
        assert.ok(!read('js/app/init.js').includes('topbar_ns_handler'),
            'init.js must not instantiate topbar_ns_handler');
        assert.ok(!read('css/styles.css').includes('topbar_ns_container'),
            'styles.css must not style .topbar_ns_container');
        assert.ok(!read('css/styles.css').includes('std_notification'),
            'styles.css must not style .std_notification_* rules');
        assert.ok(!read('css/styles.css').includes('std_notfication_close'),
            'styles.css must not style .std_notfication_close');
    });
});
