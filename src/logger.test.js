// Unit tests for src/logger.js structured logger.  Run with:  node --test
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLogger } = require("./logger");

// Capture console.log output while running `fn`, then restore console.log.
function capture(fn) {
  const original = console.log;
  const lines = [];
  console.log = (line) => lines.push(line);
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines;
}

test("info() emits JSON with INFO level and bound + extra fields", () => {
  const lines = capture(() => {
    const logger = createLogger({ requestId: "r1", sessionId: "s1" });
    logger.info("act", "msg", { extra: 1 });
  });
  assert.equal(lines.length, 1);
  const obj = JSON.parse(lines[0]);
  assert.equal(obj.level, "INFO");
  assert.equal(obj.requestId, "r1");
  assert.equal(obj.sessionId, "s1");
  assert.equal(obj.action, "act");
  assert.equal(obj.message, "msg");
  assert.equal(obj.extra, 1);
  // timestamp must be a valid ISO string that round-trips.
  assert.equal(typeof obj.timestamp, "string");
  assert.equal(new Date(obj.timestamp).toISOString(), obj.timestamp);
});

test("warn() emits WARN level", () => {
  const lines = capture(() => {
    const logger = createLogger({ requestId: "r2", sessionId: "s2" });
    logger.warn("warned", "careful");
  });
  const obj = JSON.parse(lines[0]);
  assert.equal(obj.level, "WARN");
  assert.equal(obj.action, "warned");
  assert.equal(obj.message, "careful");
});

test("error() emits ERROR level", () => {
  const lines = capture(() => {
    const logger = createLogger({ requestId: "r3", sessionId: "s3" });
    logger.error("failed", "boom", { name: "GoneException" });
  });
  const obj = JSON.parse(lines[0]);
  assert.equal(obj.level, "ERROR");
  assert.equal(obj.action, "failed");
  assert.equal(obj.message, "boom");
  assert.equal(obj.name, "GoneException");
});

test("createLogger works with no arguments", () => {
  const lines = capture(() => {
    createLogger().info("noctx", "ok");
  });
  const obj = JSON.parse(lines[0]);
  assert.equal(obj.level, "INFO");
  assert.equal(obj.requestId, undefined);
  assert.equal(obj.sessionId, undefined);
});
