// Unit tests for wheel-logic.js using Node's built-in test runner.
// Run with:  node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSlotAngle,
  getWinnerIndex,
  simulateDeceleration,
  FRICTION,
  STOP_THRESHOLD,
} from './wheel-logic.js';

test('getSlotAngle divides the circle evenly', () => {
  assert.equal(getSlotAngle(4), Math.PI / 2);
  assert.equal(getSlotAngle(8), Math.PI / 4);
  assert.equal(getSlotAngle(1), 2 * Math.PI);
});

test('getWinnerIndex returns a valid slot index in range', () => {
  const numSlots = 8;
  for (let i = 0; i < 50; i++) {
    const rot = Math.random() * 20 * Math.PI - 10 * Math.PI; // pos & neg
    const idx = getWinnerIndex(rot, numSlots);
    assert.ok(Number.isInteger(idx), `index is integer: ${idx}`);
    assert.ok(idx >= 0 && idx < numSlots, `index in range: ${idx}`);
  }
});

test('getWinnerIndex is periodic over full turns', () => {
  const numSlots = 8;
  const a = getWinnerIndex(1.234, numSlots);
  const b = getWinnerIndex(1.234 + 2 * Math.PI, numSlots);
  const c = getWinnerIndex(1.234 - 4 * Math.PI, numSlots);
  assert.equal(a, b);
  assert.equal(a, c);
});

test('getWinnerIndex reaches every slot across a full rotation', () => {
  const numSlots = 8;
  const slot = getSlotAngle(numSlots);
  const seen = new Set();
  for (let r = 0; r < 2 * Math.PI; r += slot / 4) {
    seen.add(getWinnerIndex(r, numSlots));
  }
  assert.equal(seen.size, numSlots);
});

test('simulateDeceleration returns a positive frame count that grows with speed', () => {
  const slow = simulateDeceleration(0.1, FRICTION, STOP_THRESHOLD);
  const fast = simulateDeceleration(0.5, FRICTION, STOP_THRESHOLD);
  assert.ok(slow > 0);
  assert.ok(fast > slow, `faster spin takes more frames: ${fast} > ${slow}`);
});

test('simulateDeceleration eventually stops (velocity < threshold)', () => {
  const frames = simulateDeceleration(0.4, FRICTION, STOP_THRESHOLD);
  // Reconstruct final velocity after `frames` steps; it must be below threshold.
  const finalV = 0.4 * Math.pow(FRICTION, frames);
  assert.ok(finalV < STOP_THRESHOLD);
});
