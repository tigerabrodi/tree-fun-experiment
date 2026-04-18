# tuning

this page is the field by field guide for what you can tweak.

if you only want the short version.

1. tune silhouette first.
2. tune canopy mass second.
3. tune bark and leaf textures after that.
4. keep changes small at first.

## easiest knobs first

these are the safest and highest value fields to tweak first.

- `angle`
- `angleVariance`
- `lengthDecay`
- `radiusDecay`
- `leafDensity`
- `leafSize`
- `leafClusterSpread`
- `leafClusterCount`

these change the look fast without forcing you to rewrite the tree grammar.

## good tuning order

1. pick the closest shipped species.
2. tune branch width and direction.
3. tune branch length and taper.
4. tune leaf density and leaf size.
5. tune leaf cluster spread and count.
6. only then touch `axiom`, `rules`, or `iterations`.

## species config

use `defineSpecies` or clone a shipped preset.

```ts
import { OAK, defineSpecies } from '@tigerabrodioss/l-trees'

const wideOak = defineSpecies({
  ...OAK,
  angle: 36,
  angleVariance: 12,
  leafDensity: 0.9,
  leafClusterSpread: 0.3,
})
```

### grammar fields

`name`

- the species id.
- also useful when you make custom texture ids.

`axiom`

- the starting l system string.
- this is the seed string before rule expansion.

`rules`

- the rewrite rules for the l system.
- this is the deepest level of authoring.
- change this only if you want a new branch grammar, not just a tuned look.

`iterations`

- how many times the rules expand.
- more iterations usually means more structure and more complexity.
- too high can make the tree noisy or too dense very fast.
- good starting range from the shipped presets is `5` to `6`.

### branch direction and crown shape

`angle`

- the main branch turn angle in degrees.
- lower values make the tree more upright.
- higher values make the crown spread wider.
- too low can make trees look like poles.
- too high can make trees flatten out or look unnatural.

`angleVariance`

- random variation added around the main branch angle.
- higher values break symmetry and make the tree feel less mirrored.
- too low can make the tree feel artificial.
- too high can make the silhouette noisy and messy.

`branchSpin`

- how much branches rotate around the trunk or parent branch.
- this helps spread branches around the tree instead of keeping them on one flat plane.

`branchSpinJitter`

- variation added to the branch spin.
- useful when a tree feels too evenly patterned.

### branch length and growth

`lengthScale`

- the base forward step length.
- bigger values make the tree larger and more extended.
- smaller values make the tree tighter and more compact.

`lengthDecay`

- how fast branch length shrinks as the tree grows outward.
- lower values shorten later branches faster.
- higher values keep later branches longer.
- too high can make the crown look stretched and spidery.
- too low can make the tree look stubby.

`shortStepJitter`

- extra randomness on short continuation steps.
- especially useful for pine, where perfectly even tier spacing looks fake.
- good for breaking staircase patterns.

### trunk and branch thickness

`initialRadius`

- starting trunk thickness.
- bigger values give a heavier trunk.
- smaller values give a thinner tree.

`segmentTaper`

- how much one segment narrows along its own length.
- lower values taper faster.
- higher values keep segments thicker.

`radiusDecay`

- how fast branch thickness shrinks across branching depth.
- lower values make branches thin out faster.
- higher values keep scaffold branches thicker for longer.
- too low can make the tree feel weak or skeletal.
- too high can make the tree feel chunky.

### leaf and canopy fields

`leafSize`

- size of each leaf card or cluster card.
- higher values make the canopy feel fuller faster.
- too high can make the canopy look puffy or muddy.

`leafDensity`

- how often leaves are placed.
- one of the strongest canopy controls.
- higher values fill the crown.
- lower values expose more branches.

`leafDepthMin`

- minimum branch depth before leaves start appearing.
- useful when leaves are showing up too early on thick scaffold branches.
- higher values push foliage farther outward.

`leafTextureType`

- `'single'` or `'cluster'`.
- `single` uses a simpler single card style.
- `cluster` uses the fuller crossed card style.
- most broadleaf shipped presets use `cluster`.

`leafClusterStyle`

- cluster shaping preset.
- current built in styles are `classic`, `broad`, `tuft`, `airy`, and `blossom`.
- use this to match the species feeling before you start changing texture art.

`leafClusterCount`

- how many small cards or cluster placements are expanded from one leaf anchor.
- bigger values usually mean fuller canopy mass.
- too high can make the canopy too dense or expensive.

`leafClusterSpread`

- how far cluster cards spread away from the anchor.
- lower values keep foliage tight.
- higher values make foliage read wider and airier.

### texture id fields

`barkTexture`

- the bark texture id looked up in the asset pack.
- this does not need to match the species name.

`leafTexture`

- the leaf texture id looked up in the asset pack.
- this also does not need to match the species name.

## fields that can break trees fast

be careful with these.

`rules`

- this can completely change the tree structure.

`iterations`

- one extra iteration can massively increase complexity.

`angle`

- big jumps can destroy the species feel quickly.

`lengthDecay`

- this strongly changes crown reach and balance.

`radiusDecay`

- this strongly changes whether branches feel believable.

## forest settings

use `defineForestSettings` or pass a plain object.

```ts
await trees.setForest({
  mode: 'giant',
  count: 180,
  radius: 60,
})
```

`mode`

- `'custom'` or `'giant'`.
- `custom` is the simpler path.
- `giant` turns on the real forest path with chunking, culling, lod, and forest variants.

`count`

- number of trees in the layout.
- more trees means denser forest and more work.

`radius`

- world space radius of the forest spread.
- bigger radius spreads trees out more.
- smaller radius packs them closer together.

## wind settings

```ts
await trees.setWind({
  strength: 0.42,
  speed: 1.1,
  direction: 35,
})
```

`strength`

- how much the leaves move.

`speed`

- how fast the wind motion cycles.

`direction`

- wind direction in degrees.

## debug view settings

```ts
trees.setDebugView({
  showChunkBounds: true,
})
```

`showChunkBounds`

- shows chunk boxes.
- useful for understanding chunking and culling.

`showWireframe`

- shows geometry wireframe.
- useful for inspecting bark and leaf geometry density.

`showWoodOnly`

- hides leaves and shows only wood.
- useful for branch structure review.

## variation seed

call `regenerate()` when you want a different deterministic variation.

```ts
await trees.regenerate()
```

pass a specific seed if you want reproducible results.

```ts
await trees.regenerate(123456)
```

## textures and asset packs

the shipped defaults use `ktx2`.

custom asset packs can use `ktx2`, `png`, `webp`, or `jpg`.

```ts
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
```

use `{ url, format }` only if the path is extensionless or unusual.

## recommended workflow

1. start from the closest shipped species.
2. change `angle` and `angleVariance` first.
3. change `lengthDecay` and `radiusDecay` second.
4. change `leafDensity` and `leafSize` third.
5. swap textures only after the structure looks right.

that order gives the cleanest results.
