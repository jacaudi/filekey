'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DOCKERIGNORE = fs.readFileSync(path.resolve(__dirname, '../../.dockerignore'), 'utf8');
const DOCKERFILE = fs.readFileSync(path.resolve(__dirname, '../../Dockerfile'), 'utf8');

describe('.dockerignore build context', function() {
    it('excludes .git', function() {
        assert.ok(DOCKERIGNORE.includes('.git'));
    });

    it('excludes .worktrees', function() {
        assert.ok(DOCKERIGNORE.includes('.worktrees'));
    });

    it('excludes app/tests', function() {
        assert.ok(DOCKERIGNORE.includes('app/tests'));
    });

    it('excludes docs', function() {
        assert.ok(DOCKERIGNORE.includes('docs'));
    });
});

describe('Pinned alpine base image', function() {
    it('fonts stage uses FROM alpine:3', function() {
        assert.ok(DOCKERFILE.includes('FROM alpine:3'));
    });

    it('does not use bare FROM alpine', function() {
        assert.ok(!DOCKERFILE.match(/FROM alpine\n/) && !DOCKERFILE.match(/FROM alpine /));
    });
});
