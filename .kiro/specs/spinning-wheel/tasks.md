# Implementation Plan — Spinning Wheel Winner Picker

- [ ] 1. Scaffold the page structure
  - Create `index.html` with a `<canvas>`, a fixed arrow element, a spin
    `<button>`, and a result area with `aria-live`.
  - Link `styles.css` and `app.js`.
  - _Requirements: 2.1, 4.1, 5.1, 5.2_

- [ ] 2. Style the layout and arrow
  - Create `styles.css`: center the wheel, style the button, style the winner
    text, and draw the fixed pointer triangle at the top of the wheel.
  - _Requirements: 4.1, 5.1_

- [ ] 3. Define data and draw the wheel
  - In `app.js`, add the `NAMES` array (6–12 dummy names) and `drawWheel(rotation)`
    that renders alternating colored wedges with rotated name labels and a hub.
  - Draw the initial static wheel on load.
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 4. Implement the spin animation
  - Add `spin()` using `requestAnimationFrame` with a random target angle,
    multiple turns, and cubic ease-out deceleration; disable the button while
    spinning.
  - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [ ] 5. Implement winner detection and display
  - Add `getWinnerIndex(rotation)` mapping the top arrow back to a slot; on stop,
    show the winning name and re-enable the button; clear result on new spin.
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 6. Verify
  - Unit-check `getWinnerIndex` against known angles; serve the page locally and
    confirm it loads with no console errors and spins to a winner.
  - _Requirements: 3.3, 4.2, 4.3_
