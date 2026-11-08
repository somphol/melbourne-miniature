# Scene modules

The module map is authored for Melbourne. Construction order: geography → plan → buildings and
landmarks → environment → traffic → scene.

- `geo.ts` — river centreline and widths, north/south land polygons, bay, districts, landmark sites,
  parks, bridges, debug views.
- `plan.ts` — Hoddle Grid and named roads, St Kilda Road, obstacle routing, planar graph, bridge
  edges, component cleanup, parcels.
- `kit.ts` — instanced boxes/custom geometry, windows, roofs, materials, night emission.
- `buildings.ts` — nine ordinary families and district height rules.
- `landmarks.ts` — eight landmark models and envelopes.
- `environment.ts` — tray, land slabs, water shader, roads, parks, river walls, piers, trees, lamps,
  light pools, signals.
- `traffic.ts` — trams with route groups, vehicles, river/bay boats, pedestrians.
- `scene.ts` — renderer, camera, flights, day/night, capture API.
- `camera.ts` — camera guard against building envelopes.

Do not copy another city's scene files. Reuse the mechanism; author the geography, landmarks,
street plan, transport, palette, copy and tests for the target city.
