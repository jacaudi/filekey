// Post-build assertions on web/dist. Run AFTER `npm run build` via `npm run test:dist`.
import assert from 'node:assert'
import { describe, it } from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, '..', '..', 'dist')
const read = (p) => fs.readFileSync(path.join(dist, p), 'utf8')

describe('built manifest.webmanifest', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'))

  it('has identity fields', () => {
    assert.strictEqual(manifest.name, 'FileKey')
    assert.strictEqual(manifest.short_name, 'FileKey')
    assert.strictEqual(manifest.id, '/')
    assert.strictEqual(manifest.start_url, '/')
    assert.strictEqual(manifest.scope, '/')
    assert.strictEqual(manifest.display, 'standalone')
  })

  it('keeps description, categories, lang, dir, orientation', () => {
    assert.ok(manifest.description.length > 0)
    assert.deepStrictEqual(manifest.categories, ['utilities', 'security'])
    assert.strictEqual(manifest.lang, 'en')
    assert.strictEqual(manifest.dir, 'ltr')
    assert.strictEqual(manifest.orientation, 'any')
  })

  it('uses light theme colors', () => {
    assert.strictEqual(manifest.background_color, '#fff')
    assert.strictEqual(manifest.theme_color, '#fff')
  })

  it('has the four PNG icons (any + maskable), and the files exist in dist', () => {
    const bySrc = Object.fromEntries(manifest.icons.map((i) => [i.src, i]))
    assert.deepStrictEqual(
      Object.keys(bySrc).sort(),
      ['/icons/icon-192.png', '/icons/icon-512.png',
       '/icons/maskable-192.png', '/icons/maskable-512.png'].sort()
    )
    assert.strictEqual(bySrc['/icons/icon-192.png'].sizes, '192x192')
    assert.strictEqual(bySrc['/icons/icon-512.png'].sizes, '512x512')
    assert.strictEqual(bySrc['/icons/maskable-192.png'].purpose, 'maskable')
    assert.strictEqual(bySrc['/icons/maskable-512.png'].purpose, 'maskable')
    for (const i of manifest.icons) {
      assert.strictEqual(i.type, 'image/png')
      assert.ok(fs.existsSync(path.join(dist, i.src)), `${i.src} missing from dist`)
    }
  })

  it('has no fabricated screenshots', () => {
    assert.strictEqual(manifest.screenshots, undefined)
  })
})

describe('built service worker', () => {
  it('is emitted at dist/sw.js (Go server no-store contract path)', () => {
    assert.ok(fs.existsSync(path.join(dist, 'sw.js')))
  })

  it('is Workbox-generated, not the legacy hand-rolled worker', () => {
    const sw = read('sw.js')
    assert.ok(!sw.includes("CACHE_NAME = 'v1'"), 'legacy sw.js content leaked into dist')
    assert.ok(sw.includes('index.html'), 'index.html must be in the precache manifest')
    assert.ok(sw.includes('navigate'), 'navigation route (NetworkFirst) missing')
  })

  it('the legacy hand-rolled worker is gone from web/public', () => {
    assert.ok(!fs.existsSync(path.join(here, '..', '..', 'public', 'sw.js')))
    assert.ok(!fs.existsSync(path.join(here, '..', '..', 'public', 'manifest.json')))
  })
})

describe('built index.html', () => {
  it('links the webmanifest', () => {
    assert.ok(read('index.html').includes('manifest.webmanifest'))
  })
})
