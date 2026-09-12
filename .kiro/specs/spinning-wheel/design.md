# Design — Spinning Wheel Winner Picker

## Overview

A single static HTML page draws a wheel on an HTML5 `<canvas>` and spins it with
a friction-based physics model. The spin logic is extracted into a separate,
dependency-free ES module (`wheel-logic.js`) that exports **pure functions** and
tunable constants, so it can be unit-tested in isolation with Node's built-in
test runner.

```
wheel-logic.js   pure functions + constants (getSlotAngle, getWinnerIndex,
                 simulateDeceleration, COLORS, FRICTION, ...)
index.html       canvas wheel, orange arrow at 12 o'clock, SPIN button,
                 animation loop, winner display (imports wheel-logic.js)
wheel-logic.test.js  optional Node unit tests
```

## wheel-logic.js — exported API

### Constants
- `COLORS = ["#FF9900", "#232F3E", "#37475A"]` — a **3-color cycle**. Cycling
  three colors guarantees adjacent slots differ regardless of slot count (a
  2-color scheme collides when the count is odd).
- `FRICTION = 0.98` — per-frame velocity multiplier; gives a natural slow-down.
- `MIN_VELOCITY`, `MAX_VELOCITY` — bounds for the randomized initial spin speed.
- `STOP_THRESHOLD = 0.001` — when angular velocity drops below this, the wheel
  is considered stopped.

### Functions
- `getSlotAngle(numSlots)` → `2π / numSlots`. The angular width of one slot.
- `getWinnerIndex(rot, numSlots)` → index of the slot under the arrow.
  - The arrow sits at **12 o'clock**, which is `-π/2` in canvas coordinates
    (x→right, y→down). The function adjusts by `+π/2`, normalizes into
    `[0, 2π)`, and maps the angle to a slot:
    ```
    adjusted = rot + π/2
    normalized = ((adjusted mod 2π) + 2π) mod 2π
    index = floor((2π - normalized) / slotAngle) mod numSlots
    ```
- `simulateDeceleration(velocity, friction, stopThreshold)` → returns the number
  of frames until the wheel stops (velocity < stopThreshold), by repeatedly
  applying `velocity *= friction`. Pure and deterministic — easy to unit test.

## Animation model (in index.html)

- On SPIN: pick a random initial `velocity` in `[MIN_VELOCITY, MAX_VELOCITY]`.
- Each `requestAnimationFrame`: `rotation += velocity; velocity *= FRICTION;`
  redraw. When `velocity < STOP_THRESHOLD`, stop and compute the winner with
  `getWinnerIndex(rotation, numSlots)`.
- Because deceleration is driven purely by friction on a random starting
  velocity, both the duration and final resting slot vary each spin.

## Rendering (in index.html)

- Square canvas; for each slot `i` draw a wedge filled with
  `COLORS[i % COLORS.length]`, plus the name rotated to the slice mid-angle.
- A fixed **orange arrow** is drawn/positioned at the top (12 o'clock), not
  rotating with the wheel.

## Winner detection rationale

The arrow is fixed at the top while the wheel rotates underneath. `getWinnerIndex`
inverts the current rotation to find which slot currently occupies the 12 o'clock
position, accounting for the arrow's `-π/2` canvas angle via the `+π/2`
adjustment. This is covered by unit tests against known angles.

## Non-goals

Editing names in the UI, weighting, sound, persistence. Names are hardcoded per
requirements; the app is intentionally minimal.
