# tree fun experiment

this is a procedural tree playground built with react, three.js, and webgpu.

it generates trees from l systems. an l system is a rule based string generator. the string is turned into branch instructions. those instructions are then turned into trunk segments, branches, and leaf positions.

the project currently has 5 species. oak. pine. birch. maple. sakura.

it also has giant forest mode, gpu leaf wind, ktx2 bark textures from fal, chunked forest rendering, and a live control panel for structure, forest size, and wind.

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
- live perf stats and debug json export.

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

you need a browser with webgpu support.

## project map

- `src/engine`. l system rules, turtle building, forest layout, chunk planning, lod planning, and worker rebuild planning.
- `src/three`. mesh generation, materials, textures, scene setup, culling, lod, wind, and perf reporting.
- `src/components`. react ui panel and canvas wrapper.
- `docs`. focused notes on l systems, instancing, webgpu, and tsl.
  it also has a current performance systems note.

## useful docs in this repo

- `docs/l-system-trees.md`. how the tree grammar and turtle builder work.
- `docs/instanced-rendering.md`. why instancing matters here.
- `docs/webgpu-vs-webgl.md`. what webgpu gives this project.
- `docs/webgpu-tsl-reference.md`. lower level three tsl and webgpu notes.
- `docs/performance-systems.md`. current perf systems that are already built.
