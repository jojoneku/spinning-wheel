# Requirements — Spinning Wheel Winner Picker

## Introduction

A very lean, single-page web application that displays a spinning wheel divided
into slots. Each slot is auto-populated with a dummy name. The user presses a
button to spin the wheel; when it stops, a fixed arrow points to one slot, and
that name is announced as the winner. Built with plain HTML, CSS, and vanilla
JavaScript — no frameworks, no build step, no external dependencies.

## Requirements

### Requirement 1 — Auto-populated wheel

**User Story:** As a user, I want the wheel to load with names already filled
in, so that I can spin immediately without any setup.

#### Acceptance Criteria
1. WHEN the page loads THEN the system SHALL render a wheel divided into N equal
   slots (N between 6 and 12).
2. WHEN the wheel is rendered THEN the system SHALL populate each slot with a
   distinct dummy name from a built-in list.
3. WHEN slots are drawn THEN the system SHALL give adjacent slots visually
   distinguishable colors.
4. WHEN a slot label is rendered THEN the system SHALL display the name legibly
   within its slot.

### Requirement 2 — Spin control

**User Story:** As a user, I want to spin the wheel by pressing a button, so
that a winner is chosen at random.

#### Acceptance Criteria
1. WHEN the page loads THEN the system SHALL display a clearly labeled spin
   button.
2. WHEN the user presses the spin button THEN the system SHALL start rotating
   the wheel.
3. WHEN a spin is in progress THEN the system SHALL disable the spin button to
   prevent overlapping spins.
4. WHEN the spin starts THEN the system SHALL apply a randomized final angle so
   the outcome is not predictable between spins.

### Requirement 3 — Realistic spin animation

**User Story:** As a user, I want the wheel to spin and gradually slow to a
stop, so that the result feels natural.

#### Acceptance Criteria
1. WHEN a spin begins THEN the system SHALL animate the rotation smoothly using
   requestAnimationFrame.
2. WHEN the wheel is spinning THEN the system SHALL apply an ease-out
   deceleration so it slows gradually before stopping.
3. WHEN the animation completes THEN the system SHALL leave the wheel at rest at
   a stable final angle.

### Requirement 4 — Winner selection via arrow

**User Story:** As a user, I want a fixed arrow to indicate the winning slot, so
that the result is unambiguous.

#### Acceptance Criteria
1. WHEN the wheel is displayed THEN the system SHALL render a fixed pointer/arrow
   at a fixed position on the wheel's edge.
2. WHEN the wheel stops THEN the system SHALL determine which slot lies under the
   arrow based on the final rotation angle.
3. WHEN the winning slot is determined THEN the system SHALL display the winning
   name in a result area.
4. WHEN a new spin is started THEN the system SHALL clear or replace the previous
   result.

### Requirement 5 — Lean, dependency-free implementation

**User Story:** As a developer, I want the app to be minimal and portable, so
that it runs by simply opening a file.

#### Acceptance Criteria
1. WHEN the project is built THEN the system SHALL use only HTML, CSS, and
   vanilla JavaScript.
2. WHEN the page is opened directly in a browser (file://) THEN the system SHALL
   function without a server or build step.
3. WHEN the code is written THEN the system SHALL NOT include any third-party
   frameworks or libraries.
