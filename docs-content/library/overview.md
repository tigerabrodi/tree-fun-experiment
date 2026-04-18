# library overview

`@tigerabrodioss/l-trees` is a webgpu first procedural tree library.

it is meant for people who want beautiful trees fast.

it ships with:

- 5 species presets.
- shipped bark and leaf textures.
- single tree and giant forest presets.
- chunked forest rendering.
- chunk frustum culling.
- 4 lod levels.
- wind lod.
- worker based rebuild planning and geometry packing.
- live perf snapshots.

the same api powers the playground in this repo.

that matters because the library path is not a fake wrapper.

it is the real renderer surface we are using ourselves.

## what users usually do

1. install the package and `three`.
2. create a canvas.
3. call `createTreeRenderer`.
4. pick a species and forest preset.
5. tweak wind or regenerate variation.

## i want procedural trees in my game

this is the short answer.

1. use this package.
2. start with the shipped presets.
3. use `SINGLE_TREE_FOREST` for one hero tree.
4. use `GIANT_FOREST_SETTINGS` for many trees and the full perf path.
5. tune branch shape and leaf density before you start swapping textures.

good order.

- silhouette first.
- canopy mass second.
- texture style after that.

## what is customizable

- species rules.
- forest settings.
- wind settings.
- debug view.
- bark textures.
- leaf textures.

for the field by field guide, read `tuning.md`.

the shipped defaults stay on `ktx2`.

custom textures can be `ktx2`, `png`, `webp`, or `jpg`.

## what is not needed to start

you do not need to understand l systems first.

you can start with the shipped presets and only go deeper if you want to.
