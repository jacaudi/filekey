'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DOCKERIGNORE = path.resolve(__dirname, '../../.dockerignore');
const DOCKERFILE = path.resolve(__dirname, '../../Dockerfile');
const hasDockerignore = fs.existsSync(DOCKERIGNORE);
const hasDockerfile = fs.existsSync(DOCKERFILE);

describe('.dockerignore build context (#43)', function() {
    it('file exists', { skip: !hasDockerignore && 'requires full repo access' }, function() {
        assert.ok(fs.existsSync(DOCKERIGNORE));
    });

    it('excludes .git', { skip: !hasDockerignore && 'requires full repo access' }, function() {
        const c = fs.readFileSync(DOCKERIGNORE, 'utf8');
        assert.ok(c.includes('.git'), 'must exclude .git');
    });

    it('excludes .worktrees', { skip: !hasDockerignore && 'requires full repo access' }, function() {
        const c = fs.readFileSync(DOCKERIGNORE, 'utf8');
        assert.ok(c.includes('.worktrees'), 'must exclude .worktrees');
    });

    it('excludes app/tests', { skip: !hasDockerignore && 'requires full repo access' }, function() {
        const c = fs.readFileSync(DOCKERIGNORE, 'utf8');
        assert.ok(c.includes('app/tests'), 'must exclude app/tests');
    });

    it('excludes docs', { skip: !hasDockerignore && 'requires full repo access' }, function() {
        const c = fs.readFileSync(DOCKERIGNORE, 'utf8');
        assert.ok(c.includes('docs'), 'must exclude docs');
    });
});

describe('Pinned alpine base image (#44)', function() {
    it('fonts stage uses FROM alpine:3', { skip: !hasDockerfile && 'requires full repo access' }, function() {
        const c = fs.readFileSync(DOCKERFILE, 'utf8');
        assert.ok(c.includes('FROM alpine:3'), 'alpine must be pinned to :3');
    });

    it('does not use bare FROM alpine', { skip: !hasDockerfile && 'requires full repo access' }, function() {
        const c = fs.readFileSync(DOCKERFILE, 'utf8');
        assert.ok(!c.match(/FROM alpine\n/) && !c.match(/FROM alpine /), 'must not use bare FROM alpine');
    });
});
