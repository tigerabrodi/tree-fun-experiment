# library usage

this repo now has a real library entry at `src/lib/index.ts`.

the playground uses that same api.

that means the demo and the future package are using the same renderer surface instead of two separate systems.

## install

```bash
npm i @tigerabrodioss/l-trees three
```

## what the library exposes

1. species presets like `OAK`, `PINE`, `BIRCH`, `MAPLE`, `SAKURA`.
2. forest presets like `SINGLE_TREE_FOREST` and `GIANT_FOREST_SETTINGS`.
3. `createTreeRenderer`.
4. default wind and debug settings.
5. the default texture asset pack.
6. helpers for custom asset packs.

## basic usage

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

## update the scene

```ts
await trees.setSpecies(MAPLE)
await trees.setForest({ mode: 'giant', count: 180, radius: 60 })
await trees.setWind({ strength: 0.42, speed: 1.1, direction: 35 })
const nextSeed = await trees.regenerate()
```

## read perf and debug data

```ts
const snapshot = trees.getPerformanceSnapshot()
console.log(snapshot.performance)
console.log(snapshot.chunks)
```

the renderer also exposes the raw three objects if you need them.

```ts
trees.three.renderer
trees.three.scene
trees.three.camera
trees.three.controls
```

## ship with the default textures

the default asset pack uses the textures that ship inside the package.

if you use the shipped species presets, you do not need to configure anything else.

the shipped pack stays on `ktx2`.

## bring your own textures

custom textures work through `createTreeAssetPack`.

your species config already points at `barkTexture` and `leafTexture` ids.

those ids are looked up in the asset pack.

```ts
import {
  OAK,
  createTreeAssetPack,
  createTreeRenderer,
} from '@tigerabrodioss/l-trees'

const customAssets = createTreeAssetPack({
  bark: {
    oak: {
      basecolor: '/my-tree-pack/oak_basecolor.webp',
    },
  },
  leaves: {
    willow: {
      single: '/my-tree-pack/willow_single.png',
      cluster: '/my-tree-pack/willow_cluster.jpg',
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
  assets: customAssets,
})
```

custom asset pack paths can now be `ktx2`, `png`, `webp`, or `jpg`.

if you have an extensionless asset url, pass an object with `url` and `format`.

```ts
const customAssets = createTreeAssetPack({
  leaves: {
    willow: {
      single: {
        url: 'https://cdn.example.com/willow-single',
        format: 'image',
      },
      cluster: {
        url: 'https://cdn.example.com/willow-cluster',
        format: 'image',
      },
    },
  },
})
```

## build the library

the app build stays the same.

```bash
bun run build
```

the library build is separate.

```bash
bun run build:lib
```

that writes the package output to `dist-lib`.
