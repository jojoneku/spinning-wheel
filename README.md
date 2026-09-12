# Spinning Wheel Workshop

A very lean spinning-wheel winner picker built with plain HTML, CSS, and vanilla
JavaScript — no frameworks, no build step, no dependencies. Spin logic lives in
a separate ES module of pure functions so it can be unit-tested.

## Run it

Open `index.html` in a browser. Because it uses an ES module (`wheel-logic.js`),
serve it over HTTP rather than `file://`:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How it works

- The wheel loads pre-populated with hardcoded dummy names, one per slot.
- Press **SPIN** — the wheel starts at a random velocity and slows down via a
  friction model (`velocity *= FRICTION` each frame).
- When velocity drops below `STOP_THRESHOLD`, the wheel stops and a fixed orange
  arrow at 12 o'clock marks the winning slot, which is announced.

## Files

| File | Purpose |
|------|---------|
| `wheel-logic.js` | Pure functions + constants: `getSlotAngle`, `getWinnerIndex`, `simulateDeceleration`, `COLORS`, `FRICTION`, `MIN/MAX_VELOCITY`, `STOP_THRESHOLD` |
| `index.html` | Canvas wheel, orange arrow, SPIN button, friction animation loop (imports the module) |
| `wheel-logic.test.js` | Unit tests (Node built-in test runner) |

## Tests

```bash
node --test
```

## Spec-driven

Built spec-first. See [`.kiro/specs/spinning-wheel/`](.kiro/specs/spinning-wheel/):

- `requirements.md` — requirements in EARS format
- `design.md` — architecture, friction physics, winner-detection formula
- `tasks.md` — implementation plan
