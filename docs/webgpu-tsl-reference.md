# WebGPU Three.js TSL Reference

Source: https://github.com/dgreenheck/webgpu-claude-skill

## Import pattern

Always use the WebGPU entry points.

```js
import * as THREE from 'three/webgpu'
import { float, vec3, texture, Fn, time, ... } from 'three/tsl'
```

In vite.config.ts these resolve via aliases:

```ts
'three/webgpu': 'three/src/Three.WebGPU.js',
'three/tsl': 'three/src/Three.TSL.js',
```

## TSL basics

TSL replaces GLSL strings with JavaScript method chains.

```js
// Instead of GLSL: position + normal * displacement
positionLocal.add(normalLocal.mul(displacement))
```

Types: `float(1.0)`, `vec2(x, y)`, `vec3(x, y, z)`, `vec4(x, y, z, w)`, `color(0xff0000)`.

Operators are methods: `.add()`, `.sub()`, `.mul()`, `.div()`, `.mod()`.

Swizzling works: `v.xy`, `v.zyx`, `v.rgb`.

## Critical gotcha: variable mutation

TSL intercepts property assignments on nodes (`node.y = value`) and method calls (`.assign()`).

TSL cannot intercept JavaScript variable reassignment. This is broken:

```js
// BROKEN: JS reassigns variable, TSL can't see it
let value = buffer.element(index).toFloat()
If(condition, () => {
  value = value.add(1.0) // creates new node, reassigns JS var
})
// value still points to the original node
```

Solutions:

```js
// Use select() for simple conditionals
const result = select(condition, valueIfTrue, valueIfFalse)

// Use .toVar() + .assign() for mutable variables
const value = buffer.element(index).toFloat().toVar()
If(condition, () => {
  value.assign(value.add(1.0)) // works
})

// Direct buffer writes inside If()
element.assign(element.add(1.0)) // works
```

## Node materials

Replace standard material properties with TSL nodes.

```js
const material = new THREE.MeshStandardNodeMaterial()
material.colorNode = texture(basecolorMap)
material.normalNode = normalMap(texture(normalTex))
material.roughnessNode = texture(roughnessMap).r
material.metalnessNode = texture(metalnessMap).r
material.positionNode = positionLocal.add(normalLocal.mul(displacement))
material.alphaTestNode = float(0.5) // for transparency cutout
material.opacityNode = leafTex.a    // for alpha blending
```

Available materials: `MeshStandardNodeMaterial`, `MeshPhysicalNodeMaterial`, `MeshBasicNodeMaterial`, `PointsNodeMaterial`, `SpriteNodeMaterial`, `LineBasicNodeMaterial`.

## Geometry nodes

| Node | Description |
|------|-------------|
| `positionLocal` | Model space position |
| `positionWorld` | World space position |
| `normalLocal` | Model space normal |
| `normalWorld` | World space normal |
| `uv()` | Primary UV coordinates |
| `cameraPosition` | Camera world position |
| `instanceIndex` | Current instance index |
| `time` | Seconds since start |
| `deltaTime` | Frame delta |

## Custom functions

```js
const fresnel = Fn(([power = 2.0]) => {
  const viewDir = cameraPosition.sub(positionWorld).normalize()
  const nDotV = normalWorld.dot(viewDir).saturate()
  return float(1.0).sub(nDotV).pow(power)
})
```

## Control flow

```js
// If/ElseIf/Else (use with .toVar() or .assign())
const result = vec3(0).toVar()
If(condition, () => {
  result.assign(vec3(1, 0, 0))
}).Else(() => {
  result.assign(vec3(0, 0, 1))
})

// Ternary (preferred for simple cases)
const color = select(condition, vec3(1, 0, 0), vec3(0, 0, 1))

// Loops
Loop(10, ({ i }) => {
  sum.addAssign(float(i))
})
```

## Compute shaders

For parallel GPU work like wind animation.

```js
const positions = instancedArray(count, 'vec3')     // read-write
const lookupTable = attributeArray(data, 'float')    // read-only

const computeShader = Fn(() => {
  const pos = positions.element(instanceIndex)
  pos.addAssign(vec3(0.01, 0, 0))
})().compute(count)

await renderer.init()
renderer.compute(computeShader) // synchronous since r181
```

## WGSL integration

For complex math like noise functions.

```js
const simplexNoise = wgslFn(`
  fn snoise(v: vec2<f32>) -> f32 {
    // raw WGSL code
  }
`)

// Wrap with TSL for nice API
const noise = Fn(([position, scale = 1.0]) => {
  return simplexNoise(position.xy.mul(scale))
})
```

## Texture handling

```js
texture(map)                          // sample texture
normalMap(texture(normalTex))         // normal map
normalMap(texture(normalTex), 0.5)    // normal map with strength
bumpMap(texture(heightMap), 0.05)     // height to normal
triplanarTexture(texture(map))        // no UV seam mapping
```

KTX2Loader for compressed textures:

```js
const ktx2Loader = new KTX2Loader()
  .setTranscoderPath('...')
  .detectSupport(renderer)
```

## Post-processing (r183+)

`PostProcessing` was renamed to `RenderPipeline` in r183.

```js
const renderPipeline = new THREE.RenderPipeline(renderer)
const scenePass = pass(scene, camera)
const color = scenePass.getTextureNode('output')

const bloomPass = bloom(color)
renderPipeline.outputNode = color.add(bloomPass)

// In render loop
renderPipeline.render()
```

Available effects: bloom, gaussianBlur, fxaa, smaa, dof, motionBlur, ssr, ao, film, outline, chromaticAberration, godrays, lensflare, traa, ssgi.

## Uniforms

```js
const myColor = uniform(new THREE.Color(0x0066ff))
const myFloat = uniform(0.5)

// Update at runtime
myColor.value.set(0xff0000)
myFloat.value = 0.8

// Auto-updating
const animated = uniform(0).onFrameUpdate((frame) => {
  return Math.sin(frame.time)
})
```

## Version notes

- r171+: minimum for stable TSL, requires `three/webgpu` import
- r178+: `PI2` deprecated, use `TWO_PI`
- r181+: `renderer.compute()` is synchronous, `computeAsync()` deprecated
- r183+: `PostProcessing` renamed to `RenderPipeline`
