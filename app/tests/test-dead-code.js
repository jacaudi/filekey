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
    it('webm blob-link path is gone', { skip: !hasFullRepo && 'skip' }, () => {
        const fileOps = read('js/ui/file-ops.js');
        assert.ok(!fileOps.includes('createWebmLink'), 'file-ops.js must not define createWebmLink');
        assert.ok(!fileOps.includes('checkIfViewableType'), 'file-ops.js must not define checkIfViewableType');
        const renderer = read('js/ui/renderer.js');
        assert.ok(!renderer.includes('_blob'), 'renderer.js must not create the hidden _blob element');
        assert.ok(!renderer.includes('special_action'), 'renderer.js must not use .special_action');
        assert.ok(!renderer.includes('case "dl_icon"'), 'getSvg must not keep the orphaned dl_icon case');
        const css = read('css/styles.css');
        assert.ok(!css.includes('special_action'), 'styles.css must not style .special_action');
        assert.ok(!css.includes('action_icon_container'), 'styles.css must not style .action_icon_container');
        assert.ok(css.includes('.dl_icon'), '.dl_icon class must be KEPT (used by the Share icon)');
    });
});
