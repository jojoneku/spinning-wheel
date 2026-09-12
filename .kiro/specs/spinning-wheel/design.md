# Design — Spinning Wheel Winner Picker

## Overview

A single static HTML page draws a wheel on an HTML5 `<canvas>`, spins it via a
`requestAnimationFrame` animation loop with ease-out deceleration, and reports
the slot under a fixed arrow when motion stops. Three files, no dependencies:

```
index.html   structure: canvas, arrow, spin button, winner display
styles.css   minimal layout + fixed arrow
app.js       data, drawing, spin physics, winner detection
```

## Architecture

```
[Spin button] --click--> spin()
                              |
                              v
        pick random target rotation (many turns + random offset)
                              |
                              v
   requestAnimationFrame loop: interpolate angle with ease-out
                              |
                    draw wheel at current angle
                              |
                        (loop until done)
                              |
                              v
              getWinnerIndex(finalAngle) --> show name
```

## Data

- `NAMES`: a built-in array of dummy names (e.g. Alice, Bob, Carla, ...).
- `SLOT_COUNT`: number of slots actually used (`NAMES.length`, kept 6–12).
- Each slot spans `2π / SLOT_COUNT` radians.

## Wheel rendering (`drawWheel(rotation)`)

- Canvas is square (e.g. 400×400); center `(cx, cy)`, radius `r`.
- For each slot `i`:
  - `start = rotation + i * slice`, `end = start + slice`.
  - Draw a filled wedge (`moveTo(center)` → `arc(...)` → `fill`), alternating two
    colors (with an accent for odd counts to avoid same-color neighbors).
  - Draw the name rotated to the slice's mid-angle, offset outward from center.
- A small hub circle is drawn at the center for a clean look.

## Arrow / pointer

- Fixed, non-rotating element pointing **inward at the top** (12 o'clock),
  drawn as a CSS triangle positioned over the canvas edge. The angle at the top
  corresponds to `-π/2` (i.e. `1.5π`) in canvas coordinates (x→right, y→down).

## Spin physics (`spin()`)

- Guard: ignore if already spinning; disable the button while spinning.
- Choose `extraTurns` (e.g. 5–8 full rotations) plus a random `finalOffset` in
  `[0, 2π)`. Target: `targetRotation = currentRotation + extraTurns*2π + offset`.
- Duration ~4000 ms. On each frame compute progress `t = elapsed / duration`,
  clamp to 1, apply ease-out: `eased = 1 - (1 - t)^3` (cubic ease-out).
- `angle = startRotation + (targetRotation - startRotation) * eased`.
- Redraw each frame. When `t >= 1`, stop, store final angle, compute winner,
  re-enable button.

## Winner detection (`getWinnerIndex(rotation)`)

The arrow sits at the top = canvas angle `topAngle = 1.5π` (pointing where
`3π/2` is, i.e. straight up given y-down coordinates). To find the slot beneath
it:

1. Normalize: `norm = ((topAngle - rotation) mod 2π + 2π) mod 2π`.
2. `index = floor(norm / slice) mod SLOT_COUNT`.

This maps the fixed top pointer back through the wheel's current rotation to the
slot occupying that position. The formula is verified against known angles in
the verification task.

## UI states

- **Idle**: wheel at rest, button enabled, result shows last winner (or a prompt).
- **Spinning**: button disabled/greyed, result cleared to "Spinning…".
- **Result**: winner name shown prominently; button re-enabled.

## Accessibility / niceties (lightweight)

- Button is a real `<button>`.
- Result area uses `aria-live="polite"` so the winner is announced.
- Colors chosen with enough contrast for legible white/dark text.

## Non-goals

- Editing names in the UI, weighting, sound, persistence, or multiple wheels.
  (Names are auto-populated per requirements; kept intentionally minimal.)
