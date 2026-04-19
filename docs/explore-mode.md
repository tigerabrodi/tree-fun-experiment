# explore mode

this repo now has a separate first person playground mode for testing trees in a more game like space.

it is not part of the published library api yet.
it is a playground view inside this repo.

## what it does

- first person mouse look with pointer lock
- `wasd` move
- `shift` sprint
- `space` jump
- mostly flat terrain with gentle hills
- deterministic terrain tiles around the player so it feels infinite
- randomized oak placement so the world does not look copy pasted

## references used

- first person movement and crosshair feel were based on ideas from `/Users/tigerabrodi/Desktop/grass-webgpu`
- terrain shape direction and ground textures were borrowed from `/Users/tigerabrodi/Desktop/cod-soviet-terrain`

## current limits

- only oak is used in explore mode for now
- no grass yet
- no impostors or occlusion work in this mode
- terrain is intentionally simple and flatish because this is mainly for tree feel testing

## why it exists

the tree lab is good for tuning one tree at a time.

the explore mode is better for answering harder questions.

- do the trees feel too small from human eye level
- does the trunk read well when walking near it
- does random forest spacing feel natural
- do the trees still look good when you sprint past them

## likely future work

- swap oak only for a mixed forest mode
- add a better sky and atmosphere pass
- add simple terrain texture blending
- maybe add a small path or clearing system
