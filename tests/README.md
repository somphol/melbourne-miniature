# Tests

Run with `node tests/run.mjs` (or `npm run test`). Vite bundles each test with three.js and imports
it under Node; no browser is needed.

- `plan.test.ts` — one connected road graph; every node on land; parcels on land, clear of roads
  and reserved sites, non-overlapping in the rotated grid frame; bridges have dry ends and a water
  midpoint; landmark anchors are on land and their lots do not overlap; parks are on land.
- `geometry.test.ts` — every landmark has finite geometry inside its envelope; every one of the nine
  building families produces distinct, non-degenerate geometry.

The browser gate is separate: `npm run verify` (`scripts/verify.mjs`). It uses this city's landmark
targets and facts, not another city's.
