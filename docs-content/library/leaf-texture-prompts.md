# leaf texture prompts

these prompts are for making transparent leaf textures for the library.

they are meant for image generation tools too.

including openai image generation models like `gpt-image-1.5`.

## one strong base template

```text
create one isolated [leaf or cluster type] for a game texture. centered. top down view. realistic shape and veins. clean readable silhouette. transparent background. no extra leaves outside the main subject. no long branch. no drop shadow. no border. no text.
```

use `single leaf` when you want a lone card.

use `compact leaf cluster` when you want a broader canopy card.

use `pine needle tuft` when you want a radial soft bundle.

## single leaf

```text
create one isolated oak leaf for a game texture. centered. top down view. realistic veins. clean edges. natural color variation. transparent background. no extra leaves. no branch. no drop shadow. no border. no text.
```

## broadleaf cluster

```text
create one compact cluster of maple leaves for a game texture. several overlapping leaves. centered composition. realistic shape and veins. readable silhouette. transparent background. no branch longer than needed. no ground shadow. no frame. no text.
```

## blossom cluster

```text
create one compact sakura blossom cluster for a game texture. soft pink petals. small twig connection near the center only. airy but readable silhouette. transparent background. no long branch. no shadow outside the blossom cluster. no text.
```

## pine tuft

```text
create one pine needle tuft for a game texture. radial needle bundle. compact shape. realistic needle density. centered. transparent background. no long branch. no cast shadow. no border. no text.
```

## simple rules

1. keep the asset centered.
2. keep the background transparent.
3. avoid long branches and too much empty space.
4. avoid dramatic lighting that makes alpha edges messy.
5. make the silhouette readable at distance.
6. ask for one subject only. not a sheet of many loose leaves.
7. ask for top down or flat presentation, so the texture reads well on a card.
8. if the model keeps adding a branch, say `twig connection near the center only`.

## good workflow

1. generate a few versions.
2. pick the one with the cleanest silhouette.
3. trim the alpha if needed.
4. compress to `ktx2` later if you want the best shipping path.
