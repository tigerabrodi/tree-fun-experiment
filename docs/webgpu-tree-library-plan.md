# webgpu tree library plan

## goal

beautiful trees by default.

performance by default.

webgpu first.

same repo.

same playground.

same renderer api.

## what is true now

1. the public library entry is `src/lib/index.ts`.
2. the playground now uses that library entry instead of calling the scene layer directly.
3. default textures are part of the shipped package asset pack in `src/lib/textures`.
4. custom bark and leaf textures are supported through `createTreeAssetPack`.
5. the renderer surface is typed and library shaped.

## current public shape

1. `createTreeRenderer`
2. `createVariationSeed`
3. `defineSpecies`
4. `defineForestSettings`
5. species presets
6. forest presets
7. wind and debug defaults
8. default asset pack and asset pack helpers

## current internal split

1. `src/engine`
tree generation. forest layout. chunk planning. lod planning. worker rebuild planning.

2. `src/three`
webgpu renderer. materials. instancing. wind. culling. perf reporting.

3. `src/lib`
public typed api.

4. `src/components`
playground ui only.

## current perf systems

1. instanced leaves.
2. instanced trunks in giant forest.
3. chunked forest rendering.
4. chunk frustum culling.
5. chunk lod with `near`. `mid`. `far`. `ultra far`.
6. wind lod.
7. worker rebuild planning.
8. worker matrix packing.
9. worker trunk geometry packing.
10. worker caching.
11. live perf stats and debug json.

## next likely work

1. cleaner public examples.
2. better docs around custom species and custom assets.
3. more texture packs.
4. more leaf packs.
5. possible future publish path once the package name and asset shipping story are locked down.

## things we are not focusing on right now

1. occlusion culling.
2. impostors.
3. extra chunk splitting.

they can come later if the project needs them.

they are not required for the current side project goal.
