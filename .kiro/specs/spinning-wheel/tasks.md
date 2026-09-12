# Implementation Plan — Spinning Wheel Winner Picker

- [ ] 1. Create wheel-logic.js with constants and pure functions
  - [ ] 1.1 Export getSlotAngle, getWinnerIndex, simulateDeceleration
  - [ ] 1.2 Export COLORS, FRICTION, MIN_VELOCITY, MAX_VELOCITY, STOP_THRESHOLD
  - _Requirements: 1.1, 3.1, 3.2, 4.2, 5.1, 5.3_

- [ ] 2. Create index.html with canvas wheel and spin button
  - [ ] 2.1 Render wheel with hardcoded names
  - [ ] 2.2 Wire spin button to animation loop
  - [ ] 2.3 Display winner after deceleration
  - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.3, 4.1, 4.3, 4.4_

- [ ] 3. Checkpoint — verify wheel works locally
  - Confirm the page loads with no console errors, the wheel spins, decelerates
    via friction, and reports the slot under the 12 o'clock arrow. Verify with
    Chrome DevTools MCP or manually in a browser.
  - _Requirements: 3.3, 4.2, 4.3_

- [ ] 4. (Optional) Unit tests for wheel-logic.js
  - Use Node's built-in test runner to test getSlotAngle, getWinnerIndex, and
    simulateDeceleration.
  - _Requirements: 5.1_
