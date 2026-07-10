import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) return cssFiles(p)
    return name.endsWith('.css') ? [p] : []
  })
}

const sources = [
  path.join(webRoot, 'index.html'),
  ...cssFiles(path.join(webRoot, 'src')),
].map((p) => ({ p, text: readFileSync(p, 'utf8') }))
const allCss = sources.map((s) => s.text).join('\n')

describe('PWA layout rules', () => {
  it('no 100vh anywhere (100dvh only)', () => {
    for (const { p, text } of sources) {
      expect(text.includes('100vh'), `${p} still uses 100vh`).toBe(false)
    }
    expect(allCss).toContain('100dvh')
  })

  it('safe-area insets cover all four edges', () => {
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      expect(allCss).toContain(`env(safe-area-inset-${edge}`)
    }
  })

  it('coarse-pointer touch targets are >= 44px', () => {
    expect(allCss).toContain('@media (pointer: coarse)')
    expect(allCss).toContain('min-height: 44px')
    expect(allCss).toContain('min-width: 44px')
  })
})
