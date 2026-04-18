# api

## main exports

### `createTreeRenderer`

creates the renderer and returns the typed library surface.

for field by field tuning of the state objects, read `tuning.md`.

### `createTreeAssetPack`

creates an asset pack from the shipped defaults plus your overrides.

simple string paths work for `ktx2`, `png`, `webp`, and `jpg`.

for extensionless urls, pass `{ url, format }`.

### species presets

- `OAK`
- `PINE`
- `BIRCH`
- `MAPLE`
- `SAKURA`

### forest presets

- `SINGLE_TREE_FOREST`
- `GIANT_FOREST_SETTINGS`

### helpers

- `createVariationSeed`
- `defineSpecies`
- `defineForestSettings`
- `DEFAULT_WIND_SETTINGS`
- `DEFAULT_DEBUG_VIEW_SETTINGS`

## renderer methods

### `getState()`

returns the current species, forest, wind, debug view, and variation seed.

### `rebuild(nextState)`

rebuilds the renderer with a partial state update.

### `setSpecies(species)`

switches the species and rebuilds.

### `setForest(forest)`

switches the forest settings and rebuilds.

### `setWind(wind)`

updates wind and rebuilds if needed by the current internal path.

### `setDebugView(debugView)`

updates chunk bounds, wireframe, and wood only view.

### `regenerate(seed?)`

changes the variation seed and rebuilds.

### `setViewPreset(preset)`

switches the camera to a built in preset.

### `getPerformanceSnapshot()`

returns live performance stats plus live chunk state.

### `dispose()`

cleans up the renderer and controls.
