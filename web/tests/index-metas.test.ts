// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const html = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../index.html'),
  'utf8',
)

describe('index.html PWA metas', () => {
  it('viewport keeps viewport-fit=cover and adds interactive-widget=resizes-content', () => {
    const viewport = html.match(/<meta name="viewport" content="([^"]*)"/)?.[1] ?? ''
    expect(viewport).toContain('viewport-fit=cover')
    expect(viewport).toContain('interactive-widget=resizes-content')
  })

  it('has the light/dark theme-color pair from the old palette', () => {
    expect(html).toContain(
      '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fff" />',
    )
    expect(html).toContain(
      '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1a1a1a" />',
    )
  })

  it('has the iOS standalone metas', () => {
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />')
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    )
  })

  it('links the apple-touch-icon and keeps the SVG favicon', () => {
    expect(html).toContain(
      '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
    )
    expect(html).toMatch(/<link rel="icon"[^>]*logo\.svg/)
  })

  // (fold B3) the Phase 2 apple-touch-icon pointed at logo.svg and there was a
  // hand-written manifest link — both must be gone, not merely superseded.
  it('has no leftover logo.svg apple-touch-icon and no manual manifest link', () => {
    expect(html).not.toMatch(/<link rel="apple-touch-icon" href="\/logo\.svg"/)
    expect(html).not.toMatch(/<link rel="manifest" href="\/manifest\.json"/)
  })
})
