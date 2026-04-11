'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { stripComments } = require(path.join(__dirname, '..', '..', 'scripts', 'strip-comments.js'));

test('empty input returns empty string', () => {
    assert.equal(stripComments(''), '');
});

test('plain code with no comments is unchanged', () => {
    const src = 'const x = 1;\nconst y = 2;';
    assert.equal(stripComments(src), src);
});

test('strips end-of-line // comment', () => {
    const src = 'const x = 1; // a comment\nconst y = 2;';
    const out = stripComments(src);
    assert.ok(!out.includes('a comment'), 'comment text should be stripped');
    assert.ok(out.includes('const x = 1;'), 'code before comment preserved');
    assert.ok(out.includes('const y = 2;'), 'following line preserved');
});

test('strips /* block */ comment on one line', () => {
    const src = 'const x = 1; /* block comment */ const y = 2;';
    const out = stripComments(src);
    assert.ok(!out.includes('block comment'), 'block comment text should be stripped');
    assert.ok(out.includes('const x = 1;'), 'code before comment preserved');
    assert.ok(out.includes('const y = 2;'), 'code after comment preserved');
});

test('strips multi-line /* ... */ block comment', () => {
    const src = 'const x = 1;\n/* line one\n   line two\n   line three */\nconst y = 2;';
    const out = stripComments(src);
    assert.ok(!out.includes('line one'), 'block comment line 1 stripped');
    assert.ok(!out.includes('line two'), 'block comment line 2 stripped');
    assert.ok(!out.includes('line three'), 'block comment line 3 stripped');
    assert.ok(out.includes('const x = 1;'));
    assert.ok(out.includes('const y = 2;'));
});

test('URL inside double-quoted string survives (issue #45)', () => {
    const src = 'const url = "https://example.com/path"; // real comment';
    const out = stripComments(src);
    assert.ok(out.includes('"https://example.com/path"'),
        'URL literal with // must not be mangled');
    assert.ok(!out.includes('real comment'), 'eol comment after the string is stripped');
});

test('URL inside single-quoted string survives', () => {
    const src = "const url = 'https://example.com'; // trailing";
    const out = stripComments(src);
    assert.ok(out.includes("'https://example.com'"),
        'single-quoted URL must survive');
    assert.ok(!out.includes('trailing'));
});

test('URL inside template literal survives', () => {
    const src = 'const url = `https://example.com/${path}`; // tail';
    const out = stripComments(src);
    assert.ok(out.includes('`https://example.com/${path}`'),
        'template literal URL must survive');
    assert.ok(!out.includes('tail'));
});

test('escaped quote inside string does not end the string', () => {
    const src = 'const s = "a\\"b//c"; // real';
    const out = stripComments(src);
    assert.ok(out.includes('"a\\"b//c"'),
        'escaped-quote string contents must survive verbatim');
    assert.ok(!out.includes('// real'), 'trailing eol comment stripped');
});

test('escaped backslash before quote still closes the string', () => {
    // "a\\" is a valid closed string (backslash then closing quote).
    // What follows ( // b ) IS a comment and should be stripped.
    const src = 'const s = "a\\\\"; // b';
    const out = stripComments(src);
    assert.ok(out.includes('"a\\\\"'), 'string with trailing \\\\ preserved');
    assert.ok(!out.includes('// b'), 'trailing comment stripped');
});

test('// inside a block comment does not escape it', () => {
    const src = 'const x = 1; /* contains // inside */ const y = 2;';
    const out = stripComments(src);
    assert.ok(!out.includes('contains'), 'block comment stripped entirely');
    assert.ok(out.includes('const x = 1;'));
    assert.ok(out.includes('const y = 2;'));
});

test('/* inside a // comment is not a block opener', () => {
    const src = 'const x = 1; // has /* inside\nconst y = 2;';
    const out = stripComments(src);
    assert.ok(!out.includes('has'), 'line comment stripped');
    assert.ok(out.includes('const x = 1;'));
    assert.ok(out.includes('const y = 2;'));
});

test('// inside single-quoted string survives', () => {
    const src = "const s = 'a//b'; const y = 2;";
    const out = stripComments(src);
    assert.ok(out.includes("'a//b'"), 'string containing // survives');
});

test('/* inside double-quoted string is not a block opener', () => {
    const src = 'const s = "a/*b*/c"; const y = 2;';
    const out = stripComments(src);
    assert.ok(out.includes('"a/*b*/c"'), 'string containing /* ... */ survives');
});

test('regex literal with // does not crash and is preserved', () => {
    // A division-like expression containing // must not be interpreted as a comment.
    // This is conservative: we only require the builder not to crash and not to
    // strip the trailing identifier.
    const src = 'const r = /a\\/b/; const y = 2;';
    assert.doesNotThrow(() => stripComments(src));
    const out = stripComments(src);
    assert.ok(out.includes('const y = 2;'),
        'code after regex literal survives');
});

test('unterminated string does not crash', () => {
    // Pathological input: don't hang or throw.
    const src = 'const s = "unterminated\nconst y = 2;';
    assert.doesNotThrow(() => stripComments(src));
});

test('unterminated block comment does not crash', () => {
    const src = 'const x = 1; /* never closed';
    assert.doesNotThrow(() => stripComments(src));
});

test('consecutive // comments on separate lines stripped', () => {
    const src = '// one\n// two\nconst x = 1;';
    const out = stripComments(src);
    assert.ok(!out.includes('one'));
    assert.ok(!out.includes('two'));
    assert.ok(out.includes('const x = 1;'));
});

test('http:// at start of comment is still stripped as comment', () => {
    // Not inside a string -- it's just two slashes, so it's a line comment.
    const src = 'const x = 1; // see http://example.com\nconst y = 2;';
    const out = stripComments(src);
    assert.ok(!out.includes('see'));
    assert.ok(!out.includes('example.com'));
    assert.ok(out.includes('const x = 1;'));
    assert.ok(out.includes('const y = 2;'));
});

test('real-world worker prologue: /* */ after string with URL', () => {
    const src = [
        'const API = "https://api.example.com/v1";',
        '/* legal block header',
        '   spanning multiple lines */',
        'self.onmessage = (e) => { /* inner */ postMessage(e.data); }; // done',
    ].join('\n');
    const out = stripComments(src);
    assert.ok(out.includes('"https://api.example.com/v1"'), 'URL survives');
    assert.ok(!out.includes('legal block header'), 'block header stripped');
    assert.ok(!out.includes('spanning'), 'block body stripped');
    assert.ok(!out.includes('inner'), 'inline block stripped');
    assert.ok(!out.includes('done'), 'trailing eol comment stripped');
    assert.ok(out.includes('postMessage(e.data)'), 'real code preserved');
});
