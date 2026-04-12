const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const utilsSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'js', 'lib', 'utils.js'),
    'utf8'
);

function loadGetQueryStrings(search) {
    const sandbox = {
        window: { location: { search } },
    };
    const fn = new Function('window', utilsSrc + '; return get_query_strings;');
    return fn(sandbox.window);
}

describe('get_query_strings', () => {
    const cases = [
        ['?pub=abc123',      { pub: 'abc123' }],
        ['?debug=true',      { debug: true }],
        ['?foo=42',          { foo: 42 }],
        ['?bar=null',        { bar: null }],
        ['?x=false',         { x: false }],
        ['?flag',            { flag: true }],
        ['?flag=',           { flag: true }],
        ['?a=1&b=hello',     { a: 1, b: 'hello' }],
        ['?n=42abc',         { n: '42abc' }],
        ['?f=3.14',          { f: '3.14' }],
        ['',                 {}],
    ];
    for (const [search, expected] of cases) {
        it(`parses "${search}"`, () => {
            const getQs = loadGetQueryStrings(search);
            assert.deepStrictEqual(getQs(), expected);
        });
    }
});
