// wheel-logic.js — pure functions and constants for the spinning wheel.
// No DOM, no dependencies, so it can be unit-tested with Node's test runner.

// 3-color cycle: cycling three colors keeps adjacent slots visually distinct
// regardless of slot count (a 2-color scheme collides on odd counts).
export const COLORS = ["#FF9900", "#232F3E", "#37475A"];

// Per-frame velocity multiplier — gives a natural deceleration feel.
export const FRICTION = 0.98;

// Bounds for the randomized initial spin velocity (radians/frame).
export const MIN_VELOCITY = 0.25;
export const MAX_VELOCITY = 0.45;

// When angular velocity drops below this, the wheel is considered stopped.
export const STOP_THRESHOLD = 0.001;

// Angular width of a single slot.
export function getSlotAngle(numSlots) {
  return (2 * Math.PI) / numSlots;
}

// Index of the slot under the arrow. The arrow is at 12 o'clock, which is
// -PI/2 in canvas coordinates (x right, y down); adjust by +PI/2, normalize
// into [0, 2PI), then map the angle to a slot.
export function getWinnerIndex(rot, numSlots) {
  const adjusted = rot + Math.PI / 2;
  const normalizedAngle =
    ((adjusted % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const slotAngle = (2 * Math.PI) / numSlots;
  return Math.floor((2 * Math.PI - normalizedAngle) / slotAngle) % numSlots;
}

// Number of frames until the wheel stops, applying friction each frame.
// Pure and deterministic — easy to unit test.
export function simulateDeceleration(
  velocity,
  friction = FRICTION,
  stopThreshold = STOP_THRESHOLD
) {
  let frames = 0;
  let v = velocity;
  while (v >= stopThreshold) {
    v *= friction;
    frames++;
  }
  return frames;
}
