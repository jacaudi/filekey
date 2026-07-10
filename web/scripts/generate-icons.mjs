// Rasterizes the FileKey logo SVG into the PWA icon set.
// Source: web/public/logo.svg (Phase 2 copy of app/logo.svg — 26x26 viewBox).
// Output: web/public/icons/ (git-ignored; regenerated on every `npm run build`).
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(here, '..', 'public', 'logo.svg')
const OUT = path.resolve(here, '..', 'public', 'icons')

const SVG_VIEWBOX = 26 // logo.svg viewBox is 26x26
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

// Rasterize the SVG at a density that yields >= `size` px natively (no blurry upscale).
function rasterize(size) {
  const density = Math.ceil((72 * size) / SVG_VIEWBOX)
  return sharp(SRC, { density }).resize(size, size, {
    fit: 'contain',
    background: TRANSPARENT,
  })
}

// Plain icon: logo art on a transparent square.
async function plainIcon(size, file) {
  await rasterize(size).png().toFile(path.join(OUT, file))
}

// Maskable icon: logo scaled into the safe zone (~10% padding per edge => 80% inner
// box) composited onto an opaque full-bleed background, per the maskable spec.
async function maskableIcon(size, file) {
  const inner = Math.round(size * 0.8)
  const logo = await rasterize(inner).png().toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(path.join(OUT, file))
}

// Apple touch icon: 180px, opaque background (iOS renders transparency as black).
async function appleTouchIcon(file) {
  const size = 180
  const inner = Math.round(size * 0.8)
  const logo = await rasterize(inner).png().toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .flatten({ background: WHITE }) // merge alpha into the background (pixels become opaque)
    .removeAlpha() // drop the alpha channel structurally (flatten alone leaves it present)
    .png()
    .toFile(path.join(OUT, file))
}

await mkdir(OUT, { recursive: true })
await Promise.all([
  plainIcon(192, 'icon-192.png'),
  plainIcon(512, 'icon-512.png'),
  maskableIcon(192, 'maskable-192.png'),
  maskableIcon(512, 'maskable-512.png'),
  appleTouchIcon('apple-touch-icon.png'),
])
console.log(`icons generated in ${OUT}`)
