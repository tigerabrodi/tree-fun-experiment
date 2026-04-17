# webgpu tree library plan

## goal

beautiful trees by default.

performance by default.

webgpu first.

the user should not need to become a rendering engineer just to get good trees and forests.

## current base

1. `src/engine` now has a cleaner boundary.
2. `src/engine/blueprint.ts` builds tree blueprints and forest variant blueprints.
3. `src/three` consumes those blueprints and turns them into meshes. materials. wind buffers. and scene objects.
4. `src/components` stays app only.

this is the right base for a future library.

the important idea is simple.

the engine should describe trees.

the renderer should draw trees.

the app should only drive controls and viewing.

## what we already have

1. l system generation.
2. tree blueprints with segments and leaves.
3. species presets.
4. giant forest variant planning.
5. instanced leaves.
6. instanced trunks in giant forest.
7. gpu leaf wind through webgpu compute.
8. compressed bark textures.

## what we do not have yet

1. perf stats.
2. chunked forest rendering.
3. real forest culling.
4. lod.
5. worker based generation and mesh build.
6. distance based wind quality.
7. texture atlas strategy for many species and seasons.
8. impostors.
9. occlusion culling.

## important current weakness

leaf culling is off right now.

leaf cards are also double sided alpha tested geometry.

that means leaf overdraw is still a real cost.

## build order

1. add perf stats first.
draw calls. trunk instance count. leaf instance count. forest variant count now. chunk count later.

2. chunk the forest.
this is the first big rendering step. it unlocks better culling and later lod.

3. add chunk frustum culling.
once the forest is chunked. we can stop drawing chunks the camera cannot see.

4. add lod.
near trees keep full detail.
mid trees get cheaper trunks and fewer leaves.
far trees get much cheaper versions.

5. reduce leaf overdraw.
fewer far leaves.
thinner far canopies.
maybe simpler far broadleaf cards.

6. move heavy build work off the main thread.
generation and mesh build can go into workers later.

7. add wind lod.
near chunks keep the full nice wind.
mid chunks get simpler sway.
far chunks get almost none.

8. add texture atlases and streaming.
this matters when species count and season count get large.

9. add impostors last.
this should come after chunking and lod.

10. only then consider occlusion culling if still needed.

## future library shape

1. generation layer.
species. l systems. blueprint building. forest layout.

2. render layer.
instancing. textures. materials. wind. culling. lod.

3. app layer.
viewer. panel. debug tools.

## simple api shape later

1. `buildTreeBlueprint`.
2. `buildForestVariantBlueprints`.
3. `createForestRenderer`.
4. `updateWind`.
5. `dispose`.

that is the shape we want.

composable.

typed.

easy to expose.
