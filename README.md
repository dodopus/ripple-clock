# Ripple Clock: Acoustic Horizon Clock & Morph Lab

A minimalist, Westworld-inspired canvas clock. Every second sends an acoustic
ripple around the clock's circumference, and the lab around it lets you design
the look: 11 ripple studies (Soliton, Rehoboam, Solomon, Tectonic, …), stacked
ring layers with noise and glow, morphing vector digits and a curated preset
library. Any look you make can be exported straight to CodePen.

## Run it

```sh
bun install    # or: npm install
npm run dev    # http://localhost:3000
```

| Script            | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Lab with hot reload                                     |
| `npm run build`   | Production build to `dist/`, plus a ready pen in `dist/codepen/` |
| `npm run preview` | Serve `dist/`                                           |
| `npm run lint`    | Type-check                                              |

Hotkeys in the lab: `Space` freezes the clock, and `.` or `→` steps a frame while
frozen (hold `Shift` to step a full second).

## Getting a look out of the lab

The settings drawer (sliders button in the bottom bar) has an export row:

- **↗ Open in CodePen** opens a new pen with exactly the clock you're looking
  at, with no settings panel. The JS panel starts with a `CLOCK_CONFIG` block
  holding the whole look, followed by a "no need to edit below this line"
  divider and the clock engine.
- **Copy config** copies that same config as JSON. Paste it over the
  `CLOCK_CONFIG` object in an existing pen to restyle it, or over
  [`src/clock.config.json`](src/clock.config.json) and commit to make it the
  lab's default.
- **⤓ .html** downloads the clock as a single self-contained HTML file.

The pen is generated from the same source files as the lab (see below), so it
can't drift out of date. React and flubber load from [esm.sh](https://esm.sh)
at the versions installed here, so the pen needs no build step or CodePen
settings.

## How it fits together

```
src/
  App.tsx                    lab shell: state, bottom bar, settings drawer
  clock.config.json          default look ({ variation, params })
  clock.config.ts            ClockConfig type + loader
  hooks/useClockTime.ts      60fps time source + pulse emitter (lab and pen)
  components/
    AcousticCircleCanvas.tsx the renderer: every ripple study, rings, glow, HUD
    RollingDigitalTime.tsx   digital readout (morph / roll / fade / instant)
    MorphingVectorDigit.tsx  flubber-based SVG digit morphing
    SettingsDrawer.tsx       every control in the lab
  pen/
    PenClock.tsx             the bare clock the pen renders
    entry.tsx                pen entry point (reads CLOCK_CONFIG)
    pen.css                  Tailwind entry scoped to the bare clock's files
    assemble.ts              puts config + engine together; standalone HTML
    export.ts, ExportBar.tsx export buttons in the drawer
  utils/                     math/noise, presets, ring defaults, study metadata
codepen/vite-plugin.ts       bundles src/pen into the pen (virtual:codepen-pen)
```

`codepen/vite-plugin.ts` uses esbuild to bundle `src/pen/entry.tsx` into
readable ES modules (npm imports rewritten to esm.sh URLs) and compiles
`src/pen/pen.css` with only the Tailwind utilities the bare clock uses. The lab
lazy-loads the result when you export. If the pen ever needs another npm
package, add its URL to `cdnUrls` in the plugin; the build fails with a
pointer there until you do.
