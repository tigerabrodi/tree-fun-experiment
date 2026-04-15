# WebGPU and TSL vs WebGL and GLSL

## The shader authoring problem

GLSL shaders are raw strings. No type safety. No autocomplete. Typos show up at runtime when the shader fails to compile.

TSL (Three.js Shading Language) is JavaScript that generates shaders. You write `positionLocal.add(normalLocal.mul(displacement))` instead of a string blob. Your editor catches errors. You get autocomplete. You compose shader logic with functions like normal code.

## What WebGPU gives us over WebGL

### Compute shaders

WebGL cannot do compute shaders. Period.

Compute shaders run arbitrary parallel work on the GPU. For our tree project, this means wind animation: thousands of leaf positions updated per frame on the GPU with zero CPU cost.

With WebGL you'd have to hack this with transform feedback or encode data into textures. Ugly workarounds.

### Better draw call efficiency

Each draw call has CPU overhead: state setup, driver communication, validation. WebGPU reduces this overhead compared to WebGL.

For our tree with hundreds of instanced leaf billboards, fewer draw calls means more performance headroom.

### Modern GPU pipeline

WebGL is built on OpenGL ES from 2007. The GPU driver has to translate old API concepts into what modern GPUs actually do.

WebGPU maps directly to Vulkan (Linux/Android), Metal (Apple), and D3D12 (Windows). No translation layer. The GPU does less wasted work.

## Why it matters for this project

Our tree uses:

1. **5 PBR texture maps per bark material.** TSL makes wiring these up clean and composable.
2. **Thousands of instanced leaf billboards.** WebGPU handles instanced draws more efficiently.
3. **Wind animation via compute shaders.** Only possible with WebGPU, not WebGL.
4. **KTX2 compressed textures.** WebGPU's texture format support is broader and more predictable.
