# quickstart

## install

```bash
npm i @tigerabrodioss/l-trees three
```

## create a renderer

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

## change settings later

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

## read perf data

```ts
const snapshot = trees.getPerformanceSnapshot()

console.log(snapshot.performance)
console.log(snapshot.chunks)
```

## clean up

```ts
trees.dispose()
```

## when to use each forest mode

`SINGLE_TREE_FOREST`

- use this for hero trees.
- use this for close inspection.
- use this when you want one beautiful tree.

`GIANT_FOREST_SETTINGS`

- use this when you want many trees.
- use this when you care about chunking, culling, and lod.
