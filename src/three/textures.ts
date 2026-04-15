import * as THREE from 'three/webgpu'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'

let ktx2Loader: KTX2Loader | null = null

export function initKTX2Loader(renderer: THREE.WebGPURenderer): KTX2Loader {
  if (ktx2Loader) return ktx2Loader
  ktx2Loader = new KTX2Loader()
  ktx2Loader.setTranscoderPath(
    'https://cdn.jsdelivr.net/npm/three@0.183.2/examples/jsm/libs/basis/'
  )
  ktx2Loader.detectSupport(renderer)
  return ktx2Loader
}

export interface BarkTextures {
  basecolor: THREE.Texture
  normal: THREE.Texture
  roughness: THREE.Texture
  metalness: THREE.Texture
  height: THREE.Texture
}

export async function loadBarkTextures(
  species: string
): Promise<BarkTextures> {
  const loader = ktx2Loader!
  const base = `/textures/bark/${species}/${species}`

  const [basecolor, normal, roughness, metalness, height] = await Promise.all([
    loader.loadAsync(`${base}_basecolor.ktx2`),
    loader.loadAsync(`${base}_normal.ktx2`),
    loader.loadAsync(`${base}_roughness.ktx2`),
    loader.loadAsync(`${base}_metalness.ktx2`),
    loader.loadAsync(`${base}_height.ktx2`),
  ])

  for (const tex of [basecolor, normal, roughness, metalness, height]) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
  }

  basecolor.colorSpace = THREE.SRGBColorSpace

  return { basecolor, normal, roughness, metalness, height }
}

export async function loadLeafTexture(
  species: string,
  type: 'single' | 'cluster'
): Promise<THREE.Texture> {
  const loader = ktx2Loader!
  const tex = await loader.loadAsync(
    `/textures/leaves/${species}_${type}.ktx2`
  )
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
