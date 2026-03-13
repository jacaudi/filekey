# Design: Remove Generated `app/index.html` from Git

**Date:** 2026-03-09
**Issue:** [#41 — investigate: reduce app/index.html bundle size](https://github.com/jacaudi/filekey/issues/41)

## Problem

`app/index.html` is a 217 KB, 3,618-line generated file committed to the repository. It is assembled by `scripts/build.js` from human-readable sources in `src/`. Having it in git creates two problems:

1. **Navigability** — the file is too large to inspect or navigate directly
2. **PR noise** — every change to any source file produces a large diff in the generated output

## Decision

Remove `app/index.html` from git entirely. It is a build artifact and does not belong under version control. The source-of-truth is `src/`. The generated file will be produced during CI and Docker builds.

## Changes Required

### 1. `.gitignore`

Add `app/index.html` so it is never accidentally committed.

### 2. Dockerfile

Add a Node.js build stage before the Go stage to generate `app/index.html`:

```dockerfile
FROM node:22-alpine AS js-build
WORKDIR /build
COPY scripts/ scripts/
COPY src/ src/
COPY app/ app/
RUN node scripts/build.js
```

The Go stage replaces `COPY app/ ./app/` with `COPY --from=js-build /build/app/ ./app/`.

### 3. CI Workflows (`ci.yml` and `pr.yml`)

| Job | Change |
|---|---|
| `test-node` | Add `setup-command: node scripts/build.js` |
| `test-go` | Change to `setup-command: node scripts/build.js && cp -r app server/app` |
| `build-check` | **Remove entirely** |
| `release` (ci.yml) | Remove `build-check` from `needs:` |
| `docker` (pr.yml) | Remove `build-check` from `needs:` |

The `build-check` job existed solely to catch direct edits to the generated file. Once gitignored, that is impossible and the job serves no purpose.

## What Stays in the Repo

After this change, `app/` contains only hand-authored files:

- `app/sw.js`
- `app/manifest.json`
- `app/logo.svg`
- `app/tests/`
- `app/fonts/` (populated by Docker font stage)

## What Does Not Change

- `src/` structure and all source files
- `scripts/build.js`
- The single-file design and offline capability
- The Go server and embed mechanism
- All 85 tests (they run after the build step in CI)

## Success Criteria

- `app/index.html` is absent from the repository
- `docker build` produces a working image
- All 85 Node.js tests pass in CI
- Go tests pass in CI
- PRs no longer include a diff of the generated file
