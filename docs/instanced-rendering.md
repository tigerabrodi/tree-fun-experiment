# Instanced Rendering and Billboards

## The draw call problem

One tree might have 500 leaf billboards. Each billboard is the same cross shaped quad geometry with the same material. The only difference is position, rotation, and scale.

Without instancing, you tell the GPU "draw this quad" 500 times. Each time is a separate draw call. Each draw call has overhead: the CPU sets up state, talks to the GPU driver, the driver validates everything. 500 draw calls for identical geometry is wasteful.

## What instancing does

With instancing, you tell the GPU: "here is one quad geometry, here is a list of 500 transforms, draw all of them in one go." One draw call. The GPU takes the same vertex data and stamps it out 500 times in parallel, each with a different transform from the list.

The GPU is built for parallel work. Stamping out 500 copies of the same geometry with different transforms is exactly what it's good at.

## How it works in our code

Three.js provides `InstancedMesh`. You give it one geometry, one material, and a count. Then you set a 4x4 transform matrix for each instance.

```ts
const mesh = new THREE.InstancedMesh(geometry, material, 500)

for (let i = 0; i < 500; i++) {
  dummy.position.copy(leafPositions[i])
  dummy.quaternion.copy(leafRotations[i])
  dummy.scale.setScalar(leafSizes[i])
  dummy.updateMatrix()
  mesh.setMatrixAt(i, dummy.matrix)
}
```

One geometry buffer. One array of 500 matrices. One draw call. All 500 leaves rendered.

## Billboard types in this project

A billboard is a flat textured quad. For tree leaves, we use cross billboards: two quads intersecting at 90 degrees through the same center point. Like a plus sign viewed from above.

This means from any camera angle, you always see at least one quad at a reasonable viewing angle. No single angle makes the leaf disappear into a thin line.

The cross billboard geometry (two planes) gets instanced at every branch tip. Each instance has a unique position, a rotation aligned to the branch direction, and a random twist for variety.
