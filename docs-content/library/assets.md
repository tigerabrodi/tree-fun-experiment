# assets

the library ships with default bark and leaf textures.

that means the presets work out of the box.

you can also bring your own textures.

## use the shipped assets

do nothing extra.

the default species presets already point at shipped bark and leaf ids.

## bring your own textures

use `createTreeAssetPack`.

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

## how asset lookup works

species presets carry `barkTexture` and `leafTexture` ids.

the asset pack maps those ids to actual file paths.

that means you can keep the tree logic and swap only the visuals.

## file format

the shipped pack uses `ktx2`.

that is good for compressed gpu friendly textures.

for custom textures, you can use `ktx2`, `png`, `webp`, or `jpg`.

if your url does not end with a normal file extension, you can also be explicit.

```ts
const assets = createTreeAssetPack({
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
