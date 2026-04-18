# performance systems

this file documents the performance systems that exist in the code today.

it does not document future ideas.

if a system is not in here, treat it as not built yet.

## current stack

the forest renderer currently uses these systems.

1. instanced leaves.
2. instanced trunks in giant forest mode.
3. giant forest variant reuse.
4. chunked forest rendering.
5. chunk frustum culling.
6. chunk lod with `near`. `mid`. `far`. `ultraFar`.
7. wind lod.
8. rebuild planning in a worker.
9. matrix packing in a worker.
10. trunk geometry packing in a worker.
11. worker side rebuild caching.
12. lazy chunk lod state building.
13. live performance stats and debug snapshot export.

## what each system does

### 1. instanced leaves

file paths.

`src/three/tree-mesh.ts`

`src/three/matrices.ts`

leaf cards are not created as one mesh per leaf.

we build one shared leaf geometry and one shared leaf material.

then we send many transform matrices to the gpu.

that saves cpu draw overhead.

the gpu still draws all leaves.

but the cpu does much less repeated scene traversal. state setup. and draw submission.

### 2. instanced trunks in giant forest

file path.

`src/three/forest-render.ts`

giant forest mode does not build one trunk mesh object per tree.

it builds one trunk geometry per variant and renders that geometry many times with `InstancedMesh`.

that keeps draw calls much lower than a naive tree per mesh approach.

### 3. giant forest variant reuse

file paths.

`src/engine/blueprint.ts`

`src/engine/rebuild-plan.ts`

the forest is not one exact tree cloned forever.

the engine builds a small set of species safe variants.

then many trees reuse those variants.

this keeps the forest from looking copied while still keeping batching practical.

### 4. chunked forest rendering

file paths.

`src/engine/chunks.ts`

`src/three/scene.ts`

the forest is split by world space cells.

one chunk is a small patch of forest.

not one tree.

not the whole forest.

this is the base for culling and lod.

without chunking, the forest is too monolithic.

### 5. chunk frustum culling

file paths.

`src/three/culling.ts`

`src/three/scene.ts`

each chunk has bounds.

every frame, the camera frustum is tested against those bounds.

if a chunk is outside the view, that chunk is hidden.

that means no draw work for that chunk.

and in our renderer, no wind compute work for that chunk either.

### 6. chunk lod

file paths.

`src/engine/lod.ts`

`src/three/lod.ts`

`src/three/scene.ts`

visible chunks still cost something.

lod makes far visible chunks cheaper.

the current levels are.

`near`

full detail.

`mid`

reduced leaves and cheaper trunk detail.

`far`

much cheaper structure while keeping the same leaf texture family.

`ultraFar`

the cheapest real tree path before impostors.

important detail.

single tree mode stays effectively full detail.

the real lod path is for giant forest chunks.

### 7. wind lod

file paths.

`src/three/wind.ts`

`src/three/scene.ts`

wind lod saves animation cost.

not visibility cost.

not geometry cost.

animation cost.

current behavior.

`near`

full wind.

`mid`

lighter wind.

`far`

static.

`ultraFar`

static.

that means the gpu stops running leaf wind compute for chunks that are too small on screen for detailed motion to matter much.

### 8. rebuild planning in a worker

file paths.

`src/engine/rebuild-plan.ts`

`src/engine/rebuild-worker.ts`

`src/engine/rebuild-worker-client.ts`

the first worker step moved pure rebuild planning off the main thread.

that includes forest layout. chunk planning. variant planning. and lod blueprint planning.

this makes rebuilds feel smoother because the ui thread does less heavy planning work.

### 9. matrix packing in a worker

file paths.

`src/three/matrices.ts`

`src/engine/rebuild-plan.ts`

`src/engine/rebuild-worker.ts`

the next worker step moved matrix heavy prep off the main thread too.

that includes tree instance matrices.

it also includes leaf instance matrix packing and expansion.

the worker sends those typed arrays back ready to upload.

the main thread no longer has to build the full matrix list itself before rendering.

### 10. trunk geometry packing in a worker

file paths.

`src/three/trunk-geometry-data.ts`

`src/engine/rebuild-plan.ts`

`src/engine/rebuild-worker.ts`

the worker now also builds packed bark geometry data.

that means the expensive trunk geometry generation step no longer happens fully on the main thread.

the worker builds the trunk geometry once. then sends typed array data for positions. normals. uvs. wind attributes. and indices back to the main thread.

the main thread now mostly reconstructs `BufferGeometry` from packed arrays instead of generating the bark mesh from raw segments itself.

### 11. worker side rebuild caching

file paths.

`src/engine/rebuild-plan.ts`

`src/engine/rebuild-worker.ts`

the worker now caches deterministic rebuild data.

that includes.

the scene rebuild plan itself.

the l system string.

tree blueprints.

lod variants.

packed tree matrices.

packed leaf matrices.

packed trunk geometry.

important detail.

this cache is only for rebuild inputs that produce the same structural result.

for example, changing wind settings should not force the worker to rebuild the whole tree plan.

the worker can clone the cached plan and return it again.

that is why the debug stats now show fields like.

`workerCacheHits`

`workerCacheMisses`

`workerPlanCacheHit`

`workerCloneMs`

when a rebuild uses the exact same structural key, the worker mainly pays clone cost instead of full rebuild cost.

### 12. lazy chunk lod state building

file path.

`src/three/scene.ts`

the renderer does not build every lod state for every chunk up front anymore.

it builds one initial lod state per chunk.

when the camera later needs a different lod for a chunk, that lod state is built once and then cached.

this reduces the initial main thread rebuild hit.

the tradeoff is simple.

first time camera visits a new lod for a chunk, there is one small extra build.

after that, it is reused.

### 13. live perf stats and debug snapshot

file paths.

`src/three/performance.ts`

`src/components/panel.tsx`

`src/window-debug.d.ts`

`src/three/scene-chunk-summary.ts`

`window.__treeDebug.getSnapshot()`

`window.__treeDebug.copySnapshotJson()`

the app exposes live perf stats in the panel and in the debug snapshot.

that lets us verify real behavior instead of guessing.

the chunk rows are live now.

that means they report the current visible state, not stale rebuild numbers.

each chunk row also includes.

`visible`

whether that chunk is currently being rendered.

`lodLevel`

which lod that chunk is currently using, or `null` if it is hidden.

the ui `Copy JSON` button and `window.__treeDebug.copySnapshotJson()` both export that same live snapshot.

examples.

`drawCalls`

how many draw submissions the current frame used.

`computeCalls`

how many gpu compute passes ran this frame.

`workerMs`

how much rebuild time was spent in the worker.

`workerBlueprintMs`. `workerLodMs`. `workerMatrixMs`. `workerGeometryMs`. `workerCloneMs`

which worker phase cost time during the rebuild.

`workerCacheHits`. `workerCacheMisses`. `workerPlanCacheHit`

whether the worker reused cached deterministic data.

`mainThreadBuildMs`

how much rebuild time was spent building render objects on the main thread.

`nearLodChunkCount`. `midLodChunkCount`. `farLodChunkCount`. `ultraFarChunkCount`

which chunk lods are active right now.

`windAnimatedChunkCount`. `windStaticChunkCount`

how many visible chunks still run animated wind.

## current rebuild flow

this is the current rebuild order.

1. react calls `rebuildScene`.
2. textures and worker rebuild planning start in parallel.
3. worker checks whether the rebuild key already exists in the worker cache.
4. if not cached, worker builds the forest layout. chunk plan. variant plan. lod plan. packed matrices. and packed trunk geometry.
5. worker clones the cached or freshly built plan for transfer back to the main thread.
6. main thread creates materials and three objects from that data.
7. giant forest builds only the initial chunk lod state for each chunk.
8. later camera movement can build missing lod states on demand.
9. per frame. culling runs first. then lod selection. then wind compute for animated chunks.

## what this file does not claim

these are not documented as finished because they are not finished.

1. impostors.
2. occlusion culling.
3. texture atlas streaming.
4. full async geometry streaming.
