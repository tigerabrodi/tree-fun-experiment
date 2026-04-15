# Why The Trees Looked Wrong

We wanted procedural trees. We kept getting trunks with leaf puffs. Pine looked acceptable. Oak. Birch. Maple. And sakura did not. They read like poles with crowns.

The important lesson is simple. The problem was not bark. The problem was not leaf textures. The problem was grammar.

# The Real Problem

Our broadleaf presets were barely creating side branches in world space. We measured the generated segments instead of guessing.

```ts
oak    { segments: 568, maxRadius: 0.29, branchishSegments: 0 }
pine   { segments: 54,  maxRadius: 0.76, branchishSegments: 40 }
birch  { segments: 406, maxRadius: 0.48, branchishSegments: 0 }
maple  { segments: 460, maxRadius: 0.48, branchishSegments: 0 }
sakura { segments: 414, maxRadius: 0.09, branchishSegments: 0 }
```

This told us the truth fast. The broadleaf trees were almost entirely vertical. They had leaves. They had bark. They did not have a real branch scaffold.

Pine looked better because it already had actual lateral structure. The other species were mostly pretending.

# The Broken Idea

The old oak preset looked tree like on paper.

```ts
export const OAK = {
  axiom: 'FA',
  rules: [
    { predecessor: 'A', successor: '!F[&FL!A]////[&FL!A]////[&FL!A]' },
    { predecessor: 'F', successor: 'S//F' },
    { predecessor: 'S', successor: 'F' },
    { predecessor: 'L', successor: '[^^-F+F+F-|-F+F+F]' },
  ],
}
```

It feels expressive. It is not structurally honest. The same symbols were trying to be trunk growth. branch growth. recursive continuation. and leaf volume at the same time. The result was vertical motion with decorative foliage.

The renderer could not reveal branches that were never really generated.

# The Fix

We split responsibilities. We introduced a real trunk symbol `T`. We introduced a real branch symbol `B`. Then we made trunk growth continue while branch growth peeled off to the sides.

```ts
export const OAK = {
  axiom: 'T',
  rules: [
    { predecessor: 'T', successor: 'FF[+!B][-!B][//+!B][//-!B]T' },
    { predecessor: 'B', successor: 'F[+!B][-!B]F' },
  ],
}
```

This did three important things.

First. `T` keeps the main scaffold alive.

Second. `B` creates side limbs that can recurse without collapsing back into the trunk.

Third. The extra `FF` at the start gives each branch system some travel distance before more splitting. That makes limbs readable instead of glued into one top puff.

We applied the same idea to birch. maple. and sakura with different angles and decay values.

# The Supporting Fixes

We also kept real taper per segment instead of faking radius only at major rule points.

```ts
const nextRadius = state.radius * config.segmentTaper
segments.push({
  startRadius: state.radius,
  endRadius: nextRadius,
})
state.radius = nextRadius
```

That made branches feel more branch like once the scaffold existed.

We also added a test that checks broadleaf trees actually spread outward.

```ts
expect(maxRadius).toBeGreaterThan(1.5)
expect(branchCount).toBeGreaterThan(30)
```

That matters because the bug was visual but the cause was structural. We wanted a test that protects structure.

# The Result

After the rewrite the numbers changed hard.

```ts
oak    { segments: 218, maxRadius: 2.73, branchCount: 149 }
pine   { segments: 54,  maxRadius: 0.76, branchCount: 27 }
birch  { segments: 114, maxRadius: 1.90, branchCount: 48 }
maple  { segments: 218, maxRadius: 2.72, branchCount: 152 }
sakura { segments: 218, maxRadius: 2.66, branchCount: 171 }
```

That is why the trees finally started reading like trees with branches instead of sticks with toppings.

Oak got scaffold limbs.

Maple got a real canopy.

Sakura got visible structure under the blossom mass.

Birch stayed lighter and more delicate.

Pine stayed good because it was already the closest to a real branching grammar.

# What I Want To Remember

If a procedural tree looks fake then do not start by tuning leaf textures or bark maps.

Measure branch spread first.

If horizontal spread is near zero then the grammar is lying to you.

Fix the scaffold first.

Then style it.
