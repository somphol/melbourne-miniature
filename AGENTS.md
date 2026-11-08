# melbourne-miniature — working notes

## 1. What it is

A from-scratch Three.js miniature of central Melbourne: the Yarra and its two banks, the Hoddle
Grid, Southbank, Carlton, East Melbourne and the Domain; eight landmarks, nine ordinary building
families, three bridges, trams, cars, boats, pedestrians, day/night lighting and an EN/VI UI. It
builds to one offline HTML file. It is an interpretive diorama, not a survey map, GIS product,
navigation app or photo reconstruction. See [README.md](README.md) and the design contract in
[CITY.md](CITY.md).

## 2. Commands

```sh
npm install
npm run dev                 # Vite, http://localhost:5173
npm run typecheck           # tsc --noEmit
npm run test                # plan + geometry, no browser
npm run build               # typecheck + Vite build to dist/
npm run build:single        # dist/ + notices -> dist-single/index.html
npm run verify              # deterministic browser gate (20/20)
npm run shot                # release screenshots into shots/ (visual, slow)
node scripts/preview.mjs    # fast canvas-only iteration
node scripts/smallscreens.mjs  # compact + embed only
```

`CHROME_PATH` overrides the browser for `verify`, `shot`, `preview` and `smallscreens` (default
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). The published copy is generated,
not edited by hand:

```sh
npm run build:single
cp dist-single/index.html docs/index.html
```

## 3. Architecture

Construction order: **geography → plan → buildings/landmarks → environment → traffic → scene → UI.**

- `src/scene/geo.ts` — river centreline and widths, north/south land polygons, bay, districts,
  landmark sites, parks, bridges, debug views.
- `src/scene/plan.ts` — Hoddle Grid and named roads, St Kilda Road, obstacle routing, planar graph,
  three bridge edges, connected-component cleanup, 291 parcels.
- `src/scene/kit.ts` — one instanced primitive kit for boxes, merged custom geometry, windows, roofs
  and night emission.
- `src/scene/buildings.ts` — nine families, district choices and height rules.
- `src/scene/landmarks.ts` — eight landmark models and the envelope table.
- `src/scene/environment.ts` — tray, land slabs, water shader, roads, parks, river walls, piers,
  trees, lamps, light pools, signals.
- `src/scene/traffic.ts` — trams with route groups, cars/taxis/buses/vans/bikes, river and bay boats,
  pedestrians.
- `src/scene/scene.ts` — renderer, camera, flights, day/night, facts, capture API.
- `src/App.tsx`, `src/i18n/strings.json`, `src/style.css` — UI, copy and layouts.
- `tests/plan.test.ts`, `tests/geometry.test.ts` — invariants; `scripts/verify.mjs` — browser gate.

## 4. Decisions and constraints

- Coordinates: `x` east, `z` south, `y` up (north is `-z`). Tray 24.4 × 18.4. Water `y=0.35`, land
  top `0.5`, roads `~0.54`, buildings/landmarks base `0.58`.
- The Hoddle Grid angle is `0.09` rad (`GRID_ANGLE`); it is deliberately not the San Francisco
  angle. The river is a real channel with separate north/south land polygons.
- The landmark table lives in `geo.ts`; the envelope table in `landmarks.ts`; the browser targets
  in `scripts/verify.mjs`. Change all three together, plus `CITY.md`.
- Three bridges only: Princes (tram), Queens, Spencer. The graph must stay one component; detached
  stubs under 20 nodes are pruned. Do not "fix" a severed bank by deleting a bridge.
- Parcels are placed by a rotated lattice, clear of roads and reserved sites. The plan/geometry
  tests assert non-overlap, land containment and bridge water midpoints.
- Placement is seeded (no `Math.random` in scene construction). All motion runs through `tick(dt)`;
  capture mode advances virtual time. Do not add wall-clock simulation timers.
- The single file must stay offline: no external images, fonts, fetches or storage. Fonts are
  system stacks. `docs/index.html` is a generated copy; regenerate it after every release.
- `shots/` is gitignored; `docs/preview-*.png` are the committed release images.

## 5. Known issues

- `npm run shot` full-page screenshots can time out under SwiftShader after many WebGL frames.
  Canvas captures through `window.__scene.shot()` are the reliable path; compact/embed UI shots are
  a separate `scripts/smallscreens.mjs` run.
- The compact and 345×345 views crop the tray; that is intentional for portrait/square frames, and
  the user can pan. The verify checks that every visible button stays inside the frame.
- The Hoddle Grid has 17 parcels; the western Docklands/North Melbourne fabric is much denser. This
  is a deliberate district imbalance, not a missing-street bug.
- The Flinders flight includes Eureka/St Paul's as neighbouring context; the station itself is
  centred and clear, but it is not an isolated product shot.
- Night is intentionally dark and stylised; the gold spire and window emission are exaggerated for
  a miniature. It is not a physically based night render.
- `record`/video and the `shoot` pixel-diff harness are not included. `verify` is the pass/fail
  gate; `shot` is visual review only.

## 6. Continuity

- Local project: `/Users/somphol/melbourne-miniature`.
- Release file: `dist-single/index.html` (~896 KiB).
- Pages copy: `docs/index.html`; deployed URL (once Pages is enabled):
  <https://somphol.github.io/melbourne-miniature/>.
- Design brief: `CITY.md`; provenance: `ATTRIBUTION.md`; changes: `CHANGELOG.md`.
- No secrets, tokens or personal data belong in this repository.
