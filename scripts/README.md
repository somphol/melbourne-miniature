# Scripts

- `notices.mjs` — writes the production licence notice for three.js, React, React DOM and scheduler.
- `inline-build.mjs` — folds the Vite HTML, JS, CSS and notices into one offline file. Usage:
  `node scripts/inline-build.mjs dist dist-single/index.html`.
- `verify.mjs` — deterministic browser gate. Serves the single file, drives `window.__scene` in
  capture mode, and checks every landmark flight, day/night, reset, zoom, orbit, pan, rotate,
  facts, locales, the 345×345 embed, console errors and external requests. Set `CHROME_PATH` when
  Chrome is not at the macOS default.
- `shot.mjs` — release screenshots. It writes canvas captures for the overview, night and all eight
  landmarks, plus UI page shots where the compositor cooperates. Under SwiftShader, full-page shots
  can time out; the canvas captures are the reliable path.
- `preview.mjs` — fast canvas-only preview: `node scripts/preview.mjs [ids...]`.
- `smallscreens.mjs` — compact and embed captures in a fresh browser, so a long screenshot run does
  not exhaust the compositor.

`dist-single/index.html` and `docs/index.html` are generated; do not hand-edit them.
