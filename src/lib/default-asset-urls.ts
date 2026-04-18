import birchBasecolorUrl from './textures/bark/birch/birch_basecolor.ktx2?url'
import birchHeightUrl from './textures/bark/birch/birch_height.ktx2?url'
import birchMetalnessUrl from './textures/bark/birch/birch_metalness.ktx2?url'
import birchNormalUrl from './textures/bark/birch/birch_normal.ktx2?url'
import birchRoughnessUrl from './textures/bark/birch/birch_roughness.ktx2?url'
import mapleBasecolorUrl from './textures/bark/maple/maple_basecolor.ktx2?url'
import mapleHeightUrl from './textures/bark/maple/maple_height.ktx2?url'
import mapleMetalnessUrl from './textures/bark/maple/maple_metalness.ktx2?url'
import mapleNormalUrl from './textures/bark/maple/maple_normal.ktx2?url'
import mapleRoughnessUrl from './textures/bark/maple/maple_roughness.ktx2?url'
import oakBasecolorUrl from './textures/bark/oak/oak_basecolor.ktx2?url'
import oakHeightUrl from './textures/bark/oak/oak_height.ktx2?url'
import oakMetalnessUrl from './textures/bark/oak/oak_metalness.ktx2?url'
import oakNormalUrl from './textures/bark/oak/oak_normal.ktx2?url'
import oakRoughnessUrl from './textures/bark/oak/oak_roughness.ktx2?url'
import pineBasecolorUrl from './textures/bark/pine/pine_basecolor.ktx2?url'
import pineHeightUrl from './textures/bark/pine/pine_height.ktx2?url'
import pineMetalnessUrl from './textures/bark/pine/pine_metalness.ktx2?url'
import pineNormalUrl from './textures/bark/pine/pine_normal.ktx2?url'
import pineRoughnessUrl from './textures/bark/pine/pine_roughness.ktx2?url'
import sakuraBasecolorUrl from './textures/bark/sakura/sakura_basecolor.ktx2?url'
import sakuraHeightUrl from './textures/bark/sakura/sakura_height.ktx2?url'
import sakuraMetalnessUrl from './textures/bark/sakura/sakura_metalness.ktx2?url'
import sakuraNormalUrl from './textures/bark/sakura/sakura_normal.ktx2?url'
import sakuraRoughnessUrl from './textures/bark/sakura/sakura_roughness.ktx2?url'
import birchClusterUrl from './textures/leaves/birch_cluster.ktx2?url'
import birchSingleUrl from './textures/leaves/birch_single.ktx2?url'
import mapleClusterUrl from './textures/leaves/maple_cluster.ktx2?url'
import mapleSingleUrl from './textures/leaves/maple_single.ktx2?url'
import oakClusterUrl from './textures/leaves/oak_cluster.ktx2?url'
import oakSingleUrl from './textures/leaves/oak_single.ktx2?url'
import pineClusterUrl from './textures/leaves/pine_cluster.ktx2?url'
import pineSingleUrl from './textures/leaves/pine_single.ktx2?url'
import sakuraClusterUrl from './textures/leaves/sakura_cluster.ktx2?url'
import sakuraSingleUrl from './textures/leaves/sakura_single.ktx2?url'

export const DEFAULT_TREE_ASSET_PACK_PATHS = {
  bark: {
    oak: {
      basecolor: oakBasecolorUrl,
      normal: oakNormalUrl,
      roughness: oakRoughnessUrl,
      metalness: oakMetalnessUrl,
      height: oakHeightUrl,
    },
    pine: {
      basecolor: pineBasecolorUrl,
      normal: pineNormalUrl,
      roughness: pineRoughnessUrl,
      metalness: pineMetalnessUrl,
      height: pineHeightUrl,
    },
    birch: {
      basecolor: birchBasecolorUrl,
      normal: birchNormalUrl,
      roughness: birchRoughnessUrl,
      metalness: birchMetalnessUrl,
      height: birchHeightUrl,
    },
    maple: {
      basecolor: mapleBasecolorUrl,
      normal: mapleNormalUrl,
      roughness: mapleRoughnessUrl,
      metalness: mapleMetalnessUrl,
      height: mapleHeightUrl,
    },
    sakura: {
      basecolor: sakuraBasecolorUrl,
      normal: sakuraNormalUrl,
      roughness: sakuraRoughnessUrl,
      metalness: sakuraMetalnessUrl,
      height: sakuraHeightUrl,
    },
  },
  leaves: {
    oak: {
      single: oakSingleUrl,
      cluster: oakClusterUrl,
    },
    pine: {
      single: pineSingleUrl,
      cluster: pineClusterUrl,
    },
    birch: {
      single: birchSingleUrl,
      cluster: birchClusterUrl,
    },
    maple: {
      single: mapleSingleUrl,
      cluster: mapleClusterUrl,
    },
    sakura: {
      single: sakuraSingleUrl,
      cluster: sakuraClusterUrl,
    },
  },
} as const
