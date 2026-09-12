# Requirements — Spinning Wheel Winner Picker

## Introduction

A very lean, single-page web application that displays a spinning wheel divided
into slots, each pre-populated with a hardcoded dummy name. Pressing a button
spins the wheel; it decelerates via a friction model and, when it stops, a fixed
arrow at 12 o'clock indicates the winning slot. Built with plain HTML, CSS, and
vanilla JavaScript — no frameworks, no build step. Spin logic lives in a
separate ES module of pure functions so it can be unit-tested.

## Requirements

### Requirement 1 — Auto-populated wheel

**User Story:** As a user, I want the wheel to load with names already filled
in, so that I can spin immediately without any setup.

#### Acceptance Criteria
1. WHEN the wheel is drawn THEN the system SHALL divide it into N equal slots
   using `getSlotAngle(N)`.
2. WHEN the wheel is rendered THEN the system SHALL populate each slot with a
   distinct hardcoded dummy name.
3. WHEN slots are colored THEN the system SHALL cycle a 3-color palette so that
   adjacent slots are always visually distinct regardless of slot count.
4. WHEN a slot label is rendered THEN the system SHALL display the name legibly
   within its slot.

### Requirement 2 — Spin control

**User Story:** As a user, I want to spin the wheel by pressing a button, so
that a winner is chosen at random.

#### Acceptance Criteria
1. WHEN the page loads THEN the system SHALL display a labeled SPIN button.
2. WHEN the user presses SPIN THEN the system SHALL start the wheel with a
   randomized initial angular velocity.
3. WHEN a spin is in progress THEN the system SHALL prevent overlapping spins.

### Requirement 3 — Friction-based deceleration

**User Story:** As a user, I want the wheel to slow down naturally, so that the
result feels realistic.

#### Acceptance Criteria
1. WHEN the wheel spins THEN the system SHALL reduce angular velocity each frame
   by a constant FRICTION factor.
2. WHEN the velocity falls below STOP_THRESHOLD THEN the system SHALL stop the
   wheel.
3. WHEN animating THEN the system SHALL use requestAnimationFrame.

### Requirement 4 — Winner selection via arrow

**User Story:** As a user, I want a fixed arrow to indicate the winning slot.

#### Acceptance Criteria
1. WHEN the wheel is displayed THEN the system SHALL render a fixed arrow at
   12 o'clock.
2. WHEN the wheel stops THEN the system SHALL determine the slot under the arrow
   using `getWinnerIndex(rotation, N)`, accounting for the arrow at `-π/2`.
3. WHEN the winning slot is determined THEN the system SHALL display the winning
   name.
4. WHEN a new spin starts THEN the system SHALL clear or replace the previous
   result.

### Requirement 5 — Lean, testable, dependency-free implementation

**User Story:** As a developer, I want the logic isolated and testable.

#### Acceptance Criteria
1. WHEN the spin logic is written THEN the system SHALL place pure functions
   (`getSlotAngle`, `getWinnerIndex`, `simulateDeceleration`) and constants
   (`COLORS`, `FRICTION`, `MIN_VELOCITY`, `MAX_VELOCITY`, `STOP_THRESHOLD`) in a
   separate ES module `wheel-logic.js`.
2. WHEN the page is opened in a browser THEN the system SHALL function without a
   build step, using only HTML, CSS, and vanilla JavaScript.
3. WHEN dependencies are considered THEN the system SHALL NOT use any
   third-party frameworks or libraries.
