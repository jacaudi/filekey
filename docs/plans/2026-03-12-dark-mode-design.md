# Dark Mode Design

## Goal

Add dark mode to FileKey that follows the OS `prefers-color-scheme` setting by default, with a manual sun/moon toggle button to the left of the hamburger icon that overrides and persists the user's preference.

## Architecture

All hardcoded color values in `src/css/styles.css` are replaced with CSS custom properties defined on `:root`. Dark values are declared under `@media (prefers-color-scheme: dark) { html:not([data-theme]) }` (OS default) and `html[data-theme="dark"]` (manual override). A new `src/js/ui/theme.js` initializes the toggle and handles localStorage persistence.

## Color Palette

| Variable       | Light         | Dark          | Usage                                      |
|----------------|---------------|---------------|--------------------------------------------|
| `--bg`         | `#fff`        | `#1a1a1a`     | Page/main container background             |
| `--surface`    | `#f4f4f4`     | `#2a2a2a`     | Cards, uploaded items, menu background     |
| `--surface-alt`| `#f2f0ed`     | `#252525`     | Icon container backgrounds                 |
| `--text`       | `#000`        | `#e8e8e8`     | Primary text and icon fills                |
| `--text-sub`   | `#0d0d0d`     | `#e0e0e0`     | Textarea text                              |
| `--text-muted` | `#0000009a`   | `#ffffff9a`   | Menu item text, plain links                |
| `--text-status`| `#00000080`   | `#ffffff80`   | Status bar text                            |
| `--border`     | `#0000001a`   | `#ffffff1a`   | All borders and dividers                   |
| `--blue`       | `#1377F9`     | `#4a9eff`     | Brand blue — links, icons, clickables      |
| `--blue-border`| `#1377F921`   | `#4a9eff21`   | Blue tinted borders                        |
| `--blue-bg`    | `#1377f91a`   | `#4a9eff1a`   | Drop container background                  |

Status/alert colors (`#F91313` red, `#e99a32` orange, `#ffdb01` yellow) are unchanged — already high-contrast in both modes. Modal backdrop (`rgba(0,0,0,0.4)`) is unchanged.

## Toggle Button

A `<button id=theme_toggle>` is added to `src/index.html.tmpl` inside `#chiz_container`, immediately before `#chiz_icon_container`.

`#chiz_container` switches from `flex-direction: column` to `flex-direction: row; justify-content: flex-end; align-items: center; padding-right: 24px; gap: 16px` so the two icons sit side by side, right-aligned in the fixed panel.

Icon behavior:
- **Light mode** → moon icon shown (click switches to dark)
- **Dark mode** → sun icon shown (click switches to light)

Two new SVG cases added to the `getSvg` switch in `src/js/ui/renderer.js`:
- `"moon_icon"` — crescent moon path, `viewBox="0 0 24 24"`
- `"sun_icon"` — filled circle with ray paths, `viewBox="0 0 24 24"`

Both inherit `fill: currentColor` to match the existing icon pattern.

## JS Architecture

New file: `src/js/ui/theme.js`

```
initTheme()
  - Read localStorage.getItem("fk_theme") → "dark" | "light" | null
  - If set, apply html.setAttribute("data-theme", value)
  - Render correct icon into #theme_toggle via hb.getSvg()
  - Wire click handler on #theme_toggle → toggleTheme()

toggleTheme()
  - Read current data-theme (or OS preference if unset)
  - Flip to opposite
  - html.setAttribute("data-theme", newTheme)
  - localStorage.setItem("fk_theme", newTheme)
  - Swap icon in #theme_toggle
```

`initTheme()` is called from `domInit()` in `src/js/app/init.js` after `initChizMenu()`.

`theme.js` is added to `MAIN_FILES` in `scripts/build.js` after `ui/menu.js`.

## Files Changed

| File | Change |
|---|---|
| `src/css/styles.css` | Replace all hardcoded colors with CSS vars; add `:root` light/dark blocks |
| `src/index.html.tmpl` | Add `<button id=theme_toggle>` before `#chiz_icon_container` |
| `src/js/ui/renderer.js` | Add `moon_icon` and `sun_icon` cases to `getSvg` switch |
| `src/js/ui/theme.js` | New file — `initTheme()` and `toggleTheme()` |
| `src/js/app/init.js` | Call `initTheme()` in `domInit()` |
| `scripts/build.js` | Add `'ui/theme.js'` to `MAIN_FILES` |
