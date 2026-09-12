# Spinning Wheel Workshop

A very lean spinning-wheel winner picker built with plain HTML, CSS, and vanilla
JavaScript — no frameworks, no build step, no dependencies.

## Run it

Just open `index.html` in any browser. That's it.

## How it works

- The wheel loads pre-populated with dummy names, one per slot.
- Press **Spin** — the wheel makes several turns and decelerates smoothly.
- When it stops, a fixed arrow at the top points to the winning slot, and that
  name is announced.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure: canvas wheel, arrow, spin button, result |
| `styles.css` | Minimal layout and the fixed pointer |
| `app.js` | Names, wheel drawing, spin animation, winner detection |

## Spec-driven

This project was built spec-first. See [`.kiro/specs/spinning-wheel/`](.kiro/specs/spinning-wheel/):

- `requirements.md` — requirements in EARS format
- `design.md` — architecture, spin physics, winner-detection formula
- `tasks.md` — implementation plan
