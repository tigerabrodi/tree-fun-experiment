# leaf texture prompts

these are prompt patterns for making transparent leaf textures for the tree library.

they are meant for image generation tools too. including openai image generation models.

keep them direct.

ask for one isolated leaf or one compact leaf cluster.

ask for a transparent background.

ask for centered composition.

ask for even lighting.

ask for no shadows outside the leaf itself.

that makes the texture easier to cut into cards later.

## single leaf prompt

```text
create one isolated oak leaf for a game texture. centered. top down view. realistic veins. clean edges. natural color variation. transparent background. no extra leaves. no branch. no drop shadow. no border. no text.
```

## broadleaf cluster prompt

```text
create one compact cluster of maple leaves for a game texture. several overlapping leaves. centered composition. realistic shape and veins. readable silhouette. transparent background. no branch longer than needed. no ground shadow. no frame. no text.
```

## blossom cluster prompt

```text
create one compact sakura blossom cluster for a game texture. soft pink petals. small twig connection near the center only. airy but readable silhouette. transparent background. no long branch. no shadow outside the blossom cluster. no text.
```

## pine tuft prompt

```text
create one pine needle tuft for a game texture. radial needle bundle. compact shape. realistic needle density. centered. transparent background. no long branch. no cast shadow. no border. no text.
```

## what usually works best

1. generate the leaf or cluster first.
2. export it with transparency.
3. compress it to `ktx2` after you are happy with the cutout.
4. use `single` for cheaper cards and `cluster` for fuller canopy cards.

## what to avoid

1. full branches with lots of empty space.
2. dramatic lighting that makes alpha edges hard to read.
3. background colors you need to key out later.
4. tiny thin silhouettes that disappear at distance.
