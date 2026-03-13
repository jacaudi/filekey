# Remove Generated `app/index.html` from Git — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop committing the generated `app/index.html` build artifact; produce it at build time via Dockerfile and CI instead.

**Architecture:** Add a `node:22-alpine` build stage to the Dockerfile that runs `node scripts/build.js` before the Go stage. Update CI workflow `setup-command` inputs to generate the file before tests run. Remove the now-pointless `build-check` job. Gitignore the file and remove it from git tracking.

**Tech Stack:** Node.js 22, Docker multi-stage build, GitHub Actions reusable workflows (`jacaudi/github-actions@v0.13.0`).

> **For Claude:** REQUIRED SUB-SKILLS (must use in order):
> 1. `superpowers:using-git-worktrees` — Isolate work in a dedicated worktree
> 2. Choose execution mode (load `superpowers:test-driven-development` alongside whichever is chosen — all agents/sessions must use TDD):
>    - **Subagent-Driven (this session):** `superpowers:subagent-driven-development` + `superpowers:test-driven-development` — Dispatch fresh subagent per task, review between tasks
>    - **Parallel Session (separate):** `superpowers:executing-plans` + `superpowers:test-driven-development` — Batch execution with checkpoints
> 3. `superpowers:verification-before-completion` — Verify all tests pass before claiming done
> 4. `superpowers:requesting-code-review` — Code review after EACH task (built into subagent-driven; must be explicitly invoked after every task when using executing-plans)
> 5. After ALL tasks: dispatch independent and comprehensive code review on full diff (automatic in subagent-driven; must be explicitly dispatched when using executing-plans)
> 6. `superpowers:finishing-a-development-branch` — Complete the branch

---

## Design Doc

See `docs/plans/2026-03-09-remove-generated-index-design.md`.

---

## Critical Files

- `.gitignore` — add `app/index.html`
- `Dockerfile` — add Node.js build stage, update Go stage COPY
- `.github/workflows/ci.yml` — fix setup-commands, remove build-check
- `.github/workflows/pr.yml` — fix setup-commands, remove build-check
- `app/index.html` — remove from git tracking (`git rm --cached`)

---

## Task 1: Gitignore and Untrack `app/index.html`

**Files:** `.gitignore`, `app/index.html` (git tracking only)

**Step 1: Confirm the file is currently tracked**

Run:
```bash
git ls-files app/index.html
```
Expected: `app/index.html`

**Step 2: Add to `.gitignore`**

In `.gitignore`, append:
```
app/index.html
```

Full `.gitignore` after edit:
```
server/filekey
.worktrees/
app/index.html
```

**Step 3: Remove from git tracking without deleting the file**

Run:
```bash
git rm --cached app/index.html
```
Expected output: `rm 'app/index.html'`

**Step 4: Verify the file is untracked but still on disk**

Run:
```bash
git ls-files app/index.html
echo "exit: $?"
ls -lh app/index.html
```
Expected: `git ls-files` prints nothing (exit 0), `ls` shows the file still exists on disk.

**Step 5: Verify git status looks clean**

Run:
```bash
git status
```
Expected: `.gitignore` modified, `app/index.html` deleted from index — no other surprises.

**Step 6: Verify existing tests still pass (file is still on disk)**

Run:
```bash
docker run --rm -v $(pwd)/app:/app -w /app node:22-alpine sh -c "node --test tests/test-*.js"
```
Expected: 85 pass, 0 fail.

**Step 7: Commit**

```bash
git add .gitignore
git commit -m "chore: remove generated app/index.html from git tracking"
```

---

## Task 2: Update Dockerfile with Node.js Build Stage

**Files:** `Dockerfile`

**Step 1: Read the current Dockerfile**

It has two stages: `fonts` (alpine) and `build` (golang:1.26-alpine), producing a scratch image. The Go stage does:
```dockerfile
COPY app/ ./app/
COPY --from=fonts /inter_variable.ttf ./app/fonts/inter_variable.ttf
```

**Step 2: Add the Node.js build stage before the Go stage**

Insert between the `fonts` stage closing comment and the `# Stage 2` comment. Replace the entire Dockerfile with:

```dockerfile
# =============================================================
# Stage 1 — Download Inter Variable font
# =============================================================
FROM alpine AS fonts

RUN apk add --no-cache curl unzip && \
    curl -fsSL "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip" \
         -o /tmp/inter.zip && \
    unzip /tmp/inter.zip -d /tmp/inter && \
    find /tmp/inter -name "InterVariable.ttf" -exec cp {} /inter_variable.ttf \;

# =============================================================
# Stage 2 — Generate app/index.html from source
# =============================================================
FROM node:22-alpine AS js-build

WORKDIR /build
COPY scripts/ scripts/
COPY src/ src/
COPY app/ app/
RUN node scripts/build.js

# =============================================================
# Stage 3 — Compile the Go static-file server with embedded app
# =============================================================
FROM golang:1.26-alpine AS build

WORKDIR /build

COPY server/go.mod ./
RUN go mod download

COPY server/main.go ./
COPY --from=js-build /build/app/ ./app/
COPY --from=fonts /inter_variable.ttf ./app/fonts/inter_variable.ttf

ARG APP_VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.Version=${APP_VERSION}" \
    -trimpath \
    -o /filekey \
    .

# =============================================================
# Stage 4 — Minimal scratch image with just the binary
# =============================================================
FROM scratch

COPY --from=build /filekey /filekey

EXPOSE 8080

ENTRYPOINT ["/filekey"]
```

**Step 3: Build and verify the Docker image**

Run:
```bash
docker build -t filekey:no-index-test .
```
Expected: build succeeds, all 4 stages complete, no errors.

**Step 4: Smoke-test the built image**

Run:
```bash
docker run --rm -d -p 9093:8080 filekey:no-index-test
sleep 1
curl -s -o /dev/null -w "%{http_code}" http://localhost:9093/
docker stop $(docker ps -q --filter "publish=9093")
```
Expected: HTTP 200.

**Step 5: Commit**

```bash
git add Dockerfile
git commit -m "feat: add Node.js build stage to Dockerfile to generate app/index.html"
```

---

## Task 3: Update CI Workflows

**Files:** `.github/workflows/ci.yml`, `.github/workflows/pr.yml`

### `ci.yml` changes

**Step 1: Add `setup-command` to `test-node` job**

Find:
```yaml
  test-node:
    name: Test Node
    uses: jacaudi/github-actions/.github/workflows/test.yml@v0.13.0
    permissions:
      contents: read
    with:
      test-framework: custom
      test-command: node --test app/tests/test-*.js
      node-version: '22'
      artifact-name: test-results-node
```

Replace with:
```yaml
  test-node:
    name: Test Node
    uses: jacaudi/github-actions/.github/workflows/test.yml@v0.13.0
    permissions:
      contents: read
    with:
      test-framework: custom
      setup-command: node scripts/build.js
      test-command: node --test app/tests/test-*.js
      node-version: '22'
      artifact-name: test-results-node
```

**Step 2: Update `setup-command` in `test-go` job**

Find:
```yaml
      setup-command: cp -r app server/app
```

Replace with:
```yaml
      setup-command: node scripts/build.js && cp -r app server/app
```

**Step 3: Remove the `build-check` job**

Delete the entire block:
```yaml
  build-check:
    name: Build Check
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: node scripts/build.js
      - run: git diff --exit-code app/index.html
```

**Step 4: Remove `build-check` from `release` job's `needs:`**

Find:
```yaml
    needs: [lint-go, lint-config, test-node, test-go, build-check]
```

Replace with:
```yaml
    needs: [lint-go, lint-config, test-node, test-go]
```

### `pr.yml` changes

**Step 5: Add `setup-command` to `test-node` job** (same as ci.yml step 1, but no `permissions` block)

Find:
```yaml
  test-node:
    name: Test Node
    uses: jacaudi/github-actions/.github/workflows/test.yml@v0.13.0
    with:
      test-framework: custom
      test-command: node --test app/tests/test-*.js
      node-version: '22'
      artifact-name: test-results-node
```

Replace with:
```yaml
  test-node:
    name: Test Node
    uses: jacaudi/github-actions/.github/workflows/test.yml@v0.13.0
    with:
      test-framework: custom
      setup-command: node scripts/build.js
      test-command: node --test app/tests/test-*.js
      node-version: '22'
      artifact-name: test-results-node
```

**Step 6: Update `setup-command` in `test-go` job** (same as ci.yml step 2)

**Step 7: Remove the `build-check` job** (same block as ci.yml, but without the `permissions:` stanza)

Delete:
```yaml
  build-check:
    name: Build Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: node scripts/build.js
      - run: git diff --exit-code app/index.html
```

**Step 8: Remove `build-check` from `docker` job's `needs:`**

Find:
```yaml
    needs: [lint-go, lint-config, test-node, test-go, build-check]
```

Replace with:
```yaml
    needs: [lint-go, lint-config, test-node, test-go]
```

**Step 9: Lint the YAML files**

Run:
```bash
docker run --rm -v $(pwd):/work -w /work pipelinecomponents/yamllint:latest yamllint -c .yamllint.yml .github/workflows/ci.yml .github/workflows/pr.yml
```
Expected: no errors or warnings.

**Step 10: Verify the Node tests still pass locally (regenerate file first)**

Run:
```bash
node scripts/build.js
docker run --rm -v $(pwd)/app:/app -w /app node:22-alpine sh -c "node --test tests/test-*.js"
```
Expected: 85 pass, 0 fail.

**Step 11: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/pr.yml
git commit -m "ci: generate app/index.html at build time, remove build-check job"
```

---

## Verification

After all tasks:

1. **Confirm file is not tracked:**
   ```bash
   git ls-files app/index.html
   ```
   Expected: no output.

2. **Confirm file is gitignored:**
   ```bash
   git check-ignore -v app/index.html
   ```
   Expected: `.gitignore:3:app/index.html	app/index.html`

3. **Full Docker build:**
   ```bash
   docker build -t filekey:final-test .
   ```
   Expected: succeeds.

4. **Node tests after fresh generate:**
   ```bash
   node scripts/build.js
   docker run --rm -v $(pwd)/app:/app -w /app node:22-alpine sh -c "node --test tests/test-*.js"
   ```
   Expected: 85 pass, 0 fail.

5. **Delete generated file and confirm tests fail without build step:**
   ```bash
   rm app/index.html
   docker run --rm -v $(pwd)/app:/app -w /app node:22-alpine sh -c "node --test tests/test-*.js" 2>&1 | head -5
   ```
   Expected: error (file not found). Confirms tests correctly depend on the build step.

6. **Regenerate and confirm tests pass again:**
   ```bash
   node scripts/build.js
   docker run --rm -v $(pwd)/app:/app -w /app node:22-alpine sh -c "node --test tests/test-*.js"
   ```
   Expected: 85 pass, 0 fail.
