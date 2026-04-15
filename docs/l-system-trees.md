# L-System Trees

## What is an L-system

An L-system is a string rewriting machine. You start with a string. You have rules that replace characters. You repeat.

### Step 1: define rules

```
Axiom: F
Rule:  F -> F[+F]F[-F]F
```

### Step 2: iterate

- Iteration 0: `F`
- Iteration 1: `F[+F]F[-F]F`
- Iteration 2: each `F` gets replaced again. The string grows fast.

### Step 3: interpret the string as drawing commands

A virtual "turtle" walks through the string. Each character is a command.

| Char | Meaning |
|------|---------|
| `F`  | Move forward, draw a branch segment |
| `+`  | Turn right (yaw) |
| `-`  | Turn left (yaw) |
| `&`  | Pitch down |
| `^`  | Pitch up |
| `/`  | Roll clockwise |
| `\`  | Roll counterclockwise |
| `[`  | Save current position and direction (push stack) |
| `]`  | Restore saved position and direction (pop stack) |
| `!`  | Shrink the branch radius |

## How branching works

`[` and `]` create branches. `[` says "remember where I am." The turtle walks off drawing a branch. `]` says "teleport back to where I was." The turtle continues in the original direction.

This is a stack. Nested brackets create nested branches. `F[F[F]]` draws a trunk, branches off, branches off again, then pops back twice.

## Why it works for trees

Real trees grow by repeating the same pattern at different scales. A branch grows sub branches. Sub branches grow sub sub branches.

L-systems do exactly this. The same replacement rule applied recursively at every scale. Add randomness to the angles and you get organic results.

## Species differences

Different rules produce different tree shapes.

**Oak:** `[&FL!A]////[&FL!A]////[&FL!A]` creates three sub branches at each growth point, rotated 120 degrees apart. Wide, spreading crown.

**Pine:** `F[&&+FL][&&-FL][&&---FL][&&+++FL]A` creates lateral branches from a strong central trunk. Conical shape.

**Birch:** similar to oak but with tighter angles and thinner radius decay. Produces airy, delicate branching.

## From string to geometry

The turtle interpreter outputs two things:

1. **Segments.** Each `F` command produces a segment with start position, end position, start radius, end radius. These get skinned into cylinder meshes for the trunk and branches.

2. **Leaf points.** Each `]` (branch end) records a position and direction. Cross billboard leaf clusters get placed at these points.
