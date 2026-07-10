// @vitest-environment node
// Runs the icon generation script for real and asserts the outputs.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = path.join(webRoot, 'public', 'icons')
const icon = (name) => path.join(iconsDir, name)

describe('generate-icons.mjs', () => {
  beforeAll(() => {
    execFileSync('node', ['scripts/generate-icons.mjs'], { cwd: webRoot })
  }, 60_000)

  it.each([
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['maskable-192.png', 192],
    ['maskable-512.png', 512],
    ['apple-touch-icon.png', 180],
  ])('%s is a %ipx square PNG', async (name, size) => {
    expect(existsSync(icon(name))).toBe(true)
    const meta = await sharp(icon(name)).metadata()
    expect(meta.format).toBe('png')
    expect(meta.width).toBe(size)
    expect(meta.height).toBe(size)
  })

  it('plain icons keep a transparent corner (logo art only)', async () => {
    const px = await sharp(icon('icon-512.png'))
      .extract({ left: 0, top: 0, width: 1, height: 1 })
      .ensureAlpha().raw().toBuffer()
    expect(px[3]).toBe(0) // alpha
  })

  it('maskable icons have an opaque, full-bleed background (safe zone)', async () => {
    for (const name of ['maskable-192.png', 'maskable-512.png']) {
      const px = await sharp(icon(name))
        .extract({ left: 0, top: 0, width: 1, height: 1 })
        .ensureAlpha().raw().toBuffer()
      expect(px[3]).toBe(255) // corner opaque => background reaches the mask edge
    }
  })

  it('apple-touch-icon has no alpha channel (opaque background)', async () => {
    const meta = await sharp(icon('apple-touch-icon.png')).metadata()
    expect(meta.hasAlpha).toBe(false)
  })
})
