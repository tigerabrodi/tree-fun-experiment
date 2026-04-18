# tree fun experiment

this is a procedural tree playground and in repo webgpu tree library built with react, three.js, and webgpu.

it generates trees from l systems. an l system is a rule based string generator. the string is turned into branch instructions. those instructions are then turned into trunk segments, branches, and leaf positions.

the project currently has 5 species. oak. pine. birch. maple. sakura.

it also has giant forest mode, gpu leaf wind, ktx2 bark textures from fal, chunked forest rendering, a typed library entry, and a live control panel for structure, forest size, and wind.

## what is in here

- l system based tree generation.
- real time controls for species, branch shape, leaf size, forest count, and wind.
- ktx2 bark textures from fal and species leaf textures.
- single tree mode and giant forest mode.
- instanced cross billboard leaves.
- gpu leaf wind with webgpu compute.
- chunked forest rendering with frustum culling.
- 4 chunk lod levels. near. mid. far. ultra far.
- wind lod so far chunks stop paying full wind cost.
- worker based rebuild planning and geometry packing.
- a public library entry at `src/lib/index.ts`.
- default ktx2 texture assets plus custom asset pack support for `ktx2`, `png`, `webp`, and `jpg`.
- live perf stats and debug json export.

## install and use it

install the library and `three`.

```bash
npm i @tigerabrodioss/l-trees three
```

create a canvas and build a renderer.

```ts
import {
  OAK,
  GIANT_FOREST_SETTINGS,
  createTreeRenderer,
} from '@tigerabrodioss/l-trees'

const canvas = document.querySelector('canvas')!

const trees = await createTreeRenderer({
  canvas,
  species: OAK,
  forest: GIANT_FOREST_SETTINGS,
})

trees.setViewPreset('quarter')
```

change things later.

```ts
import { MAPLE } from '@tigerabrodioss/l-trees'

await trees.setSpecies(MAPLE)
await trees.setForest({
  mode: 'giant',
  count: 180,
  radius: 60,
})
await trees.setWind({
  strength: 0.42,
  speed: 1.1,
  direction: 35,
})
await trees.regenerate()
```

read live perf and debug data.

```ts
const snapshot = trees.getPerformanceSnapshot()
console.log(snapshot.performance)
console.log(snapshot.chunks)
```

when you are done.

```ts
trees.dispose()
```

## i want procedural trees in my game

start here.

1. use this package first.
2. start with the shipped species and shipped textures.
3. use `SINGLE_TREE_FOREST` for hero trees.
4. use `GIANT_FOREST_SETTINGS` for many trees and the full perf path.
5. tune the shape with branch angle, angle variance, decay, and leaf density.
6. swap bark or leaf textures later if you want your own look.

the simple idea is this.

- get the tree silhouette right first.
- get the canopy mass right second.
- only then go deeper on texture style and species tuning.

if you want this package because you want procedural trees that look nice and stay performant, this is the intended path.

- use the built in species first.
- use the built in forest modes first.
- keep the shipped `ktx2` textures if you want the easiest path.
- bring your own textures only when you want a custom art direction.

## use shipped textures or your own

the default presets work out of the box with the shipped `ktx2` textures.

if you want your own textures, use `createTreeAssetPack`.

```ts
import {
  OAK,
  createTreeAssetPack,
  createTreeRenderer,
} from '@tigerabrodioss/l-trees'

const assets = createTreeAssetPack({
  bark: {
    oak: {
      basecolor: '/my-pack/oak_basecolor.webp',
    },
  },
  leaves: {
    willow: {
      single: '/my-pack/willow_single.png',
      cluster: '/my-pack/willow_cluster.jpg',
    },
  },
})

await createTreeRenderer({
  canvas,
  species: {
    ...OAK,
    name: 'willow',
    leafTexture: 'willow',
  },
  assets,
})
```

the shipped pack stays on `ktx2`.

custom textures can be `ktx2`, `png`, `webp`, or `jpg`.

## quick procedural tree tips

- use lower `branchAngle` for a more upright tree.
- use higher `branchAngle` for a wider crown.
- use higher `angleVariance` if the tree feels too mirrored or too perfect.
- use lower `lengthDecay` if you want branches to stay longer deeper into the tree.
- use lower `radiusDecay` if the tree feels too thin too fast.
- use higher `leafDensity` for a fuller canopy.
- use lower `leafDensity` if you want more branch visibility and a lighter crown.
- use `SINGLE_TREE_FOREST` for hero trees and close shots.
- use `GIANT_FOREST_SETTINGS` when you want the full chunking and lod path.

## making your own leaf textures

if you want to generate your own leaf textures, keep the subject centered, keep the background transparent, and avoid long branches or big empty areas.

good prompt shape.

```text
create one isolated [leaf or cluster type] for a game texture. centered. top down view. realistic shape. clean readable silhouette. transparent background. no extra leaves outside the main subject. no long branch. no drop shadow. no border. no text.
```

that pattern works well for image generation tools, including openai image generation models like `gpt-image-1.5`.

for more prompt examples, see `docs-content/library/leaf-texture-prompts.md`.

## how it works

1. each tree starts as an axiom and a set of l system rewrite rules.
2. after a few iterations, the final string is read by a turtle style builder. turtle here means a simple cursor that moves forward, turns, and stores branch state.
3. that builder creates branch segments and leaf placements in 3d space.
4. the wood mesh is built from those branch segments.
5. the leaves are not heavy 3d leaves. each leaf is a small crossed billboard. that means two flat planes using the same leaf texture, rotated across each other so the leaf cluster looks fuller from more angles.
6. giant forest mode builds several species safe variants, splits the forest into spatial chunks, and renders those chunks with instancing.
7. chunk frustum culling hides chunks that are outside the camera view.
8. chunk lod switches visible chunks between `near`, `mid`, `far`, and `ultra far` detail based on distance.
9. leaf wind runs on the gpu. a webgpu compute pass updates leaf offsets every frame, and the leaf material reads those offsets while rendering.
10. worker based rebuild planning prepares forest data, packed matrices, and packed trunk geometry away from the main thread.

## why this is fast

the main performance ideas are instancing, chunking, lod, and moving heavy rebuild work off the main thread.

instancing means not submitting the same crossed leaf geometry hundreds or thousands of times. you build one shared leaf geometry and one shared leaf material. then you send a list of transforms for position, rotation, and scale. the gpu draws all those copies in one pass.

this saves cpu work. without instancing, the cpu would spend much more time walking scene objects, setting render state, and submitting draw calls over and over.

gpu wind saves cpu work too. the cpu is not looping over every leaf in javascript and updating it one by one. the gpu does that math in parallel, which is what it is good at.

giant forest mode pushes this further. it splits the forest into chunks, culls chunks outside the view, and picks cheaper lods for chunks that are far away.

rebuild work is also lighter now. the worker handles rebuild planning, matrix packing, trunk geometry packing, and deterministic cache reuse. the main thread mostly turns prepared data into three.js objects.

## what was hard

the broadleaf trees looked fake at first.

the main problem was not the bark texture. the main problem was the grammar. trunk growth and side branch growth were too mixed together, so broadleaf trees looked like vertical poles with leaf puffs.

that was fixed by separating trunk growth from side branch growth. once the grammar started producing real scaffold branches, oak, birch, maple, and sakura started reading like actual trees.

## run it locally

this project uses bun.

```bash
bun install
bun run dev
```

use these for checks.

```bash
bun tsc
bun lint
bun test
```

build for production.

```bash
bun run build
```

build the library output.

```bash
bun run build:lib
```

the scoped package name is now.

```bash
@tigerabrodioss/l-trees
```

you need a browser with webgpu support.

## project map

- `src/engine`. l system rules, turtle building, forest layout, chunk planning, lod planning, and worker rebuild planning.
- `src/three`. mesh generation, materials, textures, scene setup, culling, lod, wind, and perf reporting.
- `src/lib`. public typed library api.
- `src/components`. react ui panel and canvas wrapper.
- `docs`. focused notes on l systems, instancing, webgpu, and tsl.
  it also has a current performance systems note.

## useful docs in this repo

consumer facing docs live in `docs-content`.

- `docs-content/README.md`. start here for package usage.
- `docs-content/library/overview.md`. what the package is and what it ships with.
- `docs-content/library/quickstart.md`. install and first render.
- `docs-content/library/tuning.md`. field by field guide for species, forest, wind, debug, variation, and textures.
- `docs-content/library/assets.md`. shipped textures and custom asset packs.
- `docs-content/library/api.md`. public api surface.
- `docs-content/library/leaf-texture-prompts.md`. prompt patterns for transparent leaf textures.

technical and internal notes stay in `docs`.

- `docs/l-system-trees.md`. how the tree grammar and turtle builder work.
- `docs/instanced-rendering.md`. why instancing matters here.
- `docs/webgpu-vs-webgl.md`. what webgpu gives this project.
- `docs/webgpu-tsl-reference.md`. lower level three tsl and webgpu notes.
- `docs/performance-systems.md`. current perf systems that are already built.
- `docs/library-usage.md`. current library api and custom asset usage.
- `docs/leaf-texture-prompts.md`. prompt patterns for making transparent leaf textures.
- `docs/webgpu-tree-library-plan.md`. current library direction.
